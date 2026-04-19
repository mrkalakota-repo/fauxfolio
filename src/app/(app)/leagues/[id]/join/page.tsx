'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Trophy, Loader2, CalendarDays, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

interface InviteDetails {
  id: string
  token: string
  leagueId: string
  leagueName: string
  leagueEndsAt: string
  leagueStatus: string
  inviterName: string
  expiresAt: string
}

export default function JoinLeaguePage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null)

  useEffect(() => {
    if (!token) { router.replace('/leagues'); return }

    fetch(`/api/leagues/${id}/join?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.invite) {
          setInvite(data.invite)
        } else {
          setError(data.error || 'Invalid invite')
        }
      })
      .catch(() => setError('Failed to load invite'))
  }, [id, token, router])

  async function accept() {
    if (!invite) return
    setLoading('accept')
    try {
      const res = await fetch(`/api/leagues/${id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invite.token }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to join'); return }
      toast.success(`Joined ${invite.leagueName}!`)
      router.replace(`/leagues/${id}`)
    } finally {
      setLoading(null)
    }
  }

  async function decline() {
    if (!invite) return
    setLoading('decline')
    try {
      const res = await fetch(`/api/leagues/${id}/invite/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invite.token }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to decline'); return }
      toast.success('Invite declined')
      router.replace('/leagues')
    } finally {
      setLoading(null)
    }
  }

  if (!invite && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading invite…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-8 w-full max-w-sm text-center">
          <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold mb-2">Invite Unavailable</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.replace('/leagues')}
            className="w-full bg-white/10 hover:bg-white/15 text-white py-2.5 rounded-xl text-sm transition-colors"
          >
            Back to Leagues
          </button>
        </div>
      </div>
    )
  }

  const daysLeft = formatDistanceToNow(new Date(invite!.leagueEndsAt), { addSuffix: true })
  const expiresIn = formatDistanceToNow(new Date(invite!.expiresAt), { addSuffix: true })

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-7 h-7 text-blue-400" />
          </div>
          <h1 className="text-xl font-bold mb-1">League Invite</h1>
          <p className="text-gray-400 text-sm">You've been invited to compete</p>
        </div>

        <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">League</p>
            <p className="font-bold text-lg">{invite!.leagueName}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <User className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <span>Invited by <span className="text-white font-medium">{invite!.inviterName}</span></span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <CalendarDays className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <span>League ends {daysLeft}</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center mb-5">
          Invite expires {expiresIn}
        </p>

        <div className="flex gap-3">
          <button
            onClick={decline}
            disabled={!!loading}
            className="flex-1 border border-brand-border hover:border-gray-500 text-gray-300 hover:text-white py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {loading === 'decline' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Decline'}
          </button>
          <button
            onClick={accept}
            disabled={!!loading}
            className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading === 'accept' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join League'}
          </button>
        </div>
      </div>
    </div>
  )
}
