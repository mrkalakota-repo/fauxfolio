import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [memberships, pendingInvites] = await Promise.all([
      prisma.leagueMember.findMany({
        where: { userId: session.userId },
        include: {
          league: {
            include: {
              _count: { select: { members: true } },
              creator: { select: { name: true } },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      }),
      prisma.leagueInvite.findMany({
        where: {
          inviteePhone: (await prisma.user.findUnique({
            where: { id: session.userId },
            select: { phone: true },
          }))?.phone ?? '',
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
        include: {
          league: { select: { id: true, name: true, endsAt: true } },
          inviter: { select: { name: true } },
        },
      }),
    ])

    return NextResponse.json({
      leagues: memberships.map(m => ({
        id: m.league.id,
        name: m.league.name,
        status: m.league.status,
        startedAt: m.league.startedAt.toISOString(),
        endsAt: m.league.endsAt.toISOString(),
        memberCount: m.league._count.members,
        maxMembers: m.league.maxMembers,
        creatorName: m.league.creator.name,
        joinedAt: m.joinedAt.toISOString(),
      })),
      pendingInvites: pendingInvites.map(i => ({
        id: i.id,
        token: i.token,
        leagueId: i.league.id,
        leagueName: i.league.name,
        leagueEndsAt: i.league.endsAt.toISOString(),
        inviterName: i.inviter.name,
        expiresAt: i.expiresAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[leagues GET]', error)
    return NextResponse.json({ error: 'Failed to fetch leagues' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { cashBalance: true, totalTopUps: true },
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (user.totalTopUps < 1) {
      return NextResponse.json(
        { error: 'Creating a league requires at least one cash pack purchase', upgradeRequired: true },
        { status: 403 }
      )
    }

    const { name } = await req.json()
    if (!name || typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 50) {
      return NextResponse.json({ error: 'League name must be 3–50 characters' }, { status: 400 })
    }

    // Snapshot creator's current portfolio value
    const holdings = await prisma.holding.findMany({
      where: { userId: session.userId },
      include: { stock: { select: { currentPrice: true } } },
    })
    const holdingsValue = holdings.reduce((s, h) => s + h.stock.currentPrice * h.shares, 0)
    const startingPortfolio = user.cashBalance + holdingsValue

    const endsAt = new Date()
    endsAt.setDate(endsAt.getDate() + 30)

    const league = await prisma.$transaction(async tx => {
      const lg = await tx.league.create({
        data: {
          name: name.trim(),
          creatorId: session.userId,
          endsAt,
        },
      })
      await tx.leagueMember.create({
        data: {
          leagueId: lg.id,
          userId: session.userId,
          startingPortfolio,
        },
      })
      return lg
    })

    return NextResponse.json({
      league: {
        id: league.id,
        name: league.name,
        status: league.status,
        startedAt: league.startedAt.toISOString(),
        endsAt: league.endsAt.toISOString(),
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[leagues POST]', error)
    return NextResponse.json({ error: 'Failed to create league' }, { status: 500 })
  }
}
