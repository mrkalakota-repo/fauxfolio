'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Medal, Clock, Search, Loader2 } from 'lucide-react'
import { formatCurrency, formatPercent, cn } from '@/lib/utils'
import TournamentTradingPanel from '@/components/trading/TournamentTradingPanel'
import type { Stock } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function TournamentPlayPage() {
  const { id: tournamentId } = useParams<{ id: string }>()
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string }>>([])
  const [showSearch, setShowSearch] = useState(false)

  const { data: entryData, mutate: mutateEntry } = useSWR(
    `/api/tournaments/${tournamentId}/entry`,
    fetcher,
    { refreshInterval: 8000 }
  )
  const { data: stockData } = useSWR<{ stock: Stock }>(
    selectedSymbol ? `/api/stocks/${selectedSymbol}` : null,
    fetcher,
    { refreshInterval: 4000 }
  )

  const entry = entryData?.entry
  const holdings = entry?.holdings ?? []
  const orders = entry?.orders ?? []
  const cashBalance: number = entry?.cashBalance ?? 0
  const currentValue: number = entryData?.currentValue ?? cashBalance
  const returnPct: number = entryData?.returnPct ?? 0

  const selectedStock = stockData?.stock ?? null
  const selectedHolding = holdings.find((h: any) => h.stockSymbol === selectedSymbol)

  const daysLeft = entry?.tournament?.endsAt
    ? Math.max(0, Math.ceil((new Date(entry.tournament.endsAt).getTime() - Date.now()) / 86400000))
    : 0

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (q.length < 1) { setSearchResults([]); return }
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`)
      const d = await res.json()
      setSearchResults(d.results ?? [])
    } catch { /* ignore */ }
  }

  if (!entry) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/tournaments" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <Medal className="w-5 h-5 text-yellow-400" />
        <h1 className="font-bold text-lg">Tournament Trading</h1>
        <span className="text-xs text-gray-500 flex items-center gap-1 ml-auto">
          <Clock className="w-3.5 h-3.5" /> {daysLeft} days remaining
        </span>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Tournament Balance</p>
          <p className="text-lg font-bold">{formatCurrency(currentValue)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Cash Available</p>
          <p className="text-lg font-bold text-green-400">{formatCurrency(cashBalance)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Return vs $20K</p>
          <p className={`text-lg font-bold ${returnPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left: Holdings + Search */}
        <div className="xl:col-span-1 space-y-4">
          {/* Stock search */}
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-3">Find a Stock</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => setShowSearch(true)}
                onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                placeholder="Search stocks…"
                className="w-full bg-white/5 border border-brand-border rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-green-500 transition-colors"
              />
              {showSearch && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-brand-surface border border-brand-border rounded-xl shadow-xl z-20 overflow-hidden">
                  {searchResults.slice(0, 6).map(s => (
                    <button
                      key={s.symbol}
                      onMouseDown={() => { setSelectedSymbol(s.symbol); setSearchQuery(''); setSearchResults([]) }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/5 text-left transition-colors"
                    >
                      <span className="text-sm font-semibold">{s.symbol}</span>
                      <span className="text-xs text-gray-500 truncate">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tournament holdings */}
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-3">Holdings</h3>
            {holdings.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No positions yet</p>
            ) : (
              <div className="space-y-2">
                {holdings.map((h: any) => {
                  const value = h.shares * h.stock.currentPrice
                  const gain = value - h.shares * h.avgCost
                  return (
                    <button
                      key={h.id}
                      onClick={() => setSelectedSymbol(h.stockSymbol)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors hover:bg-white/5',
                        selectedSymbol === h.stockSymbol ? 'bg-white/5 border border-brand-border' : ''
                      )}
                    >
                      <div>
                        <p className="text-sm font-semibold">{h.stockSymbol}</p>
                        <p className="text-xs text-gray-400">{h.shares.toFixed(4)} shares</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(value)}</p>
                        <p className={`text-xs ${gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {gain >= 0 ? '+' : ''}{formatCurrency(gain)}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent orders */}
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-3">Recent Orders</h3>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No orders yet</p>
            ) : (
              <div className="space-y-2">
                {orders.slice(0, 10).map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between text-xs">
                    <span className={o.side === 'BUY' ? 'text-green-400' : 'text-red-400'}>
                      {o.side} {o.shares} {o.stockSymbol}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full ${
                      o.status === 'FILLED' ? 'bg-green-500/10 text-green-400' :
                      o.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>{o.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Chart + Trading Panel */}
        <div className="xl:col-span-2 space-y-4">
          {selectedStock ? (
            <>
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <h2 className="font-bold text-lg">{selectedStock.symbol}</h2>
                    <p className="text-sm text-gray-400">{selectedStock.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{formatCurrency(selectedStock.currentPrice)}</p>
                    <p className={`text-sm ${selectedStock.currentPrice >= selectedStock.previousClose ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedStock.currentPrice >= selectedStock.previousClose ? '+' : ''}
                      {formatCurrency(selectedStock.currentPrice - selectedStock.previousClose)} (
                      {((selectedStock.currentPrice - selectedStock.previousClose) / selectedStock.previousClose * 100).toFixed(2)}%)
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">Price: {formatCurrency(selectedStock.currentPrice)}</div>
              </div>

              <TournamentTradingPanel
                stock={selectedStock}
                tournamentId={tournamentId}
                cashBalance={cashBalance}
                holding={selectedHolding ? { shares: selectedHolding.shares, avgCost: selectedHolding.avgCost } : undefined}
                onOrderPlaced={mutateEntry}
              />
            </>
          ) : (
            <div className="card p-8 flex flex-col items-center justify-center text-center h-64">
              <TrendingUp className="w-12 h-12 text-gray-600 mb-3" />
              <p className="text-gray-400 font-medium">Search for a stock to start trading</p>
              <p className="text-sm text-gray-600 mt-1">Use the search box on the left to find any stock</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
