'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
  TrendingUp, LayoutDashboard, Briefcase, Star, ClipboardList,
  Search, LogOut, ChevronRight, AlertCircle, Menu, BarChart2,
  Wallet, Circle, Loader2, BookOpen, Zap, Medal,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import SimulationTicker from '@/components/SimulationTicker'
import GetMoreCashModal from '@/components/GetMoreCashModal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/portfolio',    label: 'Portfolio',    icon: Briefcase },
  { href: '/watchlist',    label: 'Watchlist',    icon: Star },
  { href: '/markets',      label: 'Markets',      icon: BarChart2 },
  { href: '/orders',       label: 'Orders',       icon: ClipboardList },
  { href: '/tournaments',  label: 'Tournaments',  icon: Medal },
]

const LOW_BALANCE_THRESHOLD = 500

export default function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode
  userName: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string; inDb?: boolean }>>([])
  const [showSearch, setShowSearch] = useState(false)
  const [showTopUp, setShowTopUp] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  const { data: portfolioData } = useSWR('/api/portfolio', fetcher, { refreshInterval: 15000 })
  const { data: tickData } = useSWR('/api/simulation/tick', fetcher, { refreshInterval: 0 })

  const cashBalance = portfolioData?.user?.cashBalance ?? 0
  const marketOpen = tickData?.marketOpen ?? false

  useEffect(() => { setMobileOpen(false) }, [pathname])

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (q.length < 1) { setSearchResults([]); return }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSearchResults(data.results ?? [])
    } catch { /* ignore */ } finally {
      setSearchLoading(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const isLowBalance = cashBalance < LOW_BALANCE_THRESHOLD

  // Defined as a plain function (not a component) so React never remounts it on state changes,
  // which would cause the search input to lose focus on every keystroke.
  const renderSidebar = () => (
    <aside className="flex flex-col h-full w-64 bg-brand-surface border-r border-brand-border px-4" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 1.25rem)' }}>
      {/* Logo + market status */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2 mb-8 flex-shrink-0">
        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-4 h-4 text-black" />
        </div>
        <span className="font-bold text-lg">FauxFolio</span>
        <span className={cn(
          'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium ml-auto',
          marketOpen ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
        )}>
          <Circle className={cn('w-1.5 h-1.5 fill-current', marketOpen ? 'text-green-400' : 'text-gray-500')} />
          {marketOpen ? 'LIVE' : 'SIM'}
        </span>
      </Link>

      {/* Scrollable middle content */}
      <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4">
        {/* Search any stock */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          {searchLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 animate-spin" />
          )}
          <input
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            placeholder="Search any stock..."
            className="w-full bg-white/5 border border-brand-border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-green-500/50 placeholder-gray-600 transition-colors"
          />
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-brand-surface border border-brand-border rounded-xl shadow-2xl z-50 overflow-hidden">
              {searchResults.map(s => (
                <Link
                  key={s.symbol}
                  href={`/stock/${s.symbol}`}
                  className="flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold">{s.symbol}</div>
                    <div className="text-xs text-gray-500 truncate max-w-[150px]">{s.name}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!s.inDb && (
                      <span className="text-xs text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">new</span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Trade CTA */}
        <Link
          href="/markets"
          className="flex items-center justify-center gap-2 mb-4 py-2.5 bg-green-500 hover:bg-green-400 text-black font-bold text-sm rounded-xl transition-colors"
        >
          <Zap className="w-4 h-4" />
          Trade Now
        </Link>

        {/* Nav */}
        <nav className="space-y-1">
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-green-500/15 text-green-400'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <item.icon className={cn('w-4 h-4', active ? 'text-green-400' : '')} />
                {item.label}
              </Link>
            )
          })}
          <Link
            href="/learn"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <BookOpen className="w-4 h-4" />
            Trading 101
          </Link>
        </nav>

        {/* Cash balance + top-up */}
        <div className={cn(
          'mt-4 p-3 rounded-xl border',
          isLowBalance
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-white/5 border-brand-border'
        )}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Wallet className={cn('w-3.5 h-3.5', isLowBalance ? 'text-red-400' : 'text-gray-400')} />
              <span className={cn('text-xs font-medium', isLowBalance ? 'text-red-400' : 'text-gray-400')}>
                {isLowBalance ? 'Low Balance!' : 'Buying Power'}
              </span>
            </div>
          </div>
          <div className={cn('text-base font-bold', isLowBalance ? 'text-red-400' : 'text-white')}>
            {formatCurrency(cashBalance)}
          </div>
          <button
            onClick={() => setShowTopUp(true)}
            className={cn(
              'w-full mt-2 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              isLowBalance
                ? 'bg-green-500 hover:bg-green-400 text-black'
                : 'bg-white/5 hover:bg-white/10 text-gray-300'
            )}
          >
            Get More Cash
          </button>
        </div>

        {/* Disclaimer */}
        <div className="mt-3 mb-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <div className="flex gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-200/70 leading-relaxed">
              <strong className="text-yellow-400">Paper Trading</strong> — virtual money only, no real transactions
            </p>
          </div>
        </div>
      </div>

      {/* User — always visible at bottom, never scrolls away */}
      <div className="flex-shrink-0 pt-3 border-t border-brand-border flex items-center justify-between" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1.25rem)' }}>
        <Link href="/profile" className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium leading-none truncate">{userName}</div>
            <div className="text-xs text-gray-500 mt-0.5">View profile</div>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          aria-label="Sign out"
          className="p-1.5 text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10 flex-shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:flex">
        {renderSidebar()}
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 h-full">
            {renderSidebar()}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-brand-surface border-b border-brand-border">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="font-bold">FauxFolio</span>
          </div>
          <button onClick={() => setShowTopUp(true)} className="text-green-400">
            <Wallet className="w-5 h-5" />
          </button>
        </header>

        <SimulationTicker />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <GetMoreCashModal
        open={showTopUp}
        onClose={() => setShowTopUp(false)}
        currentBalance={cashBalance}
      />
    </div>
  )
}
