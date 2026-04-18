import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getQuote, getProfile, isMarketOpen } from '@/lib/finnhub'
import { getSessionUserFromRequest } from '@/lib/auth'

const STALE_SECONDS = 30
const SYMBOL_RE = /^[A-Z]{1,5}$/

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const session = await getSessionUserFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { symbol: rawSymbol } = await params
    const symbol = rawSymbol.toUpperCase()

    if (!SYMBOL_RE.test(symbol)) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
    }

    let stock = await prisma.stock.findUnique({ where: { symbol } })

    if (!stock) {
      const [quote, profile] = await Promise.all([getQuote(symbol), getProfile(symbol)])
      if (!quote || quote.c <= 0) {
        return NextResponse.json({ error: 'Stock not found' }, { status: 404 })
      }
      stock = await prisma.stock.create({
        data: {
          symbol,
          name: profile?.name ?? symbol,
          sector: profile?.finnhubIndustry ?? 'Unknown',
          currentPrice: quote.c,
          previousClose: quote.pc,
          openPrice: quote.o,
          dayHigh: quote.h,
          dayLow: quote.l,
          volume: 0,
          marketCap: profile ? profile.marketCapitalization * 1_000_000 : 0,
          description: '',
          logoUrl: profile?.logo ?? '',
          exchange: profile?.exchange ?? 'US',
          priceUpdatedAt: new Date(),
        },
      })
    }

    const stale = (Date.now() - new Date(stock.priceUpdatedAt).getTime()) / 1000 > STALE_SECONDS
    if (stale && isMarketOpen()) {
      const quote = await getQuote(symbol)
      if (quote && quote.c > 0) {
        stock = await prisma.stock.update({
          where: { symbol },
          data: {
            currentPrice: quote.c,
            previousClose: quote.pc,
            openPrice: quote.o,
            dayHigh: quote.h,
            dayLow: quote.l,
            priceUpdatedAt: new Date(),
          },
        })
        await prisma.priceHistory.create({
          data: { stockSymbol: symbol, price: quote.c, volume: 0 },
        })
      }
    }

    return NextResponse.json({
      stock: {
        ...stock,
        priceUpdatedAt: stock.priceUpdatedAt.toISOString(),
        updatedAt: stock.updatedAt.toISOString(),
        change: stock.currentPrice - stock.previousClose,
        changePercent: stock.previousClose > 0
          ? ((stock.currentPrice - stock.previousClose) / stock.previousClose) * 100
          : 0,
        marketOpen: isMarketOpen(),
      },
    })
  } catch (error) {
    console.error('[stocks/[symbol]]', error)
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 })
  }
}
