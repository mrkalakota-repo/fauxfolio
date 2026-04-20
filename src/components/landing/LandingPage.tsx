'use client'

import Link from 'next/link'
import useSWR from 'swr'
import {
  TrendingUp, Trophy, Globe, Shield, Zap,
  BarChart2, BookOpen, ChevronRight, Circle, Star, ArrowUpRight, Crown, Medal, Share2,
} from 'lucide-react'
import { formatMonth } from '@/lib/tournament'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const RANK_COLORS = [
  'from-yellow-500 to-amber-400',
  'from-slate-400 to-slate-300',
  'from-orange-600 to-orange-400',
]
const RANK_LABELS = ['🥇', '🥈', '🥉']
const RANK_RING = ['ring-yellow-500/50', 'ring-slate-400/50', 'ring-orange-500/50']


interface LeaderboardEntry {
  rank: number
  id: string
  name: string
  totalValue: number
  totalReturn: number
  totalReturnPct: number
  joinedAt: string
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[]
  richest: LeaderboardEntry | null
  stats: { totalTraders: number; totalVirtualVolume: number }
}

// Scrolling ticker tape of stock prices
const TICKER_STOCKS = [
  { symbol: 'AAPL', price: 189.84, change: 2.64 },
  { symbol: 'NVDA', price: 875.20, change: 12.80 },
  { symbol: 'TSLA', price: 248.50, change: 7.20 },
  { symbol: 'MSFT', price: 415.32, change: 3.52 },
  { symbol: 'GOOGL', price: 172.63, change: 1.68 },
  { symbol: 'META', price: 502.30, change: 5.50 },
  { symbol: 'AMZN', price: 186.40, change: 2.65 },
  { symbol: 'AMD', price: 158.40, change: 3.20 },
  { symbol: 'NFLX', price: 685.40, change: 6.20 },
  { symbol: 'JPM', price: 210.45, change: 2.15 },
  { symbol: 'SPY', price: 543.20, change: 3.40 },
  { symbol: 'COIN', price: 218.60, change: 8.20 },
]

