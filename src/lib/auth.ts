import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is not set')
  if (secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters')
  return new TextEncoder().encode(secret)
}

export const COOKIE_NAME = 'fauxfolio_token'

export interface JWTPayload {
  userId: string
  phone: string
  name: string
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret())
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function getSessionUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function getSessionUserFromRequest(
  req: NextRequest
): Promise<JWTPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

// Normalize phone: strip everything non-digit, keep last 10 digits
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

// Validate 4–6 digit PIN
export function validatePin(pin: string): string | null {
  if (!/^\d{4,6}$/.test(pin)) return 'PIN must be 4–6 digits'
  if (/^(\d)\1+$/.test(pin)) return 'PIN cannot be all the same digit'
  return null
}
