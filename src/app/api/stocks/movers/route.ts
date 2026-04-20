import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getQuote, hasRealData, isMarketOpen } from '@/lib/finnhub'
import { getSessionUserFromRequest } from '@/lib/auth'
import type { NextRequest } from 'next/server'

interface Mover {
  symbol: string
  name: string
  currentPrice: number
  previousClose: number
  change: number
  changePercent: number
}

// In-memory cache — avoids hammering Finnhub on every dashboard refresh
let cache: { movers: { gainers: Mover[]; losers: Mover[] }; fetchedAt: number } | null = null
const CACHE_TTL_MS = 60_000 // 60 seconds

export async function GET(req: NextRequest) {
  const session = await getSessionUserFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const marketOpen = isMarketOpen()

  // Serve from cache if fresh and market is open (prices change; off-hours cache is fine longer)
  if (cache && Date.now() - cache.fetchedAt < (marketOpen ? CACHE_TTL_MS : 5 * 60_000)) {
    return NextResponse.json({ ...cache.movers, marketOpen, cached: true })
  }

  const stocks = await prisma.stock.findMany({
    select: { symbol: true, name: true, currentPrice: true, previousClose: true },
  })

  let enriched: Mover[]

  if (hasRealData() && marketOpen) {
    // Fetch live quotes for every stock in one parallel batch
    const quotes = await Promise.all(
      stocks.map(async s => {
        const q = await getQuote(s.symbol)
        return {
          symbol: s.symbol,
          name: s.name,
          currentPrice: q?.c && q.c > 0 ? q.c : s.currentPrice,
          previousClose: q?.pc && q.pc > 0 ? q.pc : s.previousClose,
        }
      })
    )
    enriched = quotes.map(s => ({
      ...s,
      change: s.currentPrice - s.previousClose,
      changePercent: s.previousClose > 0
        ? ((s.currentPrice - s.previousClose) / s.previousClose) * 100
        : 0,
    }))
  } else {
    // Market closed or no API key — use DB prices (frozen at last real close)
    enriched = stocks.map(s => ({
      ...s,
      change: s.currentPrice - s.previousClose,
      changePercent: s.previousClose > 0
        ? ((s.currentPrice - s.previousClose) / s.previousClose) * 100
        : 0,
    }))
  }

  const sorted = [...enriched].sort((a, b) => b.changePercent - a.changePercent)
  const movers = {
    gainers: sorted.filter(s => s.changePercent > 0).slice(0, 5),
    losers:  sorted.filter(s => s.changePercent < 0).reverse().slice(0, 5),
  }

  cache = { movers, fetchedAt: Date.now() }
  return NextResponse.json({ ...movers, marketOpen })
}
