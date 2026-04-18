import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isMarketOpen } from '@/lib/finnhub'

function enrichStock(s: {
  symbol: string; name: string; sector: string; currentPrice: number;
  previousClose: number; openPrice: number; dayHigh: number; dayLow: number;
  volume: number; marketCap: number; description: string; logoUrl: string;
  exchange: string; priceUpdatedAt: Date; updatedAt: Date;
}) {
  return {
    ...s,
    priceUpdatedAt: s.priceUpdatedAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    change: s.currentPrice - s.previousClose,
    changePercent: s.previousClose > 0
      ? ((s.currentPrice - s.previousClose) / s.previousClose) * 100
      : 0,
    marketOpen: isMarketOpen(),
  }
}

export async function GET() {
  try {
    const stocks = await prisma.stock.findMany({ orderBy: { symbol: 'asc' } })
    return NextResponse.json({ stocks: stocks.map(enrichStock), marketOpen: isMarketOpen() })
  } catch (error) {
    console.error('[stocks]', error)
    return NextResponse.json({ error: 'Failed to fetch stocks' }, { status: 500 })
  }
}
