import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 })

  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook signature' }, { status: 400 })
  }

  let event
  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('[webhook] signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const stripeSession = event.data.object as {
      id: string
      metadata: Record<string, string>
      payment_status: string
    }

    if (stripeSession.payment_status !== 'paid') {
      return NextResponse.json({ received: true })
    }

    await prisma.$transaction(async tx => {
      // Check cash top-up transaction first
      const transaction = await tx.transaction.findUnique({
        where: { stripeSessionId: stripeSession.id },
      })

      if (transaction) {
        // Idempotency: skip if already completed
        if (transaction.status === 'COMPLETED') return

        const virtualAmount = transaction.virtualAmount
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: 'COMPLETED' },
        })
        const topUpUnits = Math.round(virtualAmount / 10_000)
        await tx.user.update({
          where: { id: transaction.userId },
          data: {
            cashBalance: { increment: virtualAmount },
            totalTopUps: { increment: topUpUnits },
          },
        })
        return
      }

      // Check tournament entry
      const entry = await tx.tournamentEntry.findUnique({
        where: { stripeSessionId: stripeSession.id },
      })
      if (entry && entry.status === 'PENDING') {
        await tx.tournamentEntry.update({
          where: { id: entry.id },
          data: { status: 'ACTIVE' },
        })
      }
    })
  }

  return NextResponse.json({ received: true })
}
