import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { signToken, COOKIE_NAME, normalizePhone } from '@/lib/auth'
import { checkRateLimitDb, RATE_LIMITS } from '@/lib/rateLimit'
import { writeAuditLog } from '@/lib/audit'

async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  // Fail closed in production if secret is not configured
  if (!secret) return process.env.NODE_ENV !== 'production'
  if (!token) return false
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = await checkRateLimitDb(`login:${ip}`, RATE_LIMITS.AUTH.max, RATE_LIMITS.AUTH.windowMs)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  try {
    const body = await req.json()
    const { phone, pin, cfToken } = body

    const human = await verifyTurnstile(cfToken, ip)
    if (!human) return NextResponse.json({ error: 'Human verification failed. Please try again.' }, { status: 403 })

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
      await writeAuditLog({ action: 'LOGIN_FAILURE', ip, metadata: { phone: normalizedPhone } })
      return NextResponse.json({ error: 'Invalid phone number or PIN' }, { status: 401 })
    }

    await writeAuditLog({ userId: user.id, action: 'LOGIN_SUCCESS', ip })

    const token = await signToken({
      userId: user.id,
      phone: user.phone,
      name: user.name,
      tokenVersion: user.tokenVersion,
    })
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
    console.error('[auth/login]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
