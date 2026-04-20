import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/db'
import { formatMonth } from '@/lib/tournament'

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = req.nextUrl.searchParams.get('userId')

  if (!userId) return new Response('Missing userId', { status: 400 })

  const entry = await prisma.tournamentEntry.findFirst({
    where: { tournamentId: id, userId, rank: 1 },
    include: {
      user: { select: { name: true } },
      tournament: { select: { month: true, year: true } },
    },
  })

  if (!entry) return new Response('Certificate not found', { status: 404 })

  const finalBalance = entry.finalBalance ?? 0
  const returnPct = (((finalBalance - 20000) / 20000) * 100).toFixed(1)
  const monthLabel = formatMonth(entry.tournament.month, entry.tournament.year)
  const balanceFormatted = finalBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #0f1729 50%, #0a0a0a 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          color: 'white',
          position: 'relative',
        }}
      >
        {/* Border glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(234,179,8,0.08) 0%, transparent 70%)',
        }} />

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '0 80px' }}>
          <div style={{ fontSize: 64 }}>🏆</div>

          <div style={{ fontSize: 18, color: '#eab308', letterSpacing: 4, textTransform: 'uppercase', fontWeight: 700 }}>
            Tournament Champion
          </div>

          <div style={{ fontSize: 58, fontWeight: 900, textAlign: 'center', lineHeight: 1.1 }}>
            {entry.user.name}
          </div>

          <div style={{ fontSize: 22, color: '#9ca3af', textAlign: 'center' }}>
            {monthLabel}
          </div>

          <div style={{ display: 'flex', gap: 48, marginTop: 8 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#22c55e' }}>{balanceFormatted}</div>
              <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Final Balance</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#22c55e' }}>+{returnPct}%</div>
              <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Return on $20K</div>
            </div>
          </div>

          <div style={{ marginTop: 24, fontSize: 20, color: '#22c55e', fontWeight: 700, letterSpacing: 1 }}>
            FauxFolio
          </div>
          <div style={{ fontSize: 13, color: '#374151' }}>Paper trading simulator · fauxfolio.net</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
