import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCandles, candleParams, hasRealData } from '@/lib/finnhub'

const TIME_RANGE_DAYS: Record<string, number> = {
  '1D': 1, '1W': 7, '1M': 30, '3M': 90, '1Y': 365, 'ALL': 9999,
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: rawSymbol } = await params
    const symbol = rawSymbol.toUpperCase()
    const range = req.nextUrl.searchParams.get('range') || '1D'

    // Try Finnhub real candles first
    if (hasRealData()) {
      const { resolution, from, to } = candleParams(range)
      const candles = await getCandles(symbol, resolution, from, to)
      if (candles && candles.t.length > 0) {
        const history = candles.t.map((ts, i) => ({
          timestamp: new Date(ts * 1000).toISOString(),
          price: candles.c[i],
          volume: candles.v[i],
        }))
        return NextResponse.json({ history, source: 'live' })
      }
    }

    // Fallback: DB history
    const days = TIME_RANGE_DAYS[range] ?? 1
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const rows = await prisma.priceHistory.findMany({
      where: { stockSymbol: symbol, timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
      select: { price: true, volume: true, timestamp: true },
    })

    const maxPoints = 200
    const data = rows.length > maxPoints
      ? rows.filter((_, i) => i % Math.ceil(rows.length / maxPoints) === 0)
      : rows

    return NextResponse.json({
      history: data.map(p => ({
        price: p.price,
        volume: p.volume,
        timestamp: p.timestamp.toISOString(),
      })),
      source: 'simulated',
    })
  } catch (error) {
    console.error('[stocks/history]', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
