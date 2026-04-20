import { prisma } from '@/lib/db'

export function getCurrentMonthBounds() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const startsAt = new Date(year, month - 1, 1, 0, 0, 0)
  const endsAt = new Date(year, month, 0, 23, 59, 59, 999)
  return { month, year, startsAt, endsAt }
}

export async function getOrCreateCurrentTournament() {
  const { month, year, startsAt, endsAt } = getCurrentMonthBounds()
  return prisma.tournament.upsert({
    where: { month_year: { month, year } },
    create: { month, year, startsAt, endsAt, status: 'ACTIVE' },
    update: {},
  })
}

export async function finalizeTournament(tournamentId: string) {
  const entries = await prisma.tournamentEntry.findMany({
    where: { tournamentId, status: 'ACTIVE' },
    include: {
      holdings: { include: { stock: { select: { currentPrice: true } } } },
      user: { select: { id: true } },
    },
  })

  const ranked = entries
    .map(entry => {
      const holdingsValue = entry.holdings.reduce(
        (sum, h) => sum + h.shares * h.stock.currentPrice,
        0
      )
      return { id: entry.id, userId: entry.user.id, finalBalance: entry.cashBalance + holdingsValue }
    })
    .sort((a, b) => b.finalBalance - a.finalBalance)
    .map((e, i) => ({ ...e, rank: i + 1 }))

  await prisma.$transaction([
    prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: 'ENDED' },
    }),
    ...ranked.map(e =>
      prisma.tournamentEntry.update({
        where: { id: e.id },
        data: {
          finalBalance: e.finalBalance,
          rank: e.rank,
          status: 'ENDED',
          creditedAt: new Date(),
        },
      })
    ),
    ...ranked.map(e =>
      prisma.user.update({
        where: { id: e.userId },
        data: { cashBalance: { increment: e.finalBalance } },
      })
    ),
  ])

  return ranked
}

export function maskName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2) + '***'
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

export function formatMonth(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
