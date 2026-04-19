import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

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
    if (!invite || invite.leagueId !== leagueId || invite.inviteePhone !== userPhone) {
      return NextResponse.json({ error: 'Invalid invite' }, { status: 400 })
    }

    await prisma.leagueInvite.update({
      where: { id: invite.id },
      data: { status: 'DECLINED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[leagues/invite/decline POST]', error)
    return NextResponse.json({ error: 'Failed to decline invite' }, { status: 500 })
  }
}
