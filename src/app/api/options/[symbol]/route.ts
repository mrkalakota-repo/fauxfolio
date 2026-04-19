import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { blackScholes, generateOptionChain, deriveImpliedVolatility } from '@/lib/simulation'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { symbol } = await params
  const upper = symbol.toUpperCase()

  try {
    const stock = await prisma.stock.findUnique({ where: { symbol: upper } })
    if (!stock) return NextResponse.json({ error: 'Stock not found' }, { status: 404 })

    const now = new Date()

    // Refresh chain if fewer than 10 non-expired contracts exist
    const existingCount = await prisma.optionContract.count({
      where: { stockSymbol: upper, expiresAt: { gt: now } },
    })

    if (existingCount < 10) {
      const chain = generateOptionChain(upper, stock.currentPrice, stock.sector)
      await prisma.optionContract.createMany({
        data: chain.map(c => ({
          stockSymbol: c.stockSymbol,
          optionType: c.optionType,
          strikePrice: c.strikePrice,
          expiresAt: c.expiresAt,
        })),
        skipDuplicates: true,
      })
    }

    const contracts = await prisma.optionContract.findMany({
      where: { stockSymbol: upper, expiresAt: { gt: now } },
      orderBy: [{ expiresAt: 'asc' }, { strikePrice: 'asc' }],
    })

    const sigma = deriveImpliedVolatility(stock.sector)
    const r = 0.05

    const enriched = contracts.map(c => {
      const T = (c.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365)
      const greeks = blackScholes(stock.currentPrice, c.strikePrice, T, r, sigma, c.optionType as 'CALL' | 'PUT')
      return {
        id: c.id,
        stockSymbol: c.stockSymbol,
        optionType: c.optionType,
        strikePrice: c.strikePrice,
        expiresAt: c.expiresAt.toISOString(),
        ...greeks,
      }
    })

    const expiries = [...new Set(enriched.map(c => c.expiresAt))].sort()
    const calls = enriched.filter(c => c.optionType === 'CALL')
    const puts = enriched.filter(c => c.optionType === 'PUT')

    return NextResponse.json({ calls, puts, expiries, currentPrice: stock.currentPrice })
  } catch (error) {
    console.error('[options GET]', error)
    return NextResponse.json({ error: 'Failed to fetch option chain' }, { status: 500 })
  }
}
