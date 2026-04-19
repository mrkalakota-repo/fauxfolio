'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy } from 'lucide-react'
import toast from 'react-hot-toast'

interface Invite {
  id: string
  token: string
  leagueId: string
  leagueName: string
  inviterName: string
}

export default function InviteBanner({ invites, onAction }: { invites: Invite[]; onAction?: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  if (invites.length === 0) return null

  async function accept(invite: Invite) {
    setLoading(invite.id)
    try {
      const res = await fetch(`/api/leagues/${invite.leagueId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invite.token }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to join'); return }
      toast.success(`Joined ${invite.leagueName}!`)
      onAction?.()
      router.push(`/leagues/${invite.leagueId}`)
    } finally {
      setLoading(null)
    }
  }

  async function decline(invite: Invite) {
    setLoading(invite.id + '-decline')
    try {
      const res = await fetch(`/api/leagues/${invite.leagueId}/invite/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invite.token }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to decline'); return }
      toast.success('Invite declined')
      onAction?.()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-2">
      {invites.map(invite => (
        <div key={invite.id} className="card p-4 border-blue-500/30 bg-blue-500/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">
                <span className="text-blue-400">{invite.inviterName}</span> invited you to join{' '}
                <span className="font-bold">{invite.leagueName}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => decline(invite)}
              disabled={!!loading}
              className="text-xs text-gray-500 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              Decline
            </button>
            <button
              onClick={() => accept(invite)}
              disabled={!!loading}
              className="text-xs bg-blue-500 hover:bg-blue-400 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              {loading === invite.id ? 'Joining…' : 'Join'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
