import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await prisma.watchlistItem.findMany({
    where: { userId: session.userId },
    include: { stock: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({
    watchlist: items.map(item => ({
      ...item,
      stock: {
        ...item.stock,
        volume: Number(item.stock.volume),
        marketCap: Number(item.stock.marketCap),
        change: item.stock.currentPrice - item.stock.previousClose,
        changePercent: ((item.stock.currentPrice - item.stock.previousClose) / item.stock.previousClose) * 100,
      },
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { symbol } = await req.json()
  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 })

  const stock = await prisma.stock.findUnique({ where: { symbol: symbol.toUpperCase() } })
  if (!stock) return NextResponse.json({ error: 'Stock not found' }, { status: 404 })

  const existing = await prisma.watchlistItem.findUnique({
    where: { userId_stockSymbol: { userId: session.userId, stockSymbol: symbol.toUpperCase() } },
  })
  if (existing) return NextResponse.json({ error: 'Already in watchlist' }, { status: 409 })

  const item = await prisma.watchlistItem.create({
    data: { userId: session.userId, stockSymbol: symbol.toUpperCase() },
    include: { stock: true },
  })

  return NextResponse.json({ item })
}
