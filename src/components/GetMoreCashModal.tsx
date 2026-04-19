'use client'

import { useState } from 'react'
import { useSWRConfig } from 'swr'
import toast from 'react-hot-toast'
import { Wallet, TrendingUp, Loader2, X, Zap, Check } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CASH_PACKS, type CashPack } from './GetMoreCash.const'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  currentBalance: number
}

export default function GetMoreCashModal({ open, onClose, currentBalance }: Props) {
  const { mutate } = useSWRConfig()
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string>('booster')

  if (!open) return null

  const selected = CASH_PACKS.find(p => p.id === selectedId) ?? CASH_PACKS[1]

  async function handleTopUp() {
    setLoading(true)
    try {
      const res = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: selected.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to start checkout'); return }

      if (data.devMode) {
        toast.success(data.message)
        mutate('/api/portfolio')
        mutate('/api/auth/me')
        onClose()
        return
      }

      if (data.url) window.location.href = data.url
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-sm p-6 animate-slide-up">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
            <Wallet className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Get More Cash</h3>
            <p className="text-gray-400 text-sm">Continue your trading journey</p>
          </div>
        </div>

        {/* Current balance */}
        <div className="bg-white/5 rounded-xl p-3 mb-4 flex justify-between text-sm">
          <span className="text-gray-400">Current balance</span>
          <span className={currentBalance < 100 ? 'text-red-400 font-semibold' : ''}>
            {formatCurrency(currentBalance)}
          </span>
        </div>

        {/* Pack selector */}
        <div className="space-y-2 mb-5">
          {CASH_PACKS.map(pack => (
            <PackCard
              key={pack.id}
              pack={pack}
              selected={selectedId === pack.id}
              onSelect={() => setSelectedId(pack.id)}
            />
          ))}
        </div>

        <p className="text-xs text-yellow-400/70 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-5">
          ⚠️ Virtual cash has no real value and cannot be withdrawn. For educational trading simulation only.
        </p>

        <button
          onClick={handleTopUp}
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Get {formatCurrency(selected.virtualCash)} for {selected.priceDisplay}
        </button>

        <p className="text-xs text-center text-gray-600 mt-3">
          Secured by Stripe · No subscription
        </p>
      </div>
    </div>
  )
}

function PackCard({ pack, selected, onSelect }: { pack: CashPack; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center justify-between rounded-xl px-4 py-3 border transition-all text-left',
        selected
          ? 'bg-green-500/15 border-green-500/50'
          : 'bg-white/5 border-brand-border hover:border-white/20'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
          selected ? 'border-green-500 bg-green-500' : 'border-gray-600'
        )}>
          {selected && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-semibold', selected ? 'text-white' : 'text-gray-200')}>
              {pack.label}
            </span>
            {pack.badge && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded font-semibold',
                selected ? 'bg-green-500/30 text-green-300' : 'bg-white/10 text-gray-400'
              )}>
                {pack.badge}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400 font-medium">
              +{formatCurrency(pack.virtualCash)} virtual cash
            </span>
          </div>
        </div>
      </div>
      <span className={cn('text-base font-bold flex-shrink-0', selected ? 'text-white' : 'text-gray-300')}>
        {pack.priceDisplay}
      </span>
    </button>
  )
}
