'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Star, Plus, X, Search } from 'lucide-react'
import { cn, formatCurrency, formatPercent, getChangeColor } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { WatchlistItem, Stock } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function WatchlistPage() {
  const [adding, setAdding] = useState(false)
  const [addSymbol, setAddSymbol] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [stockSuggestions, setStockSuggestions] = useState<Stock[]>([])

  const { data, mutate, isLoading } = useSWR<{ watchlist: WatchlistItem[] }>(
    '/api/watchlist', fetcher, { refreshInterval: 4000 }
  )

  const watchlist = data?.watchlist ?? []

  async function searchStocks(q: string) {
    setAddSymbol(q)
    if (q.length < 1) { setStockSuggestions([]); return }
    const res = await fetch('/api/stocks')
    const d = await res.json()
    setStockSuggestions(
      (d.stocks || [])
        .filter((s: Stock) =>
          s.symbol.toLowerCase().includes(q.toLowerCase()) ||
          s.name.toLowerCase().includes(q.toLowerCase())
        )
        .slice(0, 6)
    )
  }

  async function addToWatchlist(symbol: string) {
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol }),
    })
    const d = await res.json()
    if (!res.ok) {
      toast.error(d.error || 'Failed to add')
      return
    }
    toast.success(`Added ${symbol} to watchlist`)
    mutate()
    setAdding(false)
    setAddSymbol('')
    setStockSuggestions([])
  }

  async function removeFromWatchlist(symbol: string) {
    await fetch(`/api/watchlist/${symbol}`, { method: 'DELETE' })
    toast.success(`Removed ${symbol}`)
    mutate()
  }

  const filtered = watchlist.filter(item => {
    const q = searchQuery.toLowerCase()
    return !q || item.stockSymbol.toLowerCase().includes(q) || item.stock.name.toLowerCase().includes(q)
  })

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            Watchlist
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{watchlist.length} stocks tracked</p>
        </div>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-black rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Stock
        </button>
      </div>

      {/* Add stock panel */}
      {adding && (
        <div className="card p-4 mb-5 animate-slide-up">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={addSymbol}
              onChange={e => searchStocks(e.target.value)}
              placeholder="Search by symbol or company name..."
              autoFocus
              className="w-full bg-white/5 border border-brand-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-green-500/50 placeholder-gray-600"
            />
          </div>
          {stockSuggestions.length > 0 && (
            <div className="mt-2 space-y-1">
              {stockSuggestions.map(s => (
                <button
                  key={s.symbol}
                  onClick={() => addToWatchlist(s.symbol)}
                  className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-xs font-bold">
                      {s.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{s.symbol}</div>
                      <div className="text-xs text-gray-500">{s.name}</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium">{formatCurrency(s.currentPrice)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search filter */}
      {watchlist.length > 5 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter watchlist..."
            className="w-full bg-white/5 border border-brand-border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-green-500/50 placeholder-gray-600"
          />
        </div>
      )}

      {/* Watchlist items */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card h-16 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          <Star className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="mb-2">Your watchlist is empty</p>
          <button
            onClick={() => setAdding(true)}
            className="text-green-400 hover:text-green-300 text-sm"
          >
            Add your first stock
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const change = item.stock.currentPrice - item.stock.previousClose
            const changePercent = (change / item.stock.previousClose) * 100
            return (
              <div key={item.stockSymbol} className="card p-4 flex items-center gap-4 hover:border-gray-600 transition-colors">
                <Link
                  href={`/stock/${item.stockSymbol}`}
                  className="flex items-center gap-4 flex-1 min-w-0"
                >
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {item.stockSymbol.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold">{item.stockSymbol}</span>
                      <span className="text-xs text-gray-500 truncate hidden sm:inline">{item.stock.name}</span>
                    </div>
                    <div className="text-xs text-gray-500">{item.stock.sector}</div>
                  </div>
                </Link>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold text-sm">{formatCurrency(item.stock.currentPrice)}</div>
                    <div className={cn(
                      'text-xs px-2 py-0.5 rounded-md font-medium',
                      changePercent >= 0
                        ? 'bg-green-500/15 text-green-400'
                        : 'bg-red-500/15 text-red-400'
                    )}>
                      {formatPercent(changePercent)}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromWatchlist(item.stockSymbol)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
