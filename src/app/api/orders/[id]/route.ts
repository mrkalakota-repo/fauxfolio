import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.userId !== session.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (order.status !== 'PENDING') {
      return NextResponse.json({ error: 'Only pending orders can be cancelled' }, { status: 400 })
    }

    await prisma.$transaction(async tx => {
      await tx.order.update({ where: { id }, data: { status: 'CANCELLED' } })
      // Refund reserved cash for limit buy orders
      if (order.side === 'BUY' && order.type === 'LIMIT' && order.limitPrice) {
        await tx.user.update({
          where: { id: session.userId },
          data: { cashBalance: { increment: order.limitPrice * order.shares } },
        })
      }
    })

    return NextResponse.json({ success: true, message: 'Order cancelled' })
  } catch (error) {
    console.error('[orders/cancel]', error)
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 })
  }
}
