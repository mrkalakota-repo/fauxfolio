import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export const BADGE_THRESHOLDS = [
  { badge: 'PEAK_100K',  threshold: 100_000,       label: '$100K Club',        icon: '🥉', description: 'Portfolio reached $100,000' },
  { badge: 'PEAK_1M',    threshold: 1_000_000,     label: 'Millionaire',       icon: '🥈', description: 'Portfolio reached $1,000,000' },
  { badge: 'PEAK_10M',   threshold: 10_000_000,    label: '$10M Trader',       icon: '🥇', description: 'Portfolio reached $10,000,000' },
  { badge: 'PEAK_100M',  threshold: 100_000_000,   label: 'Centimillionaire',  icon: '💎', description: 'Portfolio reached $100,000,000' },
  { badge: 'PEAK_1B',    threshold: 1_000_000_000, label: 'Billionaire',       icon: '👑', description: 'Portfolio reached $1,000,000,000' },
] as const

export type BadgeName = typeof BADGE_THRESHOLDS[number]['badge']

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

export async function checkAndAwardBadges(
  tx: TxClient | Prisma.TransactionClient,
  userId: string,
  portfolioValue: number
): Promise<string[]> {
  const earned = BADGE_THRESHOLDS
    .filter(b => portfolioValue >= b.threshold)
    .map(b => b.badge)

  if (earned.length === 0) return []

  const existing = await (tx as any).userBadge.findMany({
    where: { userId, badge: { in: earned } },
    select: { badge: true },
  })
  const existingSet = new Set((existing as { badge: string }[]).map(b => b.badge))
  const newBadges = earned.filter(b => !existingSet.has(b))

  if (newBadges.length === 0) return []

  await (tx as any).userBadge.createMany({
    data: newBadges.map(badge => ({ userId, badge })),
    skipDuplicates: true,
  })

  return newBadges
}