function TickerTape() {
  const doubled = [...TICKER_STOCKS, ...TICKER_STOCKS]
  return (
    <div className="overflow-hidden bg-brand-surface border-y border-brand-border py-2.5 select-none">
      <div className="flex gap-8 animate-[ticker_40s_linear_infinite] w-max">
        {doubled.map((s, i) => (
          <div key={i} className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-xs font-bold text-white">{s.symbol}</span>
            <span className="text-xs text-gray-300">{formatCurrency(s.price)}</span>
            <span className={cn('text-xs font-medium', s.change >= 0 ? 'text-green-400' : 'text-red-400')}>
              {s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}
            </span>
            <span className="text-gray-700 text-xs">•</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const FEATURES = [
  {
    icon: <Globe className="w-5 h-5" />,
    title: 'Real Market Data',
    desc: 'Live prices from global markets via Finnhub. Trade at actual bid/ask spreads during market hours.',
    color: 'blue',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: 'Zero Risk',
    desc: 'Every account starts with $10,000 virtual cash. No real money, no stress — pure learning.',
    color: 'green',
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: 'Market & Limit Orders',
    desc: 'Place market orders that fill instantly or set limit orders that trigger automatically on price.',
    color: 'yellow',
  },
  {
    icon: <BarChart2 className="w-5 h-5" />,
    title: 'Portfolio Analytics',
    desc: 'Track P&L, allocation, performance history, and compare against the global leaderboard.',
    color: 'purple',
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: 'Any Stock, Anywhere',
    desc: 'Search and trade any publicly listed US stock — NASDAQ, NYSE, and beyond.',
    color: 'orange',
  },
  {
    icon: <Trophy className="w-5 h-5" />,
    title: 'Global Leaderboard',
    desc: 'Compete with traders worldwide. Climb the ranks and prove your strategy works.',
    color: 'red',
  },
  {
    icon: <BarChart2 className="w-5 h-5" />,
    title: 'Options Trading',
    desc: 'Trade CALL & PUT options with Black-Scholes pricing. Buy and sell contracts across hundreds of stocks.',
    color: 'purple',
  },
  {
    icon: <Medal className="w-5 h-5" />,
    title: 'Monthly Tournaments',
    desc: 'Enter for $1.99 and compete with a fresh $20K balance. The best portfolio every month wins the crown.',
    color: 'yellow',
  },
]

const FEATURE_COLORS: Record<string, string> = {
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  green: 'bg-green-500/15 text-green-400 border-green-500/20',
  yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  purple: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  orange: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  red: 'bg-red-500/15 text-red-400 border-red-500/20',
}

export default function LandingPage() {
  const { data, isLoading } = useSWR<LeaderboardData>(
    '/api/leaderboard', fetcher, { refreshInterval: 30000 }
  )
  const { data: tournamentData } = useSWR('/api/tournaments/current', fetcher, { refreshInterval: 60000 })

  const leaderboard = data?.leaderboard ?? []
  const richest = data?.richest ?? null
  const stats = data?.stats
  const previousWinner = tournamentData?.previousWinner ?? null

  async function handleShareWinner(winner: { name: string; finalBalance: number | null; returnPct: string; certificateUrl: string; month: string }) {
    const certUrl = `${window.location.origin}${winner.certificateUrl}`
    const text = `${winner.name} won the FauxFolio ${winner.month} Tournament with a ${winner.returnPct}% return!`
    if (navigator.share) {
      navigator.share({ title: 'FauxFolio Tournament Champion', text, url: certUrl }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(certUrl)
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark text-white">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-brand-dark/80 backdrop-blur-md border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-black" />
            </div>
            <span className="font-bold text-lg">FauxFolio</span>
            <span className="hidden sm:inline text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-md font-medium">PAPER</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/learn" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-2 hidden sm:block">
              Learn
            </Link>
            <Link href="/login" className="text-sm text-gray-300 hover:text-white transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link href="/register" className="text-sm bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2 rounded-xl transition-colors">
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* Ticker */}
      <TickerTape />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-6 text-center">
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 text-green-400 text-sm font-medium mb-6">
          <Circle className="w-2 h-2 fill-green-400" />
          Live paper trading simulator
        </div>

        <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 leading-none">
          Trade Stocks{' '}
          <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
            Like a Pro
          </span>
          <br />
          <span className="text-gray-400 text-4xl sm:text-6xl font-bold">Without the Risk</span>
        </h1>

        <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Get <span className="text-white font-semibold">$10,000 virtual cash</span> and trade real stocks at live market prices.
          Learn investing, test strategies, and compete globally.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link
            href="/register"
            className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-bold px-8 py-4 rounded-2xl text-lg transition-all hover:scale-105 shadow-lg shadow-green-500/20"
          >
            Start Trading Free
            <ArrowUpRight className="w-5 h-5" />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 border border-brand-border hover:border-gray-500 text-gray-300 hover:text-white px-8 py-4 rounded-2xl text-lg transition-colors"
          >
            Sign In
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Live stats bar */}
        <div className="inline-flex flex-wrap justify-center gap-8 bg-brand-surface border border-brand-border rounded-2xl px-8 py-5">
          {[
            { label: 'Virtual Cash / Account', value: '$10,000', highlight: true },
            { label: 'Global Traders', value: stats ? stats.totalTraders.toLocaleString() : '—' },
            { label: 'US Stocks Available', value: '8,000+' },
            { label: 'Cost to Start', value: 'Free' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={cn('text-2xl font-black', s.highlight ? 'text-green-400' : 'text-white')}>
                {s.value}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboard */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3 text-yellow-400">
            <Trophy className="w-5 h-5 fill-yellow-400" />
            <span className="text-sm font-semibold uppercase tracking-widest">Global Rankings</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black mb-3">Top 10 Folios Worldwide</h2>
          <p className="text-gray-400">Ranked by total return % on starting investment</p>
        </div>

        {/* Top 3 podium */}
        {!isLoading && leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-6 max-w-2xl mx-auto">
            {[leaderboard[1], leaderboard[0], leaderboard[2]].map((entry, podiumPos) => {
              const isCenter = podiumPos === 1
              const origRank = isCenter ? 0 : podiumPos === 0 ? 1 : 2
              return (
                <div
                  key={entry.rank}
                  className={cn(
                    'card flex flex-col items-center text-center p-4 transition-all',
                    isCenter ? 'ring-2 ring-yellow-500/40 scale-105 bg-yellow-500/5' : ''
                  )}
                >
                  <div className="text-3xl mb-2">{RANK_LABELS[origRank]}</div>
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center text-lg font-black ring-2 mb-2 bg-gradient-to-br',
                    RANK_COLORS[origRank], RANK_RING[origRank]
                  )}>
                    {entry.name.charAt(0)}
                  </div>
                  <div className="text-sm font-bold mb-1 truncate w-full">{entry.name}</div>
                  <div className="text-xs text-gray-500 mb-2">{formatCurrency(entry.totalValue)}</div>
                  <div className={cn(
                    'text-sm font-black px-2 py-0.5 rounded-lg',
                    entry.totalReturnPct >= 0
                      ? 'text-green-400 bg-green-500/15'
                      : 'text-red-400 bg-red-500/15'
                  )}>
                    {entry.totalReturnPct >= 0 ? '+' : ''}{entry.totalReturnPct.toFixed(1)}%
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Full table */}
        <div className="card overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="font-semibold">Leaderboard</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <Circle className="w-1.5 h-1.5 fill-green-400" />
              Updates every 30s
            </div>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>Be the first on the leaderboard!</p>
              <Link href="/register" className="text-green-400 hover:text-green-300 text-sm mt-2 inline-block">
                Create account →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-brand-border">
              {leaderboard.map((entry, i) => {
                const isTop3 = entry.rank <= 3
                return (
                  <div
                    key={entry.id ?? i}
                    className={cn(
                      'flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/2',
                      isTop3 ? 'bg-white/[0.02]' : ''
                    )}
                  >
                    {/* Rank */}
                    <div className="w-8 flex-shrink-0 text-center">
                      {entry.rank <= 3 ? (
                        <span className="text-xl">{RANK_LABELS[entry.rank - 1]}</span>
                      ) : (
                        <span className={cn(
                          'text-sm font-bold',
                          entry.rank <= 5 ? 'text-gray-300' : 'text-gray-600'
                        )}>
                          {entry.rank}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0',
                      isTop3
                        ? `bg-gradient-to-br ${RANK_COLORS[entry.rank - 1]} text-black`
                        : 'bg-white/10 text-white'
                    )}>
                      {entry.name.charAt(0)}
                    </div>

                    {/* Name + joined */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm flex items-center gap-2">
                        {entry.name}
                        {entry.rank === 1 && (
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        )}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {daysAgo(entry.joinedAt)}
                      </div>
                    </div>

                    {/* Portfolio value */}
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-semibold">{formatCurrency(entry.totalValue)}</div>
                      <div className="text-xs text-gray-500">portfolio value</div>
                    </div>

                    {/* Return */}
                    <div className="text-right w-24 flex-shrink-0">
                      <div className={cn(
                        'text-sm font-black',
                        entry.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {entry.totalReturn >= 0 ? '+' : ''}{formatPercent(entry.totalReturnPct, false)}
                      </div>
                      <div className={cn(
                        'text-xs font-medium',
                        entry.totalReturn >= 0 ? 'text-green-400/70' : 'text-red-400/70'
                      )}>
                        {entry.totalReturn >= 0 ? '+' : ''}{formatCurrency(Math.abs(entry.totalReturn))}
                      </div>
                    </div>

                    {/* Bar indicator */}
                    <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden hidden md:block">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          entry.totalReturn >= 0 ? 'bg-green-500' : 'bg-red-500'
                        )}
                        style={{
                          width: `${Math.min(Math.abs(entry.totalReturnPct) / 50 * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* CTA at bottom of table */}
          <div className="px-5 py-4 border-t border-brand-border bg-green-500/5 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Think you can beat them?
            </p>
            <Link
              href="/register"
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
            >
              Join the competition
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* World's Richest banner */}
      {richest && (
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
          <div className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-yellow-500/10 px-6 py-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <Crown className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-yellow-500/80 mb-0.5">
                🎉 Congratulations — FauxFolio&apos;s World&apos;s Richest Trader
              </p>
              <p className="text-lg font-black text-white truncate">{richest.name}</p>
              <p className="text-sm text-yellow-200/60 mt-0.5">
                Portfolio value: <span className="font-bold text-yellow-300">{formatCurrency(richest.totalValue)}</span>
                <span className="mx-2 text-yellow-500/40">·</span>
                Return: <span className={cn('font-bold', richest.totalReturnPct >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {richest.totalReturnPct >= 0 ? '+' : ''}{richest.totalReturnPct.toFixed(1)}%
                </span>
              </p>
            </div>
            <Link
              href="/register"
              className="flex-shrink-0 flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm px-4 py-2.5 rounded-xl transition-colors"
            >
              Beat them <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* Tournament Winner Banner */}
      {previousWinner && (
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
          <div className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-yellow-500/10 px-6 py-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <Medal className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-yellow-500/80 mb-0.5">
                🏆 {previousWinner.month} Tournament Champion
              </p>
              <p className="text-lg font-black text-white truncate">{previousWinner.name}</p>
              <p className="text-sm text-yellow-200/60 mt-0.5">
                Final balance: <span className="font-bold text-yellow-300">{previousWinner.finalBalance != null ? formatCurrency(previousWinner.finalBalance) : '—'}</span>
                <span className="mx-2 text-yellow-500/40">·</span>
                Return: <span className="font-bold text-green-400">+{previousWinner.returnPct}%</span>
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <a
                href={previousWinner.certificateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 font-semibold text-sm px-3 py-2 rounded-xl transition-colors"
              >
                Certificate
              </a>
              <button
                onClick={() => handleShareWinner(previousWinner)}
                className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm px-3 py-2 rounded-xl transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="bg-brand-surface border-y border-brand-border py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">Everything you need to learn trading</h2>
            <p className="text-gray-400 text-lg">A complete simulator that mirrors real market mechanics</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-brand-dark border border-brand-border rounded-2xl p-5 hover:border-gray-600 transition-colors">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border mb-4', FEATURE_COLORS[f.color])}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-base mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center">
        <h2 className="text-4xl sm:text-5xl font-black mb-5">
          Ready to start trading?
        </h2>
        <p className="text-gray-400 text-xl mb-10">
          Sign up in 30 seconds. No credit card required.
          <br />Start with $10,000 virtual cash instantly.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black px-10 py-5 rounded-2xl text-xl transition-all hover:scale-105 shadow-xl shadow-green-500/20"
        >
          Get Started Free
          <ArrowUpRight className="w-6 h-6" />
        </Link>
        <p className="text-gray-600 text-sm mt-5">
          Already trading?{' '}
          <Link href="/login" className="text-gray-400 hover:text-white underline underline-offset-2">
            Sign in here
          </Link>
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-brand-border bg-brand-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-green-500 rounded-md flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="font-bold text-sm">FauxFolio</span>
          </div>
          <p className="text-xs text-gray-600 text-center max-w-lg leading-relaxed">
            ⚠️ FauxFolio is a simulated paper trading environment for educational purposes only.
            All trades use virtual money with no real monetary value. Not affiliated with any brokerage.
            Past simulated performance does not indicate real investment results.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <Link href="/login" className="hover:text-gray-400">Login</Link>
            <Link href="/register" className="hover:text-gray-400">Register</Link>
            <Link href="/privacy" className="hover:text-gray-400">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function daysAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Joined today'
  if (days === 1) return 'Joined yesterday'
  return `Joined ${days} days ago`
}
