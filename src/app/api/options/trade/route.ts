import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { blackScholes, deriveImpliedVolatility } from '@/lib/simulation'

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { cashBalance: true, totalTopUps: true },
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (user.totalTopUps < 1) {
      return NextResponse.json(
        { error: 'Options trading requires at least one cash pack purchase', upgradeRequired: true },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { contractId, action, contracts: numContracts } = body

    if (!contractId || !action || numContracts === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!['BUY', 'CLOSE'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    if (typeof numContracts !== 'number' || !Number.isFinite(numContracts) || numContracts <= 0 || numContracts > 100) {
      return NextResponse.json({ error: 'Invalid contract quantity (1–100)' }, { status: 400 })
    }

    const contract = await prisma.optionContract.findUnique({
      where: { id: contractId },
      include: { stock: { select: { currentPrice: true, sector: true } } },
    })
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    if (contract.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Contract has expired' }, { status: 400 })
    }

    const now = new Date()
    const T = (contract.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365)
    const sigma = deriveImpliedVolatility(contract.stock.sector)
    const { price: premiumPerShare } = blackScholes(
      contract.stock.currentPrice,
      contract.strikePrice,
      T,
      0.05,
      sigma,
      contract.optionType as 'CALL' | 'PUT'
    )

    if (action === 'BUY') {
      const totalCost = premiumPerShare * 100 * numContracts
      if (user.cashBalance < totalCost) {
        return NextResponse.json({ error: 'Insufficient buying power' }, { status: 400 })
      }

      const position = await prisma.$transaction(async tx => {
        await tx.user.update({
          where: { id: session.userId },
          data: { cashBalance: { decrement: totalCost } },
        })
        return tx.optionPosition.create({
          data: {
            userId: session.userId,
            contractId,
            contracts: numContracts,
            premiumPaid: totalCost,
          },
        })
      })

      return NextResponse.json({
        position: { ...position, openedAt: position.openedAt.toISOString() },
        message: `Bought ${numContracts} contract${numContracts !== 1 ? 's' : ''} for $${totalCost.toFixed(2)}`,
      })
    }

    // CLOSE — body.contractId is treated as positionId for close actions
    const openPosition = await prisma.optionPosition.findUnique({
      where: { id: contractId },
    })

    if (!openPosition || openPosition.userId !== session.userId || openPosition.status !== 'OPEN') {
      return NextResponse.json({ error: 'Open position not found' }, { status: 404 })
    }

    const closeContracts = Math.min(numContracts, openPosition.contracts)
    const proceeds = premiumPerShare * 100 * closeContracts

    const updated = await prisma.$transaction(async tx => {
      await tx.user.update({
        where: { id: session.userId },
        data: { cashBalance: { increment: proceeds } },
      })
      return tx.optionPosition.update({
        where: { id: openPosition.id },
        data: {
          status: 'CLOSED',
          closedAt: now,
          closeProceeds: proceeds,
        },
      })
    })

    return NextResponse.json({
      position: { ...updated, openedAt: updated.openedAt.toISOString(), closedAt: updated.closedAt?.toISOString() },
      message: `Closed position for $${proceeds.toFixed(2)}`,
    })
  } catch (error) {
    console.error('[options trade POST]', error)
    return NextResponse.json({ error: 'Failed to process trade' }, { status: 500 })
  }
}
