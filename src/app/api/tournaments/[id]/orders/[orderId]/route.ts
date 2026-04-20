import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: tournamentId, orderId } = await params

  try {
    const entry = await prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId: session.userId } },
      select: { id: true },
    })
    if (!entry) return NextResponse.json({ error: 'No entry found' }, { status: 404 })

    const order = await prisma.tournamentOrder.findFirst({
      where: { id: orderId, entryId: entry.id, status: 'PENDING' },
    })
    if (!order) return NextResponse.json({ error: 'Order not found or already filled' }, { status: 404 })

    await prisma.$transaction(async tx => {
      await tx.tournamentOrder.update({ where: { id: orderId }, data: { status: 'CANCELLED' } })

      // Refund reserved cash for PENDING BUY orders
      if (order.side === 'BUY') {
        const refundAmount = order.type === 'MARKET'
          ? (order.fillPrice ?? 0) * order.shares  // market: was reserved at market price
          : order.limitPrice! * order.shares
        if (refundAmount > 0) {
          await tx.tournamentEntry.update({
            where: { id: entry.id },
            data: { cashBalance: { increment: refundAmount } },
          })
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[tournaments/orders DELETE]', error)
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 })
  }
}
