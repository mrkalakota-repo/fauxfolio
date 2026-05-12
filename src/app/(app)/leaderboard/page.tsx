'use client'

import useSWR from 'swr'
import { Trophy, TrendingUp, TrendingDown, Users, DollarSign, Crown, Medal } from 'lucide-react'
import { formatCurrency, formatPercent, cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type LeaderboardEntry = {
  id: string
  name: string
  rank: number
  totalReturnPct: number
  totalValue: number
  grossValue: number
  invested: number
  totalReturn: number
}

type LeaderboardData = {
  leaderboard: LeaderboardEntry[]
  richest: LeaderboardEntry | null
  myRank: number | null
  myStats: (LeaderboardEntry & { rank: number }) | null
  stats: { totalTraders: number; totalVirtualVolume: number }
}

const RANK_COLORS: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-gray-300',
  3: 'text-amber-600',
}

const RANK_BG: Record<number, string> = {
  1: 'bg-yellow-400/10 border-yellow-400/20',
  2: 'bg-gray-300/10 border-gray-300/20',
  3: 'bg-amber-600/10 border-amber-600/20',
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-4 h-4 text-yellow-400" />
  if (rank === 2) return <Medal className="w-4 h-4 text-gray-300" />
  if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />
  return <span className="text-sm font-bold text-gray-500">#{rank}</span>
}

export default function LeaderboardPage() {
  const { data, isLoading } = useSWR<LeaderboardData>('/api/leaderboard', fetcher, {
    refreshInterval: 60000,
  })

  const leaderboard = data?.leaderboard ?? []
  const richest = data?.richest
  const myRank = data?.myRank
  const myStats = data?.myStats
  const stats = data?.stats

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          Global Leaderboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">Ranked by total return % across all traders</p>
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">Total Traders</span>
          </div>
          <div className="text-xl font-bold">{stats?.totalTraders ?? '—'}</div>
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">Virtual Volume</span>
          </div>
          <div className="text-xl font-bold">
            {stats ? formatCurrency(stats.totalVirtualVolume) : '—'}
          </div>
        </div>
      </div>

      {/* My rank card */}
      {myStats && myRank && (
        <div className="bg-green-500/10 border border-green-500/25 rounded-xl p-4">
          <div className="text-xs text-green-400 font-semibold uppercase tracking-wide mb-2">Your Standing</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-white">
                #{myRank}
                <span className="text-sm text-gray-400 font-normal ml-1.5">
                  of {stats?.totalTraders ?? '?'} traders
                </span>
              </div>
              <div className={cn(
                'text-sm font-semibold mt-0.5',
                myStats.totalReturnPct >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                {myStats.totalReturnPct >= 0 ? '+' : ''}{formatPercent(myStats.totalReturnPct)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Portfolio Value</div>
              <div className="text-base font-bold text-white">{formatCurrency(myStats.totalValue)}</div>
              <div className={cn(
                'text-xs font-medium',
                myStats.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                {myStats.totalReturn >= 0 ? '+' : ''}{formatCurrency(myStats.totalReturn)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Richest trader */}
      {richest && (
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">
            World&apos;s Richest Trader
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              <span className="font-semibold text-white">{richest.name}</span>
            </div>
            <div className="text-right">
              <div className="font-bold text-white">{formatCurrency(richest.grossValue)}</div>
              <div className={cn(
                'text-xs',
                richest.totalReturnPct >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                {richest.totalReturnPct >= 0 ? '+' : ''}{formatPercent(richest.totalReturnPct)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top 10 table */}
      <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-brand-border">
          <span className="text-sm font-semibold text-white">Top 10 by Return %</span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-brand-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
                <div className="w-6 h-4 bg-white/10 rounded" />
                <div className="flex-1 h-4 bg-white/10 rounded" />
                <div className="w-16 h-4 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">No traders yet</div>
        ) : (
          <div className="divide-y divide-brand-border">
            {leaderboard.map(entry => {
              const isMe = entry.id === myStats?.id
              return (
                <div
                  key={entry.id}
                  className={cn(
                    'px-4 py-3 flex items-center gap-3 transition-colors',
                    isMe ? 'bg-green-500/8' : '',
                    entry.rank <= 3 ? RANK_BG[entry.rank] : '',
                  )}
                >
                  <div className="w-6 flex items-center justify-center flex-shrink-0">
                    <RankMedal rank={entry.rank} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      'text-sm font-semibold truncate',
                      isMe ? 'text-green-400' : 'text-white'
                    )}>
                      {entry.name}
                      {isMe && <span className="ml-1.5 text-xs font-normal text-green-500">(you)</span>}
                    </div>
                    <div className="text-xs text-gray-500">{formatCurrency(entry.totalValue)}</div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className={cn(
                      'text-sm font-bold flex items-center gap-1 justify-end',
                      entry.totalReturnPct >= 0 ? 'text-green-400' : 'text-red-400'
                    )}>
                      {entry.totalReturnPct >= 0
                        ? <TrendingUp className="w-3.5 h-3.5" />
                        : <TrendingDown className="w-3.5 h-3.5" />
                      }
                      {entry.totalReturnPct >= 0 ? '+' : ''}{formatPercent(entry.totalReturnPct)}
                    </div>
                    <div className={cn(
                      'text-xs',
                      entry.totalReturn >= 0 ? 'text-green-500/70' : 'text-red-500/70'
                    )}>
                      {entry.totalReturn >= 0 ? '+' : ''}{formatCurrency(entry.totalReturn)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-600 text-center">
        Rankings update every 60 seconds · Names masked for privacy
      </p>
    </div>
  )
}
