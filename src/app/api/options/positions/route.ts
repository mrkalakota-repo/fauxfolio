import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { blackScholes, deriveImpliedVolatility } from '@/lib/simulation'

export async function GET() {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const positions = await prisma.optionPosition.findMany({
      where: { userId: session.userId },
      include: {
        contract: {
          include: { stock: { select: { currentPrice: true, sector: true } } },
        },
      },
      orderBy: { openedAt: 'desc' },
    })

    const now = new Date()

    const enriched = positions.map(p => {
      const { contract } = p
      const T = Math.max(
        (contract.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365),
        0
      )
      const sigma = deriveImpliedVolatility(contract.stock.sector)
      const { price: markPerShare } = T > 0
        ? blackScholes(contract.stock.currentPrice, contract.strikePrice, T, 0.05, sigma, contract.optionType as 'CALL' | 'PUT')
        : { price: 0 }

      const markValue = markPerShare * 100 * p.contracts
      const unrealizedPnl = markValue - p.premiumPaid

      return {
        id: p.id,
        status: p.status,
        contracts: p.contracts,
        premiumPaid: p.premiumPaid,
        closeProceeds: p.closeProceeds,
        openedAt: p.openedAt.toISOString(),
        closedAt: p.closedAt?.toISOString() ?? null,
        settlementNote: p.settlementNote,
        contract: {
          id: contract.id,
          stockSymbol: contract.stockSymbol,
          optionType: contract.optionType,
          strikePrice: contract.strikePrice,
          expiresAt: contract.expiresAt.toISOString(),
        },
        markValue,
        unrealizedPnl,
      }
    })

    return NextResponse.json({ positions: enriched })
  } catch (error) {
    console.error('[options positions GET]', error)
    return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
  }
}
