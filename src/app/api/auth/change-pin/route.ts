import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { getSessionUserFromRequest, validatePin } from '@/lib/auth'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const session = await getSessionUserFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = checkRateLimit(`change-pin:${session.userId}:${ip}`, RATE_LIMITS.AUTH.max, RATE_LIMITS.AUTH.windowMs)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })

  const body = await req.json()
  const { currentPin, newPin, confirmPin } = body

  if (!currentPin || !newPin || !confirmPin) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }
  if (newPin !== confirmPin) {
    return NextResponse.json({ error: 'New PINs do not match' }, { status: 400 })
  }
  const pinError = validatePin(newPin)
  if (pinError) return NextResponse.json({ error: pinError }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const valid = await bcrypt.compare(currentPin, user.pin)
  if (!valid) return NextResponse.json({ error: 'Current PIN is incorrect' }, { status: 401 })

  const hashed = await bcrypt.hash(newPin, 12)
  await prisma.user.update({ where: { id: session.userId }, data: { pin: hashed } })

  return NextResponse.json({ message: 'PIN updated successfully' })
}
