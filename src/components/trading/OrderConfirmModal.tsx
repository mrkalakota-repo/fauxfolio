'use client'

import { cn, formatCurrency } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  side: 'BUY' | 'SELL'
  type: 'MARKET' | 'LIMIT'
  symbol: string
  shares: number
  price: number
  total: number
}

export default function OrderConfirmModal({
  open, onClose, onConfirm, side, type, symbol, shares, price, total,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative card w-full max-w-sm p-6 animate-slide-up">
        <h3 className="text-lg font-bold mb-1">Confirm Order</h3>
        <p className="text-gray-500 text-sm mb-5">
          Review your {type.toLowerCase()} order before submitting
        </p>

        <div className="space-y-3 mb-6">
          <Row label="Action" value={
            <span className={cn(
              'font-semibold px-2 py-0.5 rounded-md text-sm',
              side === 'BUY' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
            )}>
              {side}
            </span>
          } />
          <Row label="Symbol" value={<span className="font-semibold">{symbol}</span>} />
          <Row label="Shares" value={shares} />
          <Row label="Order Type" value={type} />
          <Row
            label={type === 'MARKET' ? 'Market Price' : 'Limit Price'}
            value={formatCurrency(price)}
          />
          <div className="border-t border-brand-border pt-3">
            <Row
              label="Estimated Total"
              value={<span className="font-bold text-base">{formatCurrency(total)}</span>}
            />
          </div>
        </div>

        <p className="text-xs text-yellow-400/70 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-5">
          ⚠️ This is a simulated paper trade. No real money will be used.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-brand-border hover:border-gray-500 rounded-xl text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'flex-1 py-3 rounded-xl text-sm font-semibold transition-colors',
              side === 'BUY'
                ? 'bg-green-500 hover:bg-green-400 text-black'
                : 'bg-red-500 hover:bg-red-400 text-white'
            )}
          >
            Confirm {side === 'BUY' ? 'Buy' : 'Sell'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  )
}
