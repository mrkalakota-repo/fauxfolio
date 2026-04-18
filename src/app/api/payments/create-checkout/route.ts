import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { stripe, hasStripe, TOPUP_PRICE_CENTS, TOPUP_VIRTUAL_CASH } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Dev mode: no Stripe key configured — credit cash directly
  if (!hasStripe || !stripe) {
    await prisma.user.update({
      where: { id: session.userId },
      data: { cashBalance: { increment: TOPUP_VIRTUAL_CASH }, totalTopUps: { increment: 1 } },
    })
    await prisma.transaction.create({
      data: {
        userId: session.userId,
        type: 'TOP_UP',
        realAmountCents: 0,
        virtualAmount: TOPUP_VIRTUAL_CASH,
        status: 'COMPLETED',
      },
    })
    return NextResponse.json({ devMode: true, message: `$${TOPUP_VIRTUAL_CASH.toLocaleString()} virtual cash added (dev mode)` })
  }

  // Create Stripe Checkout Session
  const stripeSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: TOPUP_PRICE_CENTS,
          product_data: {
            name: `$${TOPUP_VIRTUAL_CASH.toLocaleString()} Virtual Trading Cash`,
            description: 'Simulated trading funds — no real investment value',
            images: [],
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: session.userId,
      virtualAmount: String(TOPUP_VIRTUAL_CASH),
    },
    success_url: `${appUrl}/dashboard?topup=success`,
    cancel_url: `${appUrl}/dashboard?topup=cancelled`,
  })

  // Record pending transaction
  await prisma.transaction.create({
    data: {
      userId: session.userId,
      type: 'TOP_UP',
      realAmountCents: TOPUP_PRICE_CENTS,
      virtualAmount: TOPUP_VIRTUAL_CASH,
      stripeSessionId: stripeSession.id,
      status: 'PENDING',
    },
  })

  return NextResponse.json({ url: stripeSession.url })
}
