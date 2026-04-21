import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { stripe, hasStripe } from '@/lib/stripe'
import { CASH_PACKS } from '@/components/GetMoreCash.const'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(`payment:${session.userId}`, RATE_LIMITS.PAYMENT.max, RATE_LIMITS.PAYMENT.windowMs)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many payment attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const body = await req.json().catch(() => ({}))
  const { packId } = body
  if (!packId) return NextResponse.json({ error: 'Missing packId' }, { status: 400 })
  const pack = CASH_PACKS.find(p => p.id === packId)
  if (!pack) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? `https://${req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000'}`

  // Dev mode: no Stripe key — credit cash directly
  if (!hasStripe || !stripe) {
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        cashBalance: { increment: pack.virtualCash },
        totalTopUps: { increment: pack.topUpUnits },
      },
    })
    await prisma.transaction.create({
      data: {
        userId: session.userId,
        type: 'TOP_UP',
        realAmountCents: 0,
        virtualAmount: pack.virtualCash,
        status: 'COMPLETED',
      },
    })
    return NextResponse.json({
      devMode: true,
      message: `${pack.label}: $${pack.virtualCash.toLocaleString()} virtual cash added (dev mode)`,
    })
  }

  // Create Stripe Checkout Session
  const stripeSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: pack.priceCents,
          product_data: {
            name: `FauxFolio ${pack.label} — $${pack.virtualCash.toLocaleString()} Virtual Cash`,
            description: 'Simulated trading funds — no real investment value',
            images: [],
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: session.userId,
      virtualAmount: String(pack.virtualCash),
    },
    success_url: `${appUrl}/dashboard?topup=success`,
    cancel_url: `${appUrl}/dashboard?topup=cancelled`,
  })

  // Record pending transaction — webhook reads virtualAmount and topUpUnits from here
  await prisma.transaction.create({
    data: {
      userId: session.userId,
      type: 'TOP_UP',
      realAmountCents: pack.priceCents,
      virtualAmount: pack.virtualCash,
      stripeSessionId: stripeSession.id,
      status: 'PENDING',
    },
  })

  return NextResponse.json({ url: stripeSession.url })
}
