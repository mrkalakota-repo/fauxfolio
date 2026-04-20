import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { stripe, hasStripe, TOURNAMENT_ENTRY_CENTS } from '@/lib/stripe'
import { getOrCreateCurrentTournament, isRegistrationOpen } from '@/lib/tournament'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(`payment:${session.userId}`, RATE_LIMITS.PAYMENT.max, RATE_LIMITS.PAYMENT.windowMs)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const tournament = await getOrCreateCurrentTournament()

    if (tournament.status === 'ENDED') {
      return NextResponse.json({ error: 'This tournament has ended' }, { status: 400 })
    }

    if (!isRegistrationOpen()) {
      return NextResponse.json(
        { error: 'Registration is closed. You can only join during the first 5 days of the month.' },
        { status: 400 }
      )
    }

    const existing = await prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId: tournament.id, userId: session.userId } },
    })

    if (existing?.status === 'ACTIVE') {
      return NextResponse.json({ alreadyJoined: true, tournamentId: tournament.id })
    }

    // Dev mode: no Stripe key — activate entry directly
    if (!hasStripe) {
      const entry = await prisma.tournamentEntry.upsert({
        where: { tournamentId_userId: { tournamentId: tournament.id, userId: session.userId } },
        create: { tournamentId: tournament.id, userId: session.userId, status: 'ACTIVE' },
        update: { status: 'ACTIVE' },
      })
      return NextResponse.json({ devMode: true, tournamentId: tournament.id, entryId: entry.id })
    }

    // Production: create Stripe checkout
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const stripeSession = await stripe!.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Monthly Tournament Entry', description: `Start with $20,000 virtual cash. Best portfolio wins!` },
          unit_amount: TOURNAMENT_ENTRY_CENTS,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${appUrl}/tournaments?joined=success`,
      cancel_url: `${appUrl}/tournaments`,
      metadata: { type: 'tournament', tournamentId: tournament.id, userId: session.userId },
    })

    await prisma.tournamentEntry.upsert({
      where: { tournamentId_userId: { tournamentId: tournament.id, userId: session.userId } },
      create: { tournamentId: tournament.id, userId: session.userId, status: 'PENDING', stripeSessionId: stripeSession.id },
      update: { status: 'PENDING', stripeSessionId: stripeSession.id },
    })

    return NextResponse.json({ url: stripeSession.url })
  } catch (error) {
    console.error('[tournaments/join]', error)
    return NextResponse.json({ error: 'Failed to create tournament entry' }, { status: 500 })
  }
}
