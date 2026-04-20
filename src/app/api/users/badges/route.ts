import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { BADGE_THRESHOLDS } from '@/lib/badges'

export async function GET() {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const earned = await prisma.userBadge.findMany({
      where: { userId: session.userId },
      orderBy: { awardedAt: 'asc' },
    })

    const earnedSet = new Set(earned.map(b => b.badge))

    const badges = BADGE_THRESHOLDS.map(t => ({
      badge: t.badge,
      label: t.label,
      icon: t.icon,
      description: t.description,
      earned: earnedSet.has(t.badge),
      awardedAt: earned.find(b => b.badge === t.badge)?.awardedAt.toISOString() ?? null,
    }))

    return NextResponse.json({ badges })
  } catch (error) {
    console.error('[users/badges]', error)
    return NextResponse.json({ error: 'Failed to load badges' }, { status: 500 })
  }
}
