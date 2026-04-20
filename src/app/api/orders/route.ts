import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isMarketOpen } from '@/lib/finnhub'
import { checkAndAwardBadges } from '@/lib/badges'

export async function GET() {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const orders = await prisma.order.findMany({
      where: { userId: session.userId },
      include: { stock: { select: { symbol: true, name: true, currentPrice: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({
      orders: orders.map(o => ({
        ...o,
        createdAt: o.createdAt.toISOString(),
        filledAt: o.filledAt?.toISOString() ?? null,
      })),
    })
  } catch (error) {
    console.error('[orders GET]', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { symbol, side, type, shares, limitPrice } = body

    if (!symbol || !side || !type || shares === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Strict type and value validation
    if (typeof symbol !== 'string' || !/^[A-Za-z]{1,5}$/.test(symbol)) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
    }
    if (!['BUY', 'SELL'].includes(side)) {
      return NextResponse.json({ error: 'Invalid order side' }, { status: 400 })
    }
    if (!['MARKET', 'LIMIT'].includes(type)) {
      return NextResponse.json({ error: 'Invalid order type' }, { status: 400 })
    }
    if (typeof shares !== 'number' || !Number.isFinite(shares) || shares <= 0 || shares > 1_000_000) {
      return NextResponse.json({ error: 'Invalid share quantity' }, { status: 400 })
    }
    if (type === 'LIMIT') {
      if (typeof limitPrice !== 'number' || !Number.isFinite(limitPrice) || limitPrice <= 0 || limitPrice > 1_000_000) {
        return NextResponse.json({ error: 'Invalid limit price' }, { status: 400 })
      }
    }

    const stock = await prisma.stock.findUnique({ where: { symbol: symbol.toUpperCase() } })
    if (!stock) return NextResponse.json({ error: 'Stock not found' }, { status: 404 })

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const executionPrice = type === 'MARKET' ? stock.currentPrice : limitPrice
    const orderTotal = executionPrice * shares

    if (side === 'BUY') {
      const requiredCash = type === 'MARKET' ? orderTotal : limitPrice! * shares
      if (user.cashBalance < requiredCash) {
        return NextResponse.json({ error: 'Insufficient buying power' }, { status: 400 })
      }
    }

    if (side === 'SELL') {
      const holding = await prisma.holding.findUnique({
        where: { userId_stockSymbol: { userId: session.userId, stockSymbol: symbol.toUpperCase() } },
      })
      if (!holding || holding.shares < shares) {
        return NextResponse.json({ error: 'Insufficient shares' }, { status: 400 })
      }
    }

    // For MARKET orders outside market hours, queue as PENDING
    if (type === 'MARKET' && !isMarketOpen()) {
      if (side === 'BUY') {
        await prisma.user.update({
          where: { id: session.userId },
          data: { cashBalance: { decrement: orderTotal } },
        })
      }
      const order = await prisma.order.create({
        data: { userId: session.userId, stockSymbol: symbol.toUpperCase(), type: 'MARKET', side, shares, status: 'PENDING' },
      })
      return NextResponse.json({
        order: { ...order, createdAt: order.createdAt.toISOString(), filledAt: null },
        message: 'Market is closed. Your order will execute at the next market open.',
        pending: true,
      })
    }

    // For MARKET orders during market hours, execute immediately in a transaction
    if (type === 'MARKET') {
      const result = await prisma.$transaction(async tx => {
        const order = await tx.order.create({
          data: {
            userId: session.userId,
            stockSymbol: symbol.toUpperCase(),
            type: 'MARKET',
            side,
            shares,
            fillPrice: stock.currentPrice,
            status: 'FILLED',
            filledAt: new Date(),
          },
        })

        if (side === 'BUY') {
          await tx.user.update({
            where: { id: session.userId },
            data: { cashBalance: { decrement: orderTotal } },
          })
          const existing = await tx.holding.findUnique({
            where: { userId_stockSymbol: { userId: session.userId, stockSymbol: symbol.toUpperCase() } },
          })
          if (existing) {
            const newShares = existing.shares + shares
            const newAvgCost = (existing.avgCost * existing.shares + orderTotal) / newShares
            await tx.holding.update({
              where: { id: existing.id },
              data: { shares: newShares, avgCost: newAvgCost },
            })
          } else {
            await tx.holding.create({
              data: {
                userId: session.userId,
                stockSymbol: symbol.toUpperCase(),
                shares,
                avgCost: stock.currentPrice,
              },
            })
          }
        } else {
          await tx.user.update({
            where: { id: session.userId },
            data: { cashBalance: { increment: orderTotal } },
          })
          const existing = await tx.holding.findUnique({
            where: { userId_stockSymbol: { userId: session.userId, stockSymbol: symbol.toUpperCase() } },
          })
          if (existing) {
            const newShares = existing.shares - shares
            if (newShares <= 0.0001) {
              await tx.holding.delete({ where: { id: existing.id } })
            } else {
              await tx.holding.update({ where: { id: existing.id }, data: { shares: newShares } })
            }
          }
        }

        // Snapshot portfolio value
        const updatedUser = await tx.user.findUnique({ where: { id: session.userId } })
        const updatedHoldings = await tx.holding.findMany({
          where: { userId: session.userId },
          include: { stock: { select: { currentPrice: true } } },
        })
        const holdingsValue = updatedHoldings.reduce((s, h) => s + h.stock.currentPrice * h.shares, 0)
        const totalValue = (updatedUser?.cashBalance ?? 0) + holdingsValue
        await tx.portfolioSnapshot.create({
          data: { userId: session.userId, totalValue, cashBalance: updatedUser?.cashBalance ?? 0 },
        })

        await checkAndAwardBadges(tx, session.userId, totalValue)

        return order
      })

      return NextResponse.json({
        order: { ...result, createdAt: result.createdAt.toISOString(), filledAt: result.filledAt?.toISOString() },
        message: `${side === 'BUY' ? 'Bought' : 'Sold'} ${shares} share${shares !== 1 ? 's' : ''} of ${symbol} at ${stock.currentPrice.toFixed(2)}`,
      })
    }

    // LIMIT order: reserve cash for buy, reserve shares logically for sell
    if (side === 'BUY') {
      await prisma.user.update({
        where: { id: session.userId },
        data: { cashBalance: { decrement: limitPrice! * shares } },
      })
    }

    const order = await prisma.order.create({
      data: {
        userId: session.userId,
        stockSymbol: symbol.toUpperCase(),
        type: 'LIMIT',
        side,
        shares,
        limitPrice,
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      order: { ...order, createdAt: order.createdAt.toISOString(), filledAt: null },
      message: `Limit order placed: ${side} ${shares} ${symbol} @ $${limitPrice}`,
    })
  } catch (error) {
    console.error('[orders POST]', error)
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 })
  }
}
