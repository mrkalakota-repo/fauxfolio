'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { useParams } from 'next/navigation'
import { ArrowLeft, Star, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { cn, formatCurrency, formatPercent, formatChange, formatLargeNumber, formatNumber } from '@/lib/utils'
import StockChart from '@/components/charts/StockChart'
import TradingPanel from '@/components/trading/TradingPanel'
import OptionsPanel from '@/components/trading/OptionsPanel'
import GetMoreCashModal from '@/components/GetMoreCashModal'
import toast from 'react-hot-toast'
import type { Stock, PricePoint, TimeRange, WatchlistItem } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const TIME_RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL']

export default function StockPage() {
  const { symbol } = useParams<{ symbol: string }>()
  const [range, setRange] = useState<TimeRange>('1D')
  const [rightTab, setRightTab] = useState<'trade' | 'options'>('trade')
  const [showTopUp, setShowTopUp] = useState(false)
  const [inWatchlist, setInWatchlist] = useState(false)
  const prevPrice = useRef<number | null>(null)
  const [priceFlash, setPriceFlash] = useState('')

  const { data: stockData, isLoading: stockLoading } = useSWR<{ stock: Stock; error?: string }>(
    `/api/stocks/${symbol}`, fetcher, { refreshInterval: 4000 }
  )
  const { data: historyData, isLoading: histLoading } = useSWR<{ history: PricePoint[] }>(
    `/api/stocks/${symbol}/history?range=${range}`, fetcher, { refreshInterval: 8000 }
  )
  const { data: watchlistData, mutate: mutateWatchlist } = useSWR<{ watchlist: WatchlistItem[] }>(
    '/api/watchlist', fetcher
  )
  const { data: portfolioData } = useSWR('/api/portfolio', fetcher, { refreshInterval: 8000 })

  const stock = stockData?.stock
  const history = historyData?.history ?? []

  useEffect(() => {
    if (!stock || prevPrice.current === null) {
      prevPrice.current = stock?.currentPrice ?? null
      return
    }
    if (stock.currentPrice !== prevPrice.current) {
      const cls = stock.currentPrice > prevPrice.current! ? 'flash-green' : 'flash-red'
      setPriceFlash(cls)
      prevPrice.current = stock.currentPrice
      const t = setTimeout(() => setPriceFlash(''), 600)
      return () => clearTimeout(t)
    }
  }, [stock?.currentPrice])

  useEffect(() => {
    if (watchlistData?.watchlist) {
      setInWatchlist(watchlistData.watchlist.some(w => w.stockSymbol === symbol?.toUpperCase()))
    }
  }, [watchlistData, symbol])

  async function toggleWatchlist() {
    if (inWatchlist) {
      await fetch(`/api/watchlist/${symbol}`, { method: 'DELETE' })
      setInWatchlist(false)
      mutateWatchlist()
      toast.success(`Removed ${symbol} from watchlist`)
    } else {
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      })
      setInWatchlist(true)
      mutateWatchlist()
      toast.success(`Added ${symbol} to watchlist`)
    }
  }

  const change = stock ? stock.currentPrice - stock.previousClose : 0
  const changePercent = stock ? (change / stock.previousClose) * 100 : 0
  const isPositive = change >= 0

  const holding = portfolioData?.holdings?.find(
    (h: { stockSymbol: string }) => h.stockSymbol === symbol?.toUpperCase()
  )
  const cashBalance = portfolioData?.user?.cashBalance ?? 0
  const totalTopUps = portfolioData?.user?.totalTopUps ?? 0

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <Link
        href="/markets"
        className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Markets
      </Link>

      {!stock && stockData?.error ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">Stock not found</p>
          <p className="text-gray-500 text-sm mt-2">The symbol <span className="font-mono">{symbol}</span> does not exist or is invalid.</p>
        </div>
      ) : !stock ? (
        <StockSkeleton />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: chart + info */}
          <div className="xl:col-span-2 space-y-4">
            {/* Header */}
            <div className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-lg font-bold">
                    {symbol?.slice(0, 2)}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">{stock.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-400 text-sm">{stock.symbol}</span>
                      <span className="w-1 h-1 bg-gray-600 rounded-full" />
                      <span className="text-xs bg-white/5 px-2 py-0.5 rounded-md text-gray-400">
                        {stock.sector}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={toggleWatchlist}
                  data-testid="watchlist-toggle"
                  aria-label={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                  className={cn(
                    'p-2.5 rounded-xl border transition-all',
                    inWatchlist
                      ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                      : 'border-brand-border hover:border-yellow-500/30 text-gray-400 hover:text-yellow-400'
                  )}
                >
                  {inWatchlist
                    ? <Star className="w-4 h-4 fill-current" />
                    : <Star className="w-4 h-4" />}
                </button>
              </div>

              {/* Price */}
              <div className={cn('flex items-baseline gap-3', priceFlash)}>
                <span className="text-4xl font-bold">{formatCurrency(stock.currentPrice)}</span>
                <div className="flex items-center gap-1.5">
                  {isPositive
                    ? <TrendingUp className="w-4 h-4 text-green-400" />
                    : <TrendingDown className="w-4 h-4 text-red-400" />}
                  <span className={cn('text-lg font-semibold', isPositive ? 'text-green-400' : 'text-red-400')}>
                    {formatChange(change)} ({formatPercent(changePercent)})
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Today vs. previous close</p>
            </div>

            {/* Chart */}
            <div className="card p-5">
              <div className="flex items-center gap-1 mb-4">
                {TIME_RANGES.map(r => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      range === r
                        ? 'bg-green-500/15 text-green-400'
                        : 'text-gray-500 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <StockChart
                data={history}
                loading={histLoading}
                positive={isPositive}
                symbol={stock.symbol}
              />
            </div>

            {/* Stats */}
            <div className="card p-5">
              <h3 className="font-semibold mb-4">Key Statistics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Stat label="Open" value={formatCurrency(stock.openPrice)} />
                <Stat label="Prev Close" value={formatCurrency(stock.previousClose)} />
                <Stat label="Day High" value={formatCurrency(stock.dayHigh)} />
                <Stat label="Day Low" value={formatCurrency(stock.dayLow)} />
                <Stat label="Volume" value={formatNumber(Number(stock.volume))} />
                <Stat label="Market Cap" value={formatLargeNumber(Number(stock.marketCap))} />
              </div>
            </div>

            {/* About */}
            {stock.description && (
              <div className="card p-5">
                <h3 className="font-semibold mb-3">About {stock.name}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{stock.description}</p>
              </div>
            )}
          </div>

          {/* Right: trade / options tabs */}
          <div className="space-y-3">
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
              {(['trade', 'options'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize',
                    rightTab === tab ? 'bg-brand-surface text-white shadow' : 'text-gray-500 hover:text-white'
                  )}
                >
                  {tab === 'trade' ? 'Trade Stocks' : 'Options'}
                </button>
              ))}
            </div>

            {rightTab === 'trade' ? (
              <TradingPanel
                stock={stock}
                cashBalance={cashBalance}
                holding={holding}
                onOrderPlaced={() => {}}
              />
            ) : (
              <OptionsPanel
                symbol={stock.symbol}
                currentPrice={stock.currentPrice}
                totalTopUps={totalTopUps}
                cashBalance={cashBalance}
                onNeedUpgrade={() => setShowTopUp(true)}
              />
            )}
          </div>
        </div>
      )}
      <GetMoreCashModal
        open={showTopUp}
        onClose={() => setShowTopUp(false)}
        currentBalance={cashBalance}
      />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  )
}

function StockSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="card p-5 h-36 bg-white/5" />
      <div className="card p-5 h-64 bg-white/5" />
    </div>
  )
}
