'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { TrendingUp, TrendingDown, DollarSign, Wallet, Circle } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatPercent, formatChange, getChangeColor, cn } from '@/lib/utils'
import PortfolioChart from '@/components/charts/PortfolioChart'
import StockRow from '@/components/StockRow'
import BadgeStrip from '@/components/BadgeStrip'
import type { Portfolio, Stock } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const { data: portfolioData, isLoading: portLoading } = useSWR<Portfolio>(
    '/api/portfolio', fetcher, { refreshInterval: 8000 }
  )
  const { data: stocksData } = useSWR<{ stocks: Stock[]; marketOpen: boolean }>(
    '/api/stocks', fetcher, { refreshInterval: 8000 }
  )
  const { data: badgesData } = useSWR('/api/users/badges', fetcher)

  // Handle Stripe redirect result
  useEffect(() => {
    const topup = searchParams.get('topup')
    if (topup === 'success') toast.success('$10,000 virtual cash added to your account!')
    if (topup === 'cancelled') toast.error('Checkout cancelled — no charge made')
  }, [searchParams])

  const portfolio = portfolioData
  const stocks = stocksData?.stocks || []
  const marketOpen = stocksData?.marketOpen ?? false

  const topMovers = stocks
    .map(s => ({
      symbol: s.symbol, name: s.name, currentPrice: s.currentPrice,
      change: s.currentPrice - s.previousClose,
      changePercent: ((s.currentPrice - s.previousClose) / s.previousClose) * 100,
    }))
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))

  const gainers = topMovers.filter(m => m.changePercent > 0).slice(0, 5)
  const losers  = topMovers.filter(m => m.changePercent < 0).slice(0, 5)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Good {getGreeting()}, {portfolio?.user?.name?.split(' ')[0] ?? '—'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium',
              marketOpen ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
            )}>
              <Circle className={cn('w-1.5 h-1.5 fill-current', marketOpen ? 'text-green-400' : 'text-gray-500')} />
              {marketOpen ? 'Market Open — Live Prices' : 'Market Closed — Simulated Prices'}
            </span>
          </div>
        </div>
        <Link
          href="/markets"
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-brand-border rounded-xl text-sm transition-colors"
        >
          View All Stocks
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Portfolio Value" value={formatCurrency(portfolio?.totalValue ?? 0)}
          icon={<DollarSign className="w-4 h-4" />} loading={portLoading} accent />
        <StatCard title="Buying Power" value={formatCurrency(portfolio?.user?.cashBalance ?? 0)}
          icon={<Wallet className="w-4 h-4" />} loading={portLoading} />
        <StatCard
          title="Today's Gain"
          value={formatChange(portfolio?.dayChange ?? 0)}
          subtitle={formatPercent(portfolio?.dayChangePercent ?? 0)}
          icon={(portfolio?.dayChange ?? 0) >= 0
            ? <TrendingUp className="w-4 h-4" />
            : <TrendingDown className="w-4 h-4" />}
          loading={portLoading}
          valueColor={getChangeColor(portfolio?.dayChange ?? 0)}
        />
        <StatCard
          title="Total Return"
          value={formatChange(portfolio?.totalGainLoss ?? 0)}
          subtitle={formatPercent(portfolio?.totalGainLossPercent ?? 0)}
          icon={(portfolio?.totalGainLoss ?? 0) >= 0
            ? <TrendingUp className="w-4 h-4" />
            : <TrendingDown className="w-4 h-4" />}
          loading={portLoading}
          valueColor={getChangeColor(portfolio?.totalGainLoss ?? 0)}
        />
      </div>

      {/* Achievement Badges */}
      <div className="card p-5">
        <h2 className="font-semibold mb-3 text-sm text-gray-400 uppercase tracking-wider">Achievements</h2>
        <BadgeStrip badges={badgesData?.badges ?? []} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Portfolio chart */}
        <div className="xl:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Portfolio Performance</h2>
            <span className="text-xs text-gray-500">90 days</span>
          </div>
          <PortfolioChart data={portfolio?.portfolioHistory ?? []} loading={portLoading} />
        </div>

        {/* Holdings */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Holdings</h2>
            <Link href="/portfolio" className="text-xs text-green-400 hover:text-green-300">View all</Link>
          </div>
          {portLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : portfolio?.holdings.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <p>No holdings yet.</p>
              <Link href="/markets" className="text-green-400 hover:text-green-300 mt-1 inline-block">Browse markets →</Link>
            </div>
          ) : (
            <div className="space-y-1">
              {portfolio?.holdings.slice(0, 5).map(h => (
                <Link key={h.stockSymbol} href={`/stock/${h.stockSymbol}`}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-xs font-bold">
                      {h.stockSymbol.slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{h.stockSymbol}</div>
                      <div className="text-xs text-gray-500">{h.shares} shares</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{formatCurrency(h.currentValue ?? 0)}</div>
                    <div className={cn('text-xs', getChangeColor(h.gainLoss ?? 0))}>{formatChange(h.gainLoss ?? 0)}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top movers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" /> Top Gainers
          </h2>
          <div className="space-y-1">
            {gainers.map(s => <StockRow key={s.symbol} stock={s} />)}
            {gainers.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No gainers yet</p>}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-400" /> Top Losers
          </h2>
          <div className="space-y-1">
            {losers.map(s => <StockRow key={s.symbol} stock={s} />)}
            {losers.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No losers yet</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle, icon, loading, accent, valueColor }: {
  title: string; value: string; subtitle?: string; icon: React.ReactNode;
  loading?: boolean; accent?: boolean; valueColor?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</span>
        <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center',
          accent ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400')}>
          {icon}
        </span>
      </div>
      {loading ? (
        <div className="h-7 w-28 bg-white/5 rounded-lg animate-pulse" />
      ) : (
        <>
          <div className={cn('text-xl font-bold', valueColor)}>{value}</div>
          {subtitle && <div className={cn('text-xs mt-0.5', valueColor || 'text-gray-500')}>{subtitle}</div>}
        </>
      )}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
