import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { simulateBatchPriceTick, checkLimitOrders } from '@/lib/simulation'
import { getQuote, hasRealData, isMarketOpen } from '@/lib/finnhub'
import { getSessionUserFromRequest } from '@/lib/auth'


// How many stocks to refresh from Finnhub per tick (respects 60 req/min limit)
const BATCH_SIZE = 5

// Track round-robin position across ticks (module-level, resets on cold start)
let tickIndex = 0

export async function POST(req: NextRequest) {
  const session = await getSessionUserFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

      // Prune price history older than 7 days
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      await tx.priceHistory.deleteMany({ where: { timestamp: { lt: cutoff } } })
    })

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
