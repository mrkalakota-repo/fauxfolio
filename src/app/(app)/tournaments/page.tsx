'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Trophy, Medal, Clock, Users, TrendingUp, Loader2, Crown, Share2 } from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { formatMonth } from '@/lib/tournament'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function TournamentsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const { data, isLoading, mutate } = useSWR('/api/tournaments/current', fetcher, { refreshInterval: 15000 })
  const tournament = data?.tournament
  const entryStatus: string = data?.entryStatus ?? 'NONE'
  const entryId: string | null = data?.entryId ?? null
  const previousWinner = data?.previousWinner
  const registrationOpen: boolean = data?.registrationOpen ?? true

  const { data: lbData } = useSWR(
    tournament ? `/api/tournaments/${tournament.id}/leaderboard` : null,
    fetcher,
    { refreshInterval: 15000 }
  )

  useEffect(() => {
    const joined = searchParams.get('joined')
    if (joined === 'success') toast.success('You\'re in the tournament! Start trading with your $20,000.')
    if (joined === 'cancelled') toast('Entry cancelled — no charge was made.')
  }, [searchParams])

  async function handleEnter() {
    try {
      const res = await fetch('/api/tournaments/join', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? 'Failed to join tournament'); return }
      if (d.alreadyJoined) { toast.success('You\'re already in!'); mutate(); return }
      if (d.devMode) { toast.success('Joined in dev mode — start trading!'); mutate(); return }
      if (d.url) { window.location.href = d.url }
    } catch {
      toast.error('Something went wrong')
    }
  }

  async function handleShare(winner: { name: string; finalBalance: number | null; returnPct: string; certificateUrl: string; month: string }) {
    const certUrl = `${window.location.origin}${winner.certificateUrl}`
    const text = `${winner.name} won the FauxFolio ${winner.month} Tournament with a ${winner.returnPct}% return!`
    if (navigator.share) {
      navigator.share({ title: 'FauxFolio Tournament Champion', text, url: certUrl }).catch(() => {})
    } else {
      navigator.clipboard.writeText(certUrl)
      toast.success('Certificate link copied!')
    }
  }

  const daysLeft = tournament
    ? Math.max(0, Math.ceil((new Date(tournament.endsAt).getTime() - Date.now()) / 86400000))
    : 0

  const currentMonthLabel = tournament
    ? formatMonth(tournament.month, tournament.year)
    : ''

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Medal className="w-7 h-7 text-yellow-400" />
        <div>
          <h1 className="text-2xl font-bold">Monthly Tournament</h1>
          <p className="text-sm text-gray-400">{currentMonthLabel} · Trade with $20,000 virtual cash · Best portfolio wins</p>
        </div>
      </div>

      {/* Previous winner banner */}
      {previousWinner && (
        <div className="card p-5 border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-yellow-400 font-medium uppercase tracking-wider mb-0.5">{previousWinner.month} Champion</p>
                <p className="font-semibold text-white">{previousWinner.name}</p>
                <p className="text-sm text-gray-400">
                  {previousWinner.finalBalance != null ? formatCurrency(previousWinner.finalBalance) : '—'} · +{previousWinner.returnPct}% return
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={previousWinner.certificateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs border border-yellow-500/30 text-yellow-400 rounded-lg hover:bg-yellow-500/10 transition-colors"
              >
                View Certificate
              </a>
              <button
                onClick={() => handleShare(previousWinner)}
                className="px-3 py-1.5 text-xs border border-brand-border text-gray-300 rounded-lg hover:border-gray-500 transition-colors flex items-center gap-1.5"
              >
                <Share2 className="w-3 h-3" /> Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current tournament card */}
      <div className="card p-6">
        <div className="flex flex-wrap gap-6 items-center justify-between">
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{daysLeft}</p>
              <p className="text-xs text-gray-400 mt-0.5">Days Left</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{lbData?.leaderboard?.length ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-0.5">Entrants</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">$20K</p>
              <p className="text-xs text-gray-400 mt-0.5">Start Balance</p>
            </div>
          </div>

          <div>
            {entryStatus === 'ACTIVE' && entryId ? (
              <Link
                href={`/tournaments/${tournament?.id}/play`}
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                <TrendingUp className="w-4 h-4" /> Trade Now
              </Link>
            ) : entryStatus === 'PENDING' ? (
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Awaiting payment confirmation…
              </div>
            ) : entryStatus === 'ENDED' ? (
              <div className="text-sm text-gray-400">Tournament ended</div>
            ) : !registrationOpen ? (
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Registration closed — join by the 5th next month
              </div>
            ) : (
              <button
                onClick={handleEnter}
                className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                <Trophy className="w-4 h-4" /> Enter for $1.99
              </button>
            )}
          </div>
        </div>

        {entryStatus === 'NONE' && registrationOpen && (
          <p className="text-xs text-gray-500 mt-3">
            $20,000 virtual cash · Join by the 5th of each month · Trading limited to market hours · Remaining balance credited to your account at month end
          </p>
        )}
      </div>

      {/* Live leaderboard */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" /> Live Standings
          </h2>
          <span className="text-xs text-gray-500">Updates every 15s</span>
        </div>

        {!lbData?.leaderboard || lbData.leaderboard.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No entrants yet — be the first!</p>
        ) : (
          <div className="space-y-2">
            {lbData.leaderboard.map((entry: { rank: number; name: string; currentValue: number; returnPct: number }) => (
              <div key={entry.rank} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                  entry.rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                  entry.rank === 3 ? 'bg-orange-500/20 text-orange-400' :
                  'bg-white/5 text-gray-500'
                }`}>{entry.rank}</span>
                <span className="flex-1 text-sm font-medium">{entry.name}</span>
                <span className="text-sm font-semibold">{formatCurrency(entry.currentValue)}</span>
                <span className={`text-xs font-medium w-20 text-right ${entry.returnPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {entry.returnPct >= 0 ? '+' : ''}{entry.returnPct.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
