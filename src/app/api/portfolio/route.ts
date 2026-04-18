import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, phone: true, name: true, cashBalance: true, totalTopUps: true, createdAt: true },
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const holdings = await prisma.holding.findMany({
      where: { userId: session.userId },
      include: { stock: true },
    })

    const enrichedHoldings = holdings.map(h => {
      const currentValue = h.stock.currentPrice * h.shares
      const costBasis = h.avgCost * h.shares
      const gainLoss = currentValue - costBasis
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0
      return {
        ...h,
        stock: {
          ...h.stock,
          volume: Number(h.stock.volume),
          marketCap: Number(h.stock.marketCap),
          change: h.stock.currentPrice - h.stock.previousClose,
          changePercent: ((h.stock.currentPrice - h.stock.previousClose) / h.stock.previousClose) * 100,
        },
        currentValue,
        gainLoss,
        gainLossPercent,
      }
    })

    const holdingsValue = enrichedHoldings.reduce((sum, h) => sum + h.currentValue, 0)
    const totalValue = user.cashBalance + holdingsValue
    const totalCost = enrichedHoldings.reduce((sum, h) => sum + h.avgCost * h.shares, 0)
    const totalGainLoss = holdingsValue - totalCost
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0

    // Day change: compare to yesterday's closing
    const yesterdayValue = enrichedHoldings.reduce((sum, h) => {
      return sum + h.stock.previousClose * h.shares
    }, user.cashBalance)
    const dayChange = totalValue - yesterdayValue
    const dayChangePercent = yesterdayValue > 0 ? (dayChange / yesterdayValue) * 100 : 0

    const portfolioHistory = await prisma.portfolioSnapshot.findMany({
      where: { userId: session.userId },
      orderBy: { snapshotAt: 'asc' },
      take: 90,
    })

    return NextResponse.json({
      user,
      holdings: enrichedHoldings,
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      dayChange,
      dayChangePercent,
      portfolioHistory: portfolioHistory.map(p => ({
        ...p,
        snapshotAt: p.snapshotAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[portfolio]', error)
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 })
  }
}
