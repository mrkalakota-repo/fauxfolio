interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 5 * 60 * 1000)

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (entry.count >= max) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { allowed: true }
}

// Preset configs
export const RATE_LIMITS = {
  // Auth: 10 attempts per 15 minutes per IP
  AUTH: { max: 10, windowMs: 15 * 60 * 1000 },
  // Search: 60 requests per minute per IP
  SEARCH: { max: 60, windowMs: 60 * 1000 },
  // Payments: 5 checkout attempts per hour per user
  PAYMENT: { max: 5, windowMs: 60 * 60 * 1000 },
} as const
