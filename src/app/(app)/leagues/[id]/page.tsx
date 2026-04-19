'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { ArrowLeft, Users, Copy, Check, Loader2, Phone } from 'lucide-react'
import Link from 'next/link'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import LeagueCountdown from '@/components/leagues/LeagueCountdown'
import toast from 'react-hot-toast'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface LeaderboardEntry {
  userId: string
  name: string
  isCurrentUser: boolean
  startingPortfolio: number
  currentValue: number
  growthPct: number
  rank: number
}

export default function LeaguePage() {
  const { id } = useParams<{ id: string }>()
  const [invitePhone, setInvitePhone] = useState('')
  const [inviting, setInviting] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const { data: leagueData } = useSWR(`/api/leagues/${id}`, fetcher, { refreshInterval: 15000 })
  const { data: lbData, mutate: mutateLb } = useSWR(
    `/api/leagues/${id}/leaderboard`, fetcher, { refreshInterval: 15000 }
  )
  const { data: portfolioData } = useSWR('/api/portfolio', fetcher)

  const league = leagueData?.league
  const leaderboard: LeaderboardEntry[] = lbData?.leaderboard ?? []
  const appUrl = portfolioData?.user ? process.env.NEXT_PUBLIC_APP_URL ?? '' : ''

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    try {
      const res = await fetch(`/api/leagues/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: invitePhone }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to invite'); return }
      toast.success('Invite sent!')
      // Copy join link to clipboard
      if (data.joinUrl) {
        await navigator.clipboard.writeText(data.joinUrl).catch(() => {})
        toast.success('Join link copied to clipboard')
      }
      setInvitePhone('')
      mutateLb()
    } finally {
      setInviting(false)
    }
  }

  async function copyLink(memberId: string, link: string) {
    await navigator.clipboard.writeText(link)
    setCopied(memberId)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!league) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="h-64 flex items-center justify-center text-gray-500">Loading...</div>
      </div>
    )
  }

  const ended = league.status === 'ENDED'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <Link href="/leagues" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Leagues
      </Link>

      {/* Header */}
      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{league.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Created by {league.creatorName}</p>
          </div>
          <div className="text-right">
            <div className={cn('text-xs font-medium px-2 py-0.5 rounded-md', ended ? 'bg-gray-500/15 text-gray-400' : 'bg-green-500/15 text-green-400')}>
              {ended ? 'Ended' : 'Active'}
            </div>
            {!ended && (
              <div className="text-xs text-gray-500 mt-1.5">
                Ends in <span className="text-white font-medium"><LeagueCountdown endsAt={league.endsAt} /></span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-500">
          <Users className="w-3.5 h-3.5" />
          {league.members.length}/{league.maxMembers} members
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="p-4 border-b border-brand-border">
            <h2 className="font-semibold">Leaderboard</h2>
          </div>
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No data yet</div>
          ) : (
            <div className="divide-y divide-brand-border/50">
              {leaderboard.map((entry, i) => (
                <div key={entry.userId} className={cn('flex items-center gap-4 px-5 py-3.5', entry.isCurrentUser && 'bg-green-500/5')}>
                  <span className={cn(
                    'w-6 text-sm font-bold text-center',
                    i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'
                  )}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium flex items-center gap-1.5">
                      {entry.name}
                      {entry.isCurrentUser && <span className="text-xs text-green-400">(you)</span>}
                    </div>
                    <div className="text-xs text-gray-500">{formatCurrency(entry.currentValue)}</div>
                  </div>
                  <div className={cn(
                    'text-sm font-semibold',
                    entry.growthPct >= 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {entry.growthPct >= 0 ? '+' : ''}{formatPercent(entry.growthPct)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invite panel */}
        {!ended && league.members.length < league.maxMembers && (
          <div className="card p-4 space-y-4 h-fit">
            <h3 className="font-semibold text-sm">Invite a Friend</h3>
            <form onSubmit={invite} className="space-y-3">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  value={invitePhone}
                  onChange={e => setInvitePhone(e.target.value)}
                  placeholder="Their phone number"
                  className="w-full bg-white/5 border border-brand-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <button
                type="submit"
                disabled={inviting || invitePhone.replace(/\D/g, '').length < 10}
                className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Send Invite
              </button>
            </form>
            <p className="text-xs text-gray-600">They must already have a FauxFolio account. A join link will be copied to your clipboard.</p>

            {appUrl && (
              <div className="pt-3 border-t border-brand-border">
                <p className="text-xs text-gray-500 mb-2">Or share your league ID</p>
                <button
                  onClick={() => copyLink('lid', `${appUrl}/leagues/${id}`)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs transition-colors"
                >
                  {copied === 'lid' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === 'lid' ? 'Copied!' : 'Copy league link'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
