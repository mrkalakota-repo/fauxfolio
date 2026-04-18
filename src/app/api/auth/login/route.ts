import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { signToken, COOKIE_NAME, normalizePhone } from '@/lib/auth'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  // Rate limit by IP: 10 attempts per 15 minutes
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = checkRateLimit(`login:${ip}`, RATE_LIMITS.AUTH.max, RATE_LIMITS.AUTH.windowMs)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  try {
    const body = await req.json()
    const { phone, pin } = body

    if (!phone || !pin || typeof phone !== 'string' || typeof pin !== 'string') {
      return NextResponse.json({ error: 'Phone number and PIN are required' }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(phone)
    const user = await prisma.user.findUnique({ where: { phone: normalizedPhone } })

    // Constant-time comparison: always run bcrypt even if user not found
    const dummyHash = '$2b$12$invalidhashfortimingattackprevention000000000000000000'
    const pinToCompare = user?.pin ?? dummyHash
    const valid = await bcrypt.compare(pin, pinToCompare)

    if (!user || !valid) {
      return NextResponse.json({ error: 'Invalid phone number or PIN' }, { status: 401 })
    }

    const token = await signToken({ userId: user.id, phone: user.phone, name: user.name })
    const response = NextResponse.json({
      user: { id: user.id, phone: user.phone, name: user.name, cashBalance: user.cashBalance },
    })
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  } catch (error) {
    console.error('[auth/login]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
