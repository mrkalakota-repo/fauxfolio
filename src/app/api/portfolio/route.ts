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
    const invested = 10000 + user.totalTopUps * 10000
    const totalGainLoss = totalValue - invested
    const totalGainLossPercent = (totalGainLoss / invested) * 100

    // Day change: compare to yesterday's closing
    const yesterdayValue = enrichedHoldings.reduce((sum, h) => {
      return sum + h.stock.previousClose * h.shares
    }, user.cashBalance)
    const dayChange = totalValue - yesterdayValue
    const dayChangePercent = yesterdayValue > 0 ? (dayChange / yesterdayValue) * 100 : 0

    const rawSnapshots = await prisma.portfolioSnapshot.findMany({
      where: { userId: session.userId },
      orderBy: { snapshotAt: 'desc' },
      take: 90,
    })
    rawSnapshots.reverse()

    // Deduplicate: keep latest snapshot per calendar day
    const byDay = new Map<string, typeof rawSnapshots[0]>()
    for (const s of rawSnapshots) {
      byDay.set(s.snapshotAt.toISOString().slice(0, 10), s)
    }

    // Historical days (exclude today — replaced with live value below)
    const todayKey = new Date().toISOString().slice(0, 10)
    const historicalDays = Array.from(byDay.entries())
      .filter(([day]) => day !== todayKey)
      .map(([, s]) => ({ id: s.id, userId: s.userId, totalValue: s.totalValue, cashBalance: s.cashBalance, snapshotAt: s.snapshotAt.toISOString() }))

    // Always end the chart at the current live portfolio value
    const portfolioHistory = [
      ...historicalDays,
      { id: 'live', userId: session.userId, totalValue, cashBalance: user.cashBalance, snapshotAt: new Date().toISOString() },
    ]

    return NextResponse.json({
      user,
      holdings: enrichedHoldings,
      totalValue,
      totalCost,
      invested,
      totalGainLoss,
      totalGainLossPercent,
      dayChange,
      dayChangePercent,
      portfolioHistory,
    })
  } catch (error) {
    console.error('[portfolio]', error)
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 })
  }
}
