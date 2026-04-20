import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { signToken, COOKIE_NAME, normalizePhone, validatePin } from '@/lib/auth'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  if (!token) return false
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token, remoteip: ip }),
  })
  const data = await res.json()
  return data.success === true
}

export async function POST(req: NextRequest) {
  // Rate limit by IP: 3 new accounts per hour
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = checkRateLimit(`register:${ip}`, RATE_LIMITS.REGISTER.max, RATE_LIMITS.REGISTER.windowMs)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  try {
    const body = await req.json()
    const { phone, pin, name, cfToken } = body

    const human = await verifyTurnstile(cfToken, ip)
    if (!human) return NextResponse.json({ error: 'Human verification failed. Please try again.' }, { status: 403 })

    if (!phone || !pin || !name ||
        typeof phone !== 'string' || typeof pin !== 'string' || typeof name !== 'string') {
      return NextResponse.json({ error: 'Phone number, PIN, and name are required' }, { status: 400 })
    }

    if (name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json({ error: 'Name must be between 2 and 100 characters' }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(phone)
    if (normalizedPhone.length < 10) {
      return NextResponse.json({ error: 'Enter a valid 10-digit phone number' }, { status: 400 })
    }

    const pinError = validatePin(pin)
    if (pinError) {
      return NextResponse.json({ error: pinError }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { phone: normalizedPhone } })
    if (existing) {
      return NextResponse.json({ error: 'This phone number is already registered' }, { status: 409 })
    }

    const hashedPin = await bcrypt.hash(pin, 12)
    const user = await prisma.user.create({
      data: {
        phone: normalizedPhone,
        pin: hashedPin,
        name: name.trim(),
        cashBalance: 10000,
      },
    })

    await prisma.portfolioSnapshot.create({
      data: { userId: user.id, totalValue: 10000, cashBalance: 10000 },
    })

    const token = await signToken({ userId: user.id, phone: user.phone, name: user.name })
    const response = NextResponse.json({
      user: { id: user.id, phone: user.phone, name: user.name, cashBalance: user.cashBalance },
    })
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  } catch (error) {
    console.error('[auth/register]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
