import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const entry = await prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId: id, userId: session.userId } },
      include: {
        holdings: {
          include: { stock: { select: { symbol: true, name: true, currentPrice: true, previousClose: true, logoUrl: true } } },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        tournament: { select: { month: true, year: true, endsAt: true, status: true } },
      },
    })

    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

    const holdingsValue = entry.holdings.reduce((s, h) => s + h.shares * h.stock.currentPrice, 0)
    const currentValue = entry.cashBalance + holdingsValue

    return NextResponse.json({
      entry: {
        ...entry,
        joinedAt: entry.joinedAt.toISOString(),
        creditedAt: entry.creditedAt?.toISOString() ?? null,
        tournament: {
          ...entry.tournament,
          endsAt: entry.tournament.endsAt.toISOString(),
        },
        orders: entry.orders.map(o => ({
          ...o,
          createdAt: o.createdAt.toISOString(),
          filledAt: o.filledAt?.toISOString() ?? null,
        })),
      },
      currentValue,
      holdingsValue,
      returnPct: parseFloat((((currentValue - 20000) / 20000) * 100).toFixed(2)),
    })
  } catch (error) {
    console.error('[tournaments/entry]', error)
    return NextResponse.json({ error: 'Failed to load entry' }, { status: 500 })
  }
}
