import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'
import { getSessionUserFromRequest } from '@/lib/auth'

function maskName(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].slice(0, 2) + '***'
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = checkRateLimit(`leaderboard:${ip}`, RATE_LIMITS.LEADERBOARD.max, RATE_LIMITS.LEADERBOARD.windowMs)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const session = await getSessionUserFromRequest(req)

  try {
    // Single aggregating query — DB sums holdings value per user instead of loading all rows
    const rows = await prisma.$queryRaw<Array<{
      id: string
      name: string
      cashBalance: number
      totalTopUps: number
      optionsPnl: number
      createdAt: Date
      holdingsValue: number
    }>>`
      SELECT u.id, u.name, u."cashBalance"::float, u."totalTopUps", u."optionsPnl"::float, u."createdAt",
        COALESCE(SUM(h.shares * s."currentPrice"), 0)::float AS "holdingsValue"
      FROM users u
      LEFT JOIN holdings h ON h."userId" = u.id
      LEFT JOIN stocks s ON s.symbol = h."stockSymbol"
      GROUP BY u.id
    `

    const computed = rows.map(user => {
      const holdingsValue = user.holdingsValue
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

    // All users ranked by % return (best strategy wins)
    const allRanked = [...computed].sort((a, b) => b.totalReturnPct - a.totalReturnPct)

    // Top 10 for public leaderboard
    const ranked = allRanked
      .slice(0, 10)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))

    // Richest trader by absolute portfolio value (true gross value including options)
    const richest = computed.reduce(
      (best, u) => (u.grossValue > best.grossValue ? u : best),
      computed[0] ?? null
    )

    // Current user's rank and stats (if authenticated)
    let myRank: number | null = null
    let myStats: typeof computed[0] & { rank: number } | null = null
    if (session) {
      const myIndex = allRanked.findIndex(u => u.id === session.userId)
      if (myIndex !== -1) {
        myRank = myIndex + 1
        myStats = { ...allRanked[myIndex], rank: myRank }
      }
    }

    // Aggregate stats
    const totalTraders = await prisma.user.count()
    const totalOrdersValue = await prisma.order.aggregate({
      _sum: { fillPrice: true },
    })

    // Personalized response must not be publicly cached — CDN would serve one
    // user's rank data to another. Use private when authenticated, public otherwise.
    const cacheHeader = session
      ? 'private, no-store'
      : 'public, s-maxage=60, stale-while-revalidate=300'

    return NextResponse.json(
      {
        leaderboard: ranked,
        richest,
        myRank,
        myStats,
        stats: {
          totalTraders,
          totalVirtualVolume: (totalOrdersValue._sum.fillPrice ?? 0) * 1,
        },
      },
      { headers: { 'Cache-Control': cacheHeader } }
    )
  } catch (error) {
    console.error('[leaderboard]', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
