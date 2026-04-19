'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Contract {
  id: string
  optionType: string
  strikePrice: number
  expiresAt: string
  price: number
  delta: number
  gamma: number
  theta: number
  vega: number
}

interface Props {
  contract: Contract | null
  symbol: string
  currentPrice: number
  cashBalance: number
  onClose: () => void
  onSuccess: () => void
}

export default function OptionOrderModal({ contract, symbol, currentPrice, cashBalance, onClose, onSuccess }: Props) {
  const [numContracts, setNumContracts] = useState(1)
  const [loading, setLoading] = useState(false)

  if (!contract) return null

  const totalCost = contract.price * 100 * numContracts
  const canAfford = cashBalance >= totalCost
  const expiry = new Date(contract.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const itm = contract.optionType === 'CALL'
    ? currentPrice > contract.strikePrice
    : currentPrice < contract.strikePrice

  async function handleBuy() {
    setLoading(true)
    try {
      const res = await fetch('/api/options/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId: contract!.id, action: 'BUY', contracts: numContracts }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Trade failed')
        return
      }
      toast.success(data.message)
      onSuccess()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-brand-surface border border-brand-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg">Buy to Open</h2>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Contract</span>
            <span className="font-semibold">
              {symbol} {contract.strikePrice} {contract.optionType}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Expiry</span>
            <span>{expiry}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Moneyness</span>
            <span className={itm ? 'text-green-400' : 'text-gray-400'}>{itm ? 'ITM' : 'OTM'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Premium / share</span>
            <span>{formatCurrency(contract.price)}</span>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-brand-border text-xs text-center">
            <div><div className="text-gray-500">Δ Delta</div><div className="font-mono mt-0.5">{contract.delta.toFixed(2)}</div></div>
            <div><div className="text-gray-500">Γ Gamma</div><div className="font-mono mt-0.5">{contract.gamma.toFixed(4)}</div></div>
            <div><div className="text-gray-500">Θ Theta</div><div className="font-mono mt-0.5">{contract.theta.toFixed(3)}</div></div>
            <div><div className="text-gray-500">ν Vega</div><div className="font-mono mt-0.5">{contract.vega.toFixed(3)}</div></div>
          </div>
        </div>

        <div className="mb-5">
          <label className="text-sm text-gray-400 mb-2 block">Contracts (1 = 100 shares)</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNumContracts(Math.max(1, numContracts - 1))}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center font-bold"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={100}
              value={numContracts}
              onChange={e => setNumContracts(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              className="flex-1 bg-white/5 border border-brand-border rounded-xl px-3 py-2 text-center text-sm focus:outline-none focus:border-green-500"
            />
            <button
              onClick={() => setNumContracts(Math.min(100, numContracts + 1))}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center font-bold"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex justify-between text-sm font-semibold mb-4">
          <span className="text-gray-400">Total Cost</span>
          <span className={canAfford ? 'text-white' : 'text-red-400'}>{formatCurrency(totalCost)}</span>
        </div>

        {!canAfford && (
          <p className="text-xs text-red-400 mb-3 text-center">Insufficient buying power</p>
        )}

        <button
          onClick={handleBuy}
          disabled={loading || !canAfford}
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Buy {numContracts} Contract{numContracts !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  )
}
