import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: leagueId } = await params
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  try {
    const invite = await prisma.leagueInvite.findUnique({
      where: { token },
      include: {
        league: { select: { id: true, name: true, endsAt: true, status: true } },
        inviter: { select: { name: true } },
      },
    })

    if (!invite || invite.leagueId !== leagueId) {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 })
    }
    if (invite.status !== 'PENDING' || invite.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Invite has expired or already been used' }, { status: 400 })
    }

    const userPhone = (await prisma.user.findUnique({
      where: { id: session.userId },
      select: { phone: true },
    }))?.phone ?? ''

    if (invite.inviteePhone !== userPhone) {
      return NextResponse.json({ error: 'This invite is not for your account' }, { status: 403 })
    }

    return NextResponse.json({
      invite: {
        id: invite.id,
        token: invite.token,
        leagueId: invite.league.id,
        leagueName: invite.league.name,
        leagueEndsAt: invite.league.endsAt.toISOString(),
        leagueStatus: invite.league.status,
        inviterName: invite.inviter.name,
        expiresAt: invite.expiresAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[leagues/join GET]', error)
    return NextResponse.json({ error: 'Failed to fetch invite' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: leagueId } = await params

  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

    const userPhone = (await prisma.user.findUnique({
      where: { id: session.userId },
      select: { phone: true },
    }))?.phone ?? ''

    const invite = await prisma.leagueInvite.findUnique({ where: { token } })
    if (!invite || invite.leagueId !== leagueId) {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 })
    }
    if (invite.status !== 'PENDING' || invite.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Invite has expired or already been used' }, { status: 400 })
    }
    if (invite.inviteePhone !== userPhone) {
      return NextResponse.json({ error: 'This invite is not for your account' }, { status: 403 })
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { _count: { select: { members: true } } },
    })
    if (!league || league.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'League is not active' }, { status: 400 })
    }
    if (league._count.members >= league.maxMembers) {
      return NextResponse.json({ error: 'League is full' }, { status: 400 })
    }

    const alreadyMember = await prisma.leagueMember.count({
      where: { leagueId, userId: session.userId },
    }) > 0
    if (alreadyMember) return NextResponse.json({ error: 'Already a member' }, { status: 400 })

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { cashBalance: true },
    })
    const holdings = await prisma.holding.findMany({
      where: { userId: session.userId },
      include: { stock: { select: { currentPrice: true } } },
    })
    const holdingsValue = holdings.reduce((s, h) => s + h.stock.currentPrice * h.shares, 0)
    const startingPortfolio = (user?.cashBalance ?? 0) + holdingsValue

    await prisma.$transaction([
      prisma.leagueMember.create({
        data: { leagueId, userId: session.userId, startingPortfolio },
      }),
      prisma.leagueInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      }),
    ])

    return NextResponse.json({ success: true, leagueId })
  } catch (error) {
    console.error('[leagues/join POST]', error)
    return NextResponse.json({ error: 'Failed to join league' }, { status: 500 })
  }
}
