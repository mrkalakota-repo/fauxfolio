import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, normalizePhone } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: leagueId } = await params

  try {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { _count: { select: { members: true } } },
    })
    if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })
    if (league.status !== 'ACTIVE') return NextResponse.json({ error: 'League has ended' }, { status: 400 })

    const isMember = await prisma.leagueMember.count({
      where: { leagueId, userId: session.userId },
    }) > 0
    if (!isMember) return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 })

    if (league._count.members >= league.maxMembers) {
      return NextResponse.json({ error: 'League is full' }, { status: 400 })
    }

    const { phone } = await req.json()
    if (!phone) return NextResponse.json({ error: 'Phone number required' }, { status: 400 })

    const normalized = normalizePhone(phone)
    if (normalized.length < 10) return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })

    const invitee = await prisma.user.findUnique({ where: { phone: normalized } })
    if (!invitee) return NextResponse.json({ error: 'No account found with that phone number' }, { status: 404 })
    if (invitee.id === session.userId) return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 })

    const alreadyMember = await prisma.leagueMember.count({
      where: { leagueId, userId: invitee.id },
    }) > 0
    if (alreadyMember) return NextResponse.json({ error: 'User is already in this league' }, { status: 400 })

    const existingInvite = await prisma.leagueInvite.findFirst({
      where: { leagueId, inviteePhone: normalized, status: 'PENDING', expiresAt: { gt: new Date() } },
    })
    if (existingInvite) return NextResponse.json({ error: 'Invite already pending for this user' }, { status: 400 })

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await prisma.leagueInvite.create({
      data: {
        leagueId,
        inviterId: session.userId,
        inviteePhone: normalized,
        expiresAt,
      },
    })

    return NextResponse.json({
      invite: { id: invite.id, token: invite.token, expiresAt: invite.expiresAt.toISOString() },
      joinUrl: `${process.env.NEXT_PUBLIC_APP_URL}/leagues/${leagueId}/join?token=${invite.token}`,
    }, { status: 201 })
  } catch (error) {
    console.error('[leagues/invite POST]', error)
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 })
  }
}
