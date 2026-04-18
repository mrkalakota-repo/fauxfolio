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
      // Look up transaction by Stripe session ID — use OUR record, not Stripe metadata
      const transaction = await tx.transaction.findUnique({
        where: { stripeSessionId: stripeSession.id },
      })

      // Idempotency: skip if already completed or not found
      if (!transaction || transaction.status === 'COMPLETED') return

      // Validate the virtual amount matches what we recorded — never trust metadata
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
    })
  }

  return NextResponse.json({ received: true })
}
