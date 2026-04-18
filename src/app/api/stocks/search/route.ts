import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { searchSymbols } from '@/lib/finnhub'
import { getSessionUserFromRequest } from '@/lib/auth'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

export async function GET(req: NextRequest) {
  const session = await getSessionUserFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = checkRateLimit(`search:${ip}`, RATE_LIMITS.SEARCH.max, RATE_LIMITS.SEARCH.windowMs)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (!q || q.length > 50) return NextResponse.json({ results: [] })

  // Strip characters that aren't alphanumeric or spaces
  const sanitized = q.replace(/[^a-zA-Z0-9 .]/g, '').trim()
  if (!sanitized) return NextResponse.json({ results: [] })

  try {
    const upper = sanitized.toUpperCase()

    const dbResults = await prisma.stock.findMany({
      where: {
        OR: [
          { symbol: { contains: upper } },
          { name: { contains: sanitized } },
        ],
      },
      take: 8,
      select: { symbol: true, name: true, sector: true, currentPrice: true, previousClose: true },
    })

    const finnhubResults = await searchSymbols(sanitized)
    const finnhubMapped = finnhubResults.map(r => ({
      symbol: r.symbol,
      name: r.description,
      sector: 'Unknown',
      currentPrice: 0,
      previousClose: 0,
      inDb: false,
    }))

    const dbSymbols = new Set(dbResults.map(r => r.symbol))
    const merged = [
      ...dbResults.map(r => ({
        ...r,
        changePercent: r.previousClose > 0
          ? ((r.currentPrice - r.previousClose) / r.previousClose) * 100
          : 0,
        inDb: true,
      })),
      ...finnhubMapped.filter(r => !dbSymbols.has(r.symbol)),
    ].slice(0, 10)

    return NextResponse.json({ results: merged })
  } catch (error) {
    console.error('[stocks/search]', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
