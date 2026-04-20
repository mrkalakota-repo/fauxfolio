import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

function maskName(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].slice(0, 2) + '***'
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = checkRateLimit(`leaderboard:${ip}`, RATE_LIMITS.LEADERBOARD.max, RATE_LIMITS.LEADERBOARD.windowMs)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        cashBalance: true,
        totalTopUps: true,
        optionsPnl: true,
        createdAt: true,
        holdings: {
          include: {
            stock: { select: { currentPrice: true } },
          },
        },
      },
    })

    const computed = users.map(user => {
      const holdingsValue = user.holdings.reduce(
        (sum, h) => sum + h.stock.currentPrice * h.shares, 0
      )
      // True portfolio value (includes options P&L via cashBalance)
      const grossValue = user.cashBalance + holdingsValue
      // Stock-only value used for rankings — options P&L excluded for fairness
      // (simulated premiums shouldn't determine rank)
      const totalValue = user.cashBalance - user.optionsPnl + holdingsValue
      const invested = 10000 + user.totalTopUps * 10000
      const totalReturn = totalValue - invested
      const totalReturnPct = (totalReturn / invested) * 100

      return {
        id: user.id,
        name: maskName(user.name),
        grossValue,
        totalValue,
        cashBalance: user.cashBalance,
        holdingsValue,
        optionsPnl: user.optionsPnl,
        totalReturn,
        totalReturnPct,
        invested,
        joinedAt: user.createdAt.toISOString(),
      }
    })

    // Top 10 ranked by % return (best strategy wins)
    const ranked = [...computed]
      .sort((a, b) => b.totalReturnPct - a.totalReturnPct)
      .slice(0, 10)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))

    // Richest trader by absolute portfolio value (true gross value including options)
    const richest = computed.reduce(
      (best, u) => (u.grossValue > best.grossValue ? u : best),
      computed[0] ?? null
    )

    // Aggregate stats
    const totalTraders = await prisma.user.count()
    const totalOrdersValue = await prisma.order.aggregate({
      _sum: { fillPrice: true },
    })

    return NextResponse.json({
      leaderboard: ranked,
      richest,
      stats: {
        totalTraders,
        totalVirtualVolume: (totalOrdersValue._sum.fillPrice ?? 0) * 1,
      },
    })
  } catch (error) {
    console.error('[leaderboard]', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
