'use client'

import { useState } from 'react'
import { useSWRConfig } from 'swr'
import toast from 'react-hot-toast'
import { Wallet, TrendingUp, Loader2, X, Zap } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { TOPUP_VIRTUAL_CASH } from './GetMoreCash.const'

interface Props {
  open: boolean
  onClose: () => void
  currentBalance: number
  totalTopUps: number
}

export default function GetMoreCashModal({ open, onClose, currentBalance, totalTopUps }: Props) {
  const { mutate } = useSWRConfig()
  const [loading, setLoading] = useState(false)

  if (!open) return null

  async function handleTopUp() {
    setLoading(true)
    try {
      const res = await fetch('/api/payments/create-checkout', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to start checkout'); return }

      if (data.devMode) {
        toast.success(data.message)
        mutate('/api/portfolio')
        mutate('/api/auth/me')
        onClose()
        return
      }

      // Stripe: redirect to checkout
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

        <div className="bg-white/5 rounded-xl p-4 mb-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Current balance</span>
            <span className={currentBalance < 100 ? 'text-red-400 font-semibold' : ''}>
              {formatCurrency(currentBalance)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Top-ups so far</span>
            <span>{totalTopUps}</span>
          </div>
        </div>

        {/* Offer card */}
        <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-400" />
              <span className="font-semibold text-green-400">Trading Pack</span>
            </div>
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Best value</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">$1</span>
            <span className="text-gray-400 text-sm">real money</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-semibold">
              +{formatCurrency(TOPUP_VIRTUAL_CASH)} virtual cash
            </span>
          </div>
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
          Get $10,000 for $1
        </button>

        <p className="text-xs text-center text-gray-600 mt-3">
          Secured by Stripe · Cancel anytime
        </p>
      </div>
    </div>
  )
}
