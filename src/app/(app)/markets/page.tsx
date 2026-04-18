'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Search, Circle, ExternalLink } from 'lucide-react'
import { cn, formatCurrency, formatPercent, getChangeColor, formatLargeNumber } from '@/lib/utils'
import type { Stock } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const SECTORS = ['All', 'Technology', 'Financial', 'Healthcare', 'Consumer Cyclical', 'Consumer Defensive', 'Energy', 'Communication', 'ETF', 'Unknown']

export default function MarketsPage() {
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('All')
  const [sortKey, setSortKey] = useState<'symbol' | 'currentPrice' | 'changePercent' | 'marketCap'>('symbol')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string; inDb: boolean; currentPrice?: number; changePercent?: number }>>([])
  const [searching, setSearching] = useState(false)

  const { data, isLoading } = useSWR<{ stocks: Stock[]; marketOpen: boolean }>(
    '/api/stocks', fetcher, { refreshInterval: 8000 }
  )

  const stocks = (data?.stocks ?? []).map(s => ({
    ...s,
    change: s.currentPrice - s.previousClose,
    changePercent: ((s.currentPrice - s.previousClose) / s.previousClose) * 100,
  }))

  async function doSearch(q: string) {
    setSearch(q)
    if (q.length < 2) { setSearchResults([]); setSearching(false); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`)
      const d = await res.json()
      setSearchResults(d.results ?? [])
    } finally {
      setSearching(false)
    }
  }

  const filtered = stocks
    .filter(s => {
      if (search) return true // search handled below
      const matchSector = sector === 'All' || s.sector === sector
      return matchSector
    })
    .sort((a, b) => {
      const mult = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'symbol') return mult * a.symbol.localeCompare(b.symbol)
      if (sortKey === 'changePercent') return mult * ((a.changePercent ?? 0) - (b.changePercent ?? 0))
      if (sortKey === 'marketCap') return mult * (Number(a.marketCap) - Number(b.marketCap))
      return mult * (a.currentPrice - b.currentPrice)
    })

  const displayStocks = search ? searchResults : filtered

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Markets</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
              data?.marketOpen ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
            )}>
              <Circle className={cn('w-1.5 h-1.5 fill-current', data?.marketOpen ? 'text-green-400' : 'text-gray-500')} />
              {data?.marketOpen ? 'Live prices' : 'Market closed · simulated'}
            </span>
          </div>
        </div>
        <span className="text-sm text-gray-500">{displayStocks.length} stocks</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
          )}
          <input
            value={search}
            onChange={e => doSearch(e.target.value)}
            placeholder="Search any stock (AAPL, Tesla, etc.)..."
            className="w-full bg-white/5 border border-brand-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-green-500/50 placeholder-gray-600"
          />
        </div>
        {!search && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SECTORS.filter(s => s !== 'Unknown').map(s => (
              <button key={s} onClick={() => setSector(s)}
                className={cn(
                  'whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex-shrink-0',
                  sector === s
                    ? 'border-green-500/40 bg-green-500/10 text-green-400'
                    : 'border-brand-border text-gray-500 hover:text-white hover:border-gray-500'
                )}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-brand-border">
                <SortHeader label="Symbol" sortKey="symbol" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="text-left px-5 py-3 hidden md:table-cell">Sector</th>
                <SortHeader label="Price" sortKey="currentPrice" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                <SortHeader label="Change" sortKey="changePercent" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                <SortHeader label="Mkt Cap" sortKey="marketCap" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" className="hidden lg:table-cell" />
                <th className="text-right px-5 py-3 hidden sm:table-cell">Volume</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && !search
                ? [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-t border-brand-border">
                      <td colSpan={6} className="px-5 py-3">
                        <div className="h-8 bg-white/5 rounded-lg animate-pulse" />
                      </td>
                    </tr>
                  ))
                : displayStocks.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-500 text-sm">
                      No results{search ? ` for "${search}"` : ''}
                    </td></tr>
                  )
                : displayStocks.map((stock: any) => {
                    const change = stock.change ?? 0
                    const changePct = stock.changePercent ?? 0
                    const price = stock.currentPrice ?? 0
                    const isNew = !stock.inDb && stock.inDb !== undefined
                    return (
                      <tr key={stock.symbol} className="border-t border-brand-border hover:bg-white/2 transition-colors">
                        <td className="px-5 py-3.5">
                          <Link href={`/stock/${stock.symbol}`} className="flex items-center gap-3 hover:opacity-80">
                            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {stock.symbol.slice(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold">{stock.symbol}</span>
                                {isNew && <ExternalLink className="w-3 h-3 text-blue-400" />}
                              </div>
                              <div className="text-xs text-gray-500 hidden sm:block max-w-[140px] truncate">{stock.name}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-500 hidden md:table-cell">{stock.sector || '—'}</td>
                        <td className="px-5 py-3.5 text-right text-sm font-medium">
                          {price > 0 ? formatCurrency(price) : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {price > 0 ? (
                            <div className={cn('inline-flex flex-col items-end', getChangeColor(changePct))}>
                              <span className="text-xs font-medium">{formatPercent(changePct)}</span>
                              <span className="text-xs opacity-70">{change >= 0 ? '+' : ''}{change.toFixed(2)}</span>
                            </div>
                          ) : <span className="text-gray-600 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right text-xs text-gray-400 hidden lg:table-cell">
                          {stock.marketCap > 0 ? formatLargeNumber(stock.marketCap) : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right text-xs text-gray-500 hidden sm:table-cell">
                          {stock.volume > 0 ? `${(stock.volume / 1e6).toFixed(1)}M` : '—'}
                        </td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SortHeader({ label, sortKey, current, dir, onSort, align = 'left', className = '' }: {
  label: string; sortKey: string; current: string; dir: 'asc' | 'desc';
  onSort: (k: any) => void; align?: 'left' | 'right'; className?: string;
}) {
  const active = current === sortKey
  return (
    <th className={cn('px-5 py-3 cursor-pointer select-none hover:text-white transition-colors',
      align === 'right' ? 'text-right' : 'text-left', active ? 'text-white' : '', className)}
      onClick={() => onSort(sortKey)}>
      {label} {active ? (dir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )
}
