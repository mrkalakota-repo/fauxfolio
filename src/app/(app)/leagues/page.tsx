'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Plus, Trophy, Lock, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import LeagueCard from '@/components/leagues/LeagueCard'
import InviteBanner from '@/components/leagues/InviteBanner'
import GetMoreCashModal from '@/components/GetMoreCashModal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface LeagueRow {
  id: string
  name: string
  status: string
  endsAt: string
  memberCount: number
  maxMembers: number
  creatorName: string
}

interface Invite {
  id: string
  token: string
  leagueId: string
  leagueName: string
  inviterName: string
}

export default function LeaguesPage() {
  const { data, mutate } = useSWR<{ leagues: LeagueRow[]; pendingInvites: Invite[] }>(
    '/api/leagues', fetcher, { refreshInterval: 30000 }
  )
  const { data: portfolioData } = useSWR('/api/portfolio', fetcher)

  const [showCreate, setShowCreate] = useState(false)
  const [showTopUp, setShowTopUp] = useState(false)
  const [leagueName, setLeagueName] = useState('')
  const [creating, setCreating] = useState(false)

  const totalTopUps = portfolioData?.user?.totalTopUps ?? 0
  const cashBalance = portfolioData?.user?.cashBalance ?? 0
  const leagues = data?.leagues ?? []
  const pendingInvites = data?.pendingInvites ?? []

  async function createLeague(e: React.FormEvent) {
    e.preventDefault()
    if (totalTopUps < 1) { setShowCreate(false); setShowTopUp(true); return }
    setCreating(true)
    try {
      const res = await fetch('/api/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: leagueName }),
      })
      const d = await res.json()
      if (!res.ok) {
        if (d.upgradeRequired) { setShowCreate(false); setShowTopUp(true) }
        else toast.error(d.error || 'Failed to create league')
        return
      }
      toast.success('League created!')
      setLeagueName('')
      setShowCreate(false)
      mutate()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leagues</h1>
          <p className="text-sm text-gray-500 mt-0.5">Compete with friends over 30 days</p>
        </div>
        <button
          onClick={() => totalTopUps >= 1 ? setShowCreate(true) : setShowTopUp(true)}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create League
        </button>
      </div>

      <InviteBanner invites={pendingInvites} onAction={mutate} />

      {leagues.length === 0 ? (
        <div className="card p-12 text-center">
          {totalTopUps < 1 ? (
            <>
              <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-gray-400" />
              </div>
              <h2 className="font-semibold mb-2">Leagues require a cash pack</h2>
              <p className="text-sm text-gray-500 mb-5">Purchase any virtual cash pack to create and compete in private leagues.</p>
              <button
                onClick={() => setShowTopUp(true)}
                className="bg-green-500 hover:bg-green-400 text-black font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
              >
                Unlock Leagues
              </button>
            </>
          ) : (
            <>
              <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No leagues yet. Create one and invite friends!</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {leagues.map(lg => (
            <LeagueCard key={lg.id} {...lg} />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <div role="dialog" aria-modal="true" className="relative bg-brand-surface border border-brand-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">Create League</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 text-gray-500 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={createLeague} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">League Name</label>
                <input
                  value={leagueName}
                  onChange={e => setLeagueName(e.target.value)}
                  placeholder="e.g. Friends & Family Cup"
                  className="w-full bg-white/5 border border-brand-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500"
                  required
                  minLength={3}
                  maxLength={50}
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500">30-day competition · up to 10 members · ranked by portfolio growth %</p>
              <button
                type="submit"
                disabled={creating || leagueName.trim().length < 3}
                className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Create League
              </button>
            </form>
          </div>
        </div>
      )}

      <GetMoreCashModal open={showTopUp} onClose={() => setShowTopUp(false)} currentBalance={cashBalance} />
    </div>
  )
}
