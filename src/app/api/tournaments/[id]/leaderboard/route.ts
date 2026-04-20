import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'
import { maskName } from '@/lib/tournament'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = checkRateLimit(`tournament-lb:${ip}`, RATE_LIMITS.LEADERBOARD.max, RATE_LIMITS.LEADERBOARD.windowMs)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const entries = await prisma.tournamentEntry.findMany({
      where: { tournamentId: id, status: { in: ['ACTIVE', 'ENDED'] } },
      include: {
        user: { select: { name: true } },
        holdings: { include: { stock: { select: { currentPrice: true } } } },
      },
    })

    const ranked = entries
      .map(entry => {
        const holdingsValue = entry.holdings.reduce((s, h) => s + h.shares * h.stock.currentPrice, 0)
        const currentValue = entry.status === 'ENDED' && entry.finalBalance != null
          ? entry.finalBalance
          : entry.cashBalance + holdingsValue
        const returnPct = ((currentValue - 20000) / 20000) * 100
        return {
          name: maskName(entry.user.name),
          currentValue,
          returnPct: parseFloat(returnPct.toFixed(2)),
        }
      })
      .sort((a, b) => b.currentValue - a.currentValue)
      .map((e, i) => ({ ...e, rank: i + 1 }))

    return NextResponse.json({ leaderboard: ranked })
  } catch (error) {
    console.error('[tournaments/leaderboard]', error)
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 })
  }
}
