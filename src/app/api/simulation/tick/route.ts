import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { simulateBatchPriceTick, checkLimitOrders } from '@/lib/simulation'
import { getQuote, hasRealData, isMarketOpen } from '@/lib/finnhub'
import { getSessionUserFromRequest } from '@/lib/auth'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'
import { checkAndAwardBadges } from '@/lib/badges'

// How many stocks to refresh from Finnhub per tick (respects 60 req/min limit)
const BATCH_SIZE = 5

// Track round-robin position across ticks (module-level, resets on cold start)
let tickIndex = 0

export async function GET(req: NextRequest) {
  const session = await getSessionUserFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ marketOpen: isMarketOpen() })
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = checkRateLimit(`tick:${session.userId}:${ip}`, RATE_LIMITS.TICK.max, RATE_LIMITS.TICK.windowMs)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const stocks = await prisma.stock.findMany({
      select: {
        symbol: true, currentPrice: true, previousClose: true,
        sector: true, priceUpdatedAt: true,
      },
      orderBy: { priceUpdatedAt: 'asc' }, // update stalest first
    })

    const newPrices: Record<string, number> = {}

    if (hasRealData() && isMarketOpen()) {
      // Fetch real prices for a rotating batch
      const batch = stocks.slice(tickIndex % Math.max(stocks.length, 1), tickIndex % Math.max(stocks.length, 1) + BATCH_SIZE)
      tickIndex = (tickIndex + BATCH_SIZE) % Math.max(stocks.length, 1)

      await Promise.all(
        batch.map(async stock => {
          const quote = await getQuote(stock.symbol)
          if (quote && quote.c > 0) {
            newPrices[stock.symbol] = quote.c
          }
        })
      )

      // Stocks not refreshed this tick keep current price
      for (const s of stocks) {
        if (!(s.symbol in newPrices)) newPrices[s.symbol] = s.currentPrice
      }
    } else {
      // Simulate prices when market closed or no API key
      const simPrices = simulateBatchPriceTick(
        stocks.map(s => ({ symbol: s.symbol, currentPrice: s.currentPrice, previousClose: s.previousClose, sector: s.sector }))
      )
      Object.assign(newPrices, simPrices)
    }

    // Persist updated prices + record history
    await prisma.$transaction(async tx => {
      for (const stock of stocks) {
        const newPrice = newPrices[stock.symbol]
        if (!newPrice || newPrice === stock.currentPrice) continue

        await tx.stock.update({
          where: { symbol: stock.symbol },
          data: {
            currentPrice: newPrice,
            dayHigh: Math.max(stock.currentPrice, newPrice),
            dayLow: stock.currentPrice > 0 ? Math.min(stock.currentPrice, newPrice) : newPrice,
            priceUpdatedAt: new Date(),
          },
        })

        await tx.priceHistory.create({
          data: {
            stockSymbol: stock.symbol,
            price: newPrice,
            volume: Math.floor(Math.random() * 30000 + 5000),
          },
        })
      }

      // Check + fill pending limit orders
      const pendingLimits = await tx.order.findMany({
        where: { status: 'PENDING', type: 'LIMIT' },
        select: { id: true, side: true, limitPrice: true, stockSymbol: true, userId: true, shares: true },
      })

      const toFill = checkLimitOrders(
        pendingLimits.map(o => ({ id: o.id, side: o.side, limitPrice: o.limitPrice!, stockSymbol: o.stockSymbol })),
        newPrices
      )

      for (const orderId of toFill) {
        const order = pendingLimits.find(o => o.id === orderId)!
        const fillPrice = newPrices[order.stockSymbol]

        await tx.order.update({
          where: { id: orderId },
          data: { status: 'FILLED', fillPrice, filledAt: new Date() },
        })

        const totalCost = fillPrice * order.shares
        if (order.side === 'BUY') {
          await tx.user.update({ where: { id: order.userId }, data: { cashBalance: { decrement: totalCost } } })
          const existing = await tx.holding.findUnique({
            where: { userId_stockSymbol: { userId: order.userId, stockSymbol: order.stockSymbol } },
          })
          if (existing) {
            const ns = existing.shares + order.shares
            const nc = (existing.avgCost * existing.shares + totalCost) / ns
            await tx.holding.update({ where: { id: existing.id }, data: { shares: ns, avgCost: nc } })
          } else {
            await tx.holding.create({
              data: { userId: order.userId, stockSymbol: order.stockSymbol, shares: order.shares, avgCost: fillPrice },
            })
          }
        } else {
          await tx.user.update({ where: { id: order.userId }, data: { cashBalance: { increment: totalCost } } })
          const existing = await tx.holding.findUnique({
            where: { userId_stockSymbol: { userId: order.userId, stockSymbol: order.stockSymbol } },
          })
          if (existing) {
            const ns = existing.shares - order.shares
            if (ns <= 0.0001) await tx.holding.delete({ where: { id: existing.id } })
            else await tx.holding.update({ where: { id: existing.id }, data: { shares: ns } })
          }
        }
      }

      // Fill PENDING MARKET orders and tournament orders (only during real market hours)
      if (isMarketOpen()) {
        // Regular PENDING MARKET orders — cash was reserved at placement for BUY
        const pendingMarketOrders = await tx.order.findMany({
          where: { status: 'PENDING', type: 'MARKET' },
          select: { id: true, side: true, stockSymbol: true, userId: true, shares: true },
        })

        for (const order of pendingMarketOrders) {
          const fillPrice = newPrices[order.stockSymbol]
          if (!fillPrice) continue
          const totalCost = fillPrice * order.shares

          await tx.order.update({
            where: { id: order.id },
            data: { status: 'FILLED', fillPrice, filledAt: new Date() },
          })

          if (order.side === 'BUY') {
            // Cash already reserved at placement — update holding only
            const existing = await tx.holding.findUnique({
              where: { userId_stockSymbol: { userId: order.userId, stockSymbol: order.stockSymbol } },
            })
            if (existing) {
              const ns = existing.shares + order.shares
              const nc = (existing.avgCost * existing.shares + totalCost) / ns
              await tx.holding.update({ where: { id: existing.id }, data: { shares: ns, avgCost: nc } })
            } else {
              await tx.holding.create({
                data: { userId: order.userId, stockSymbol: order.stockSymbol, shares: order.shares, avgCost: fillPrice },
              })
            }
          } else {
            // SELL: credit cash now
            await tx.user.update({ where: { id: order.userId }, data: { cashBalance: { increment: totalCost } } })
            const existing = await tx.holding.findUnique({
              where: { userId_stockSymbol: { userId: order.userId, stockSymbol: order.stockSymbol } },
            })
            if (existing) {
              const ns = existing.shares - order.shares
              if (ns <= 0.0001) await tx.holding.delete({ where: { id: existing.id } })
              else await tx.holding.update({ where: { id: existing.id }, data: { shares: ns } })
            }
          }
        }

        // Tournament PENDING orders (MARKET + LIMIT) — only fill during real market hours
        const pendingTournamentOrders = await tx.tournamentOrder.findMany({
          where: { status: 'PENDING' },
          include: { entry: { select: { id: true, cashBalance: true } } },
        })

        for (const order of pendingTournamentOrders) {
          const fillPrice = newPrices[order.stockSymbol]
          if (!fillPrice) continue

          if (order.type === 'LIMIT') {
            const triggered = order.side === 'BUY' ? fillPrice <= order.limitPrice! : fillPrice >= order.limitPrice!
            if (!triggered) continue
          }

          const totalCost = fillPrice * order.shares

          await tx.tournamentOrder.update({
            where: { id: order.id },
            data: { status: 'FILLED', fillPrice, filledAt: new Date() },
          })

          if (order.side === 'BUY') {
            // Cash already reserved for both MARKET and LIMIT BUY
            const existing = await tx.tournamentHolding.findUnique({
              where: { entryId_stockSymbol: { entryId: order.entryId, stockSymbol: order.stockSymbol } },
            })
            if (existing) {
              const ns = existing.shares + order.shares
              const nc = (existing.avgCost * existing.shares + totalCost) / ns
              await tx.tournamentHolding.update({ where: { id: existing.id }, data: { shares: ns, avgCost: nc } })
            } else {
              await tx.tournamentHolding.create({
                data: { entryId: order.entryId, stockSymbol: order.stockSymbol, shares: order.shares, avgCost: fillPrice },
              })
            }
          } else {
            // SELL: credit cash to entry
            await tx.tournamentEntry.update({
              where: { id: order.entryId },
              data: { cashBalance: { increment: totalCost } },
            })
            const existing = await tx.tournamentHolding.findUnique({
              where: { entryId_stockSymbol: { entryId: order.entryId, stockSymbol: order.stockSymbol } },
            })
            if (existing) {
              const ns = existing.shares - order.shares
              if (ns <= 0.0001) await tx.tournamentHolding.delete({ where: { id: existing.id } })
              else await tx.tournamentHolding.update({ where: { id: existing.id }, data: { shares: ns } })
            }
          }
        }
      }

      // Expire options: settle ITM positions, expire OTM ones
      const expiredContracts = await tx.optionContract.findMany({
        where: { expiresAt: { lte: new Date() } },
        include: {
          positions: { where: { status: 'OPEN' } },
          stock: { select: { currentPrice: true } },
        },
      })

      for (const contract of expiredContracts) {
        const spot = newPrices[contract.stockSymbol] ?? contract.stock.currentPrice
        for (const pos of contract.positions) {
          const intrinsic = contract.optionType === 'CALL'
            ? Math.max(0, spot - contract.strikePrice)
            : Math.max(0, contract.strikePrice - spot)
          const settlement = intrinsic * 100 * pos.contracts

          await tx.optionPosition.update({
            where: { id: pos.id },
            data: {
              status: 'EXPIRED',
              closedAt: new Date(),
              closeProceeds: settlement,
              settlementNote: intrinsic > 0
                ? `Expired ITM. Settled at $${intrinsic.toFixed(2)}/share`
                : 'Expired OTM. No value.',
            },
          })

          if (settlement > 0) {
            await tx.user.update({
              where: { id: pos.userId },
              data: { cashBalance: { increment: settlement } },
            })
          }
        }
      }

      // Prune price history older than 7 days
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      await tx.priceHistory.deleteMany({ where: { timestamp: { lt: cutoff } } })
    })

    // Create at most one portfolio snapshot per user per day for chart history
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const hasSnapshotToday = await prisma.portfolioSnapshot.count({
      where: { userId: session.userId, snapshotAt: { gte: todayStart } },
    }) > 0
    if (!hasSnapshotToday) {
      const [snapUser, snapHoldings] = await Promise.all([
        prisma.user.findUnique({ where: { id: session.userId }, select: { cashBalance: true } }),
        prisma.holding.findMany({
          where: { userId: session.userId },
          include: { stock: { select: { currentPrice: true } } },
        }),
      ])
      const snapHoldingsValue = snapHoldings.reduce((s, h) => s + h.stock.currentPrice * h.shares, 0)
      const snapTotalValue = (snapUser?.cashBalance ?? 0) + snapHoldingsValue
      await prisma.portfolioSnapshot.create({
        data: { userId: session.userId, totalValue: snapTotalValue, cashBalance: snapUser?.cashBalance ?? 0 },
      })
      await checkAndAwardBadges(prisma, session.userId, snapTotalValue)
    }

    return NextResponse.json({
      updated: Object.keys(newPrices).length,
      source: hasRealData() && isMarketOpen() ? 'live' : 'simulated',
      marketOpen: isMarketOpen(),
    })
  } catch (error) {
    console.error('[simulation/tick]', error)
    return NextResponse.json({ error: 'Tick failed' }, { status: 500 })
  }
}
