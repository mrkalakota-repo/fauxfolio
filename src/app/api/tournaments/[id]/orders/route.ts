import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isMarketOpen } from '@/lib/finnhub'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: tournamentId } = await params

  try {
    const body = await req.json()
    const { symbol, side, type, shares, limitPrice } = body

    if (!symbol || !side || !type || shares === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
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

    const entry = await prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId: session.userId } },
    })
    if (!entry || entry.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'No active tournament entry' }, { status: 403 })
    }

    const marketOpen = isMarketOpen()
    const executionPrice = type === 'MARKET' ? stock.currentPrice : limitPrice!
    const orderTotal = executionPrice * shares

    if (side === 'BUY') {
      const requiredCash = type === 'MARKET' ? orderTotal : limitPrice! * shares
      if (entry.cashBalance < requiredCash) {
        return NextResponse.json({ error: 'Insufficient tournament buying power' }, { status: 400 })
      }
    }

    if (side === 'SELL') {
      const holding = await prisma.tournamentHolding.findUnique({
        where: { entryId_stockSymbol: { entryId: entry.id, stockSymbol: symbol.toUpperCase() } },
      })
      if (!holding || holding.shares < shares) {
        return NextResponse.json({ error: 'Insufficient tournament shares' }, { status: 400 })
      }
    }

    // MARKET order during market hours: fill immediately
    if (type === 'MARKET' && marketOpen) {
      const result = await prisma.$transaction(async tx => {
        const order = await tx.tournamentOrder.create({
          data: {
            entryId: entry.id,
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
          await tx.tournamentEntry.update({
            where: { id: entry.id },
            data: { cashBalance: { decrement: orderTotal } },
          })
          const existing = await tx.tournamentHolding.findUnique({
            where: { entryId_stockSymbol: { entryId: entry.id, stockSymbol: symbol.toUpperCase() } },
          })
          if (existing) {
            const ns = existing.shares + shares
            const nc = (existing.avgCost * existing.shares + orderTotal) / ns
            await tx.tournamentHolding.update({ where: { id: existing.id }, data: { shares: ns, avgCost: nc } })
          } else {
            await tx.tournamentHolding.create({
              data: { entryId: entry.id, stockSymbol: symbol.toUpperCase(), shares, avgCost: stock.currentPrice },
            })
          }
        } else {
          await tx.tournamentEntry.update({
            where: { id: entry.id },
            data: { cashBalance: { increment: orderTotal } },
          })
          const existing = await tx.tournamentHolding.findUnique({
            where: { entryId_stockSymbol: { entryId: entry.id, stockSymbol: symbol.toUpperCase() } },
          })
          if (existing) {
            const ns = existing.shares - shares
            if (ns <= 0.0001) await tx.tournamentHolding.delete({ where: { id: existing.id } })
            else await tx.tournamentHolding.update({ where: { id: existing.id }, data: { shares: ns } })
          }
        }

        return order
      })

      return NextResponse.json({
        order: { ...result, createdAt: result.createdAt.toISOString(), filledAt: result.filledAt?.toISOString() },
        message: `${side === 'BUY' ? 'Bought' : 'Sold'} ${shares} share${shares !== 1 ? 's' : ''} of ${symbol} at $${stock.currentPrice.toFixed(2)}`,
      })
    }

    // MARKET order outside market hours: queue as PENDING
    if (type === 'MARKET' && !marketOpen) {
      if (side === 'BUY') {
        await prisma.tournamentEntry.update({
          where: { id: entry.id },
          data: { cashBalance: { decrement: orderTotal } },
        })
      }
      const order = await prisma.tournamentOrder.create({
        data: {
          entryId: entry.id,
          stockSymbol: symbol.toUpperCase(),
          type: 'MARKET',
          side,
          shares,
          status: 'PENDING',
        },
      })
      return NextResponse.json({
        order: { ...order, createdAt: order.createdAt.toISOString(), filledAt: null },
        message: 'Market is closed. Your tournament order will execute at the next market open.',
        pending: true,
      })
    }

    // LIMIT order: reserve cash for BUY, always PENDING
    if (side === 'BUY') {
      await prisma.tournamentEntry.update({
        where: { id: entry.id },
        data: { cashBalance: { decrement: limitPrice! * shares } },
      })
    }
    const order = await prisma.tournamentOrder.create({
      data: {
        entryId: entry.id,
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
    console.error('[tournaments/orders POST]', error)
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 })
  }
}
