import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const league = await prisma.league.findUnique({
      where: { id },
      include: {
        creator: { select: { name: true } },
        members: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    })
    if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

    const userPhone = (await prisma.user.findUnique({
      where: { id: session.userId },
      select: { phone: true },
    }))?.phone ?? ''

    const isMember = league.members.some(m => m.userId === session.userId)
    const hasPendingInvite = !isMember && await prisma.leagueInvite.count({
      where: { leagueId: id, inviteePhone: userPhone, status: 'PENDING', expiresAt: { gt: new Date() } },
    }) > 0

    if (!isMember && !hasPendingInvite) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Lazy finalization
    if (league.status === 'ACTIVE' && league.endsAt <= new Date()) {
      await finalizeLeague(id, league.members)
      return GET(_req, { params: Promise.resolve({ id }) })
    }

    return NextResponse.json({
      league: {
        id: league.id,
        name: league.name,
        status: league.status,
        startedAt: league.startedAt.toISOString(),
        endsAt: league.endsAt.toISOString(),
        maxMembers: league.maxMembers,
        creatorName: league.creator.name,
        creatorId: league.creatorId,
        members: league.members.map(m => ({
          userId: m.userId,
          name: m.user.name,
          joinedAt: m.joinedAt.toISOString(),
          startingPortfolio: m.startingPortfolio,
          finalPortfolio: m.finalPortfolio,
          rank: m.rank,
        })),
      },
    })
  } catch (error) {
    console.error('[leagues/[id] GET]', error)
    return NextResponse.json({ error: 'Failed to fetch league' }, { status: 500 })
  }
}

async function finalizeLeague(
  leagueId: string,
  members: Array<{ id: string; userId: string; startingPortfolio: number }>
) {
  const memberIds = members.map(m => m.userId)

  // Batch: 2 queries instead of 2×N
  const [users, allHoldings] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, cashBalance: true },
    }),
    prisma.holding.findMany({
      where: { userId: { in: memberIds } },
      include: { stock: { select: { currentPrice: true } } },
    }),
  ])

  const userMap = new Map(users.map(u => [u.id, u]))
  const holdingsByUser = new Map<string, typeof allHoldings>()
  for (const h of allHoldings) {
    const list = holdingsByUser.get(h.userId) ?? []
    list.push(h)
    holdingsByUser.set(h.userId, list)
  }

  const ranked = members.map(m => {
    const user = userMap.get(m.userId)
    const holdings = holdingsByUser.get(m.userId) ?? []
    const holdingsValue = holdings.reduce((s, h) => s + h.stock.currentPrice * h.shares, 0)
    const finalPortfolio = (user?.cashBalance ?? 0) + holdingsValue
    const growthPct = (finalPortfolio - m.startingPortfolio) / m.startingPortfolio * 100
    return { memberId: m.id, finalPortfolio, growthPct }
  })

  ranked.sort((a, b) => b.growthPct - a.growthPct)

  await prisma.$transaction([
    prisma.league.update({ where: { id: leagueId }, data: { status: 'ENDED' } }),
    ...ranked.map((r, i) =>
      prisma.leagueMember.update({
        where: { id: r.memberId },
        data: { finalPortfolio: r.finalPortfolio, rank: i + 1 },
      })
    ),
  ])
}
