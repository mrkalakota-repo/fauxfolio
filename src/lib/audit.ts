import { prisma } from '@/lib/db'

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'REGISTER'
  | 'PIN_CHANGED'
  | 'ORDER_PLACED'
  | 'CASH_TOPPED_UP'
  | 'TOURNAMENT_ENTERED'
  | 'LEAGUE_JOINED'
  | 'LEAGUE_INVITE_SENT'

export async function writeAuditLog({
  userId,
  action,
  resourceId,
  ip,
  metadata,
}: {
  userId?: string
  action: AuditAction
  resourceId?: string
  ip?: string
  metadata?: Record<string, string | number | boolean | null | undefined>
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { userId, action, resourceId, ip, metadata },
    })
  } catch {
    // Never throw — audit logging must not break the main flow
  }
}
