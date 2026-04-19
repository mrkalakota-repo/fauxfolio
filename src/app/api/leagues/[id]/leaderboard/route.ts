import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: leagueId } = await params

  try {
    const isMember = await prisma.leagueMember.count({
      where: { leagueId, userId: session.userId },
    }) > 0
    if (!isMember) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const members = await prisma.leagueMember.findMany({
      where: { leagueId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            cashBalance: true,
            holdings: { include: { stock: { select: { currentPrice: true } } } },
          },
        },
      },
    })

    const entries = members.map(m => {
      const holdingsValue = m.user.holdings.reduce(
        (s, h) => s + h.stock.currentPrice * h.shares, 0
      )
      const currentValue = m.user.cashBalance + holdingsValue
      const growthPct = m.startingPortfolio > 0
        ? (currentValue - m.startingPortfolio) / m.startingPortfolio * 100
        : 0
      const firstName = m.user.name.split(' ')[0]
      const lastName = m.user.name.split(' ').slice(1).join(' ')
      const maskedName = lastName ? `${firstName} ${lastName[0]}.` : firstName
      return {
        userId: m.userId,
        name: maskedName,
        isCurrentUser: m.userId === session.userId,
        startingPortfolio: m.startingPortfolio,
        currentValue,
        growthPct,
        finalPortfolio: m.finalPortfolio,
        rank: m.rank,
      }
    })

    entries.sort((a, b) => b.growthPct - a.growthPct)
    entries.forEach((e, i) => { e.rank = i + 1 })

    return NextResponse.json({ leaderboard: entries })
  } catch (error) {
    console.error('[leagues/leaderboard GET]', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
