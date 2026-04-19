'use client'

import { useState } from 'react'
import { useSWRConfig } from 'swr'
import toast from 'react-hot-toast'
import { cn, formatCurrency } from '@/lib/utils'
import { hapticSuccess, hapticError, hapticLight } from '@/hooks/useNative'
import type { Stock } from '@/types'
import OrderConfirmModal from './OrderConfirmModal'

interface Props {
  stock: Stock
  cashBalance: number
  holding?: { shares: number; avgCost: number }
  onOrderPlaced: () => void
}

type Side = 'BUY' | 'SELL'
type OrderType = 'MARKET' | 'LIMIT'

export default function TradingPanel({ stock, cashBalance, holding, onOrderPlaced }: Props) {
  const { mutate } = useSWRConfig()
  const [side, setSide] = useState<Side>('BUY')
  const [orderType, setOrderType] = useState<OrderType>('MARKET')
  const [shares, setShares] = useState('')
  const [limitPrice, setLimitPrice] = useState(stock.currentPrice.toFixed(2))
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const sharesNum = parseFloat(shares) || 0
  const limitNum = parseFloat(limitPrice) || stock.currentPrice
  const execPrice = orderType === 'MARKET' ? stock.currentPrice : limitNum
  const orderTotal = sharesNum * execPrice
  const maxSharesBuy = Math.floor(cashBalance / execPrice * 100) / 100
  const maxSharesSell = holding?.shares ?? 0

  function setMaxShares() {
    if (side === 'BUY') {
      setShares(maxSharesBuy.toFixed(4))
    } else {
      setShares(maxSharesSell.toFixed(4))
    }
  }

  function setFraction(fraction: number) {
    if (side === 'BUY') {
      setShares(((cashBalance / execPrice) * fraction).toFixed(4))
    } else {
      setShares((maxSharesSell * fraction).toFixed(4))
    }
  }

  async function handleSubmit() {
    if (sharesNum <= 0) { hapticError(); toast.error('Enter a valid number of shares'); return }
    if (side === 'SELL' && sharesNum > maxSharesSell) {
      hapticError(); toast.error(`You only own ${maxSharesSell} shares`); return
    }
    if (side === 'BUY' && orderType === 'MARKET' && orderTotal > cashBalance) {
      hapticError(); toast.error('Insufficient buying power'); return
    }
    hapticLight()
    setShowConfirm(true)
  }

  async function confirmOrder() {
    setSubmitting(true)
    setShowConfirm(false)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: stock.symbol,
          side,
          type: orderType,
          shares: sharesNum,
          limitPrice: orderType === 'LIMIT' ? limitNum : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        hapticError()
        toast.error(data.error || 'Order failed')
        return
      }
      hapticSuccess()
      toast.success(data.message || 'Order placed!')
      setShares('')
      mutate('/api/portfolio')
      mutate('/api/orders')
      onOrderPlaced()
    } catch {
      hapticError()
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="card p-5 sticky top-4">
        <h3 className="font-semibold mb-4">Trade {stock.symbol}</h3>

        {/* BUY / SELL tabs */}
        <div className="flex bg-white/5 rounded-xl p-1 mb-4">
          <button
            onClick={() => setSide('BUY')}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
              side === 'BUY'
                ? 'bg-green-500 text-black shadow-sm'
                : 'text-gray-400 hover:text-white'
            )}
          >
            Buy
          </button>
          <button
            onClick={() => setSide('SELL')}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
              side === 'SELL'
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            )}
          >
            Sell
          </button>
        </div>

        {/* Order type */}
        <div className="flex gap-2 mb-4">
          {(['MARKET', 'LIMIT'] as OrderType[]).map(t => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all',
                orderType === t
                  ? 'border-green-500/50 bg-green-500/10 text-green-400'
                  : 'border-brand-border text-gray-500 hover:text-white hover:border-gray-500'
              )}
            >
              {t.charAt(0) + t.slice(1).toLowerCase()} Order
            </button>
          ))}
        </div>

        {/* Market price display */}
        <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 mb-4">
          <span className="text-sm text-gray-400">Market Price</span>
          <span className="font-semibold">{formatCurrency(stock.currentPrice)}</span>
        </div>

        {/* Limit price input */}
        {orderType === 'LIMIT' && (
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1.5">Limit Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input
                type="number"
                value={limitPrice}
                onChange={e => setLimitPrice(e.target.value)}
                step="0.01"
                min="0.01"
                className="w-full bg-white/5 border border-brand-border rounded-xl pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Shares input */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="shares-input" className="text-sm text-gray-400">Shares</label>
            <button onClick={setMaxShares} className="text-xs text-green-400 hover:text-green-300">
              Max ({side === 'BUY' ? maxSharesBuy.toFixed(2) : maxSharesSell})
            </button>
          </div>
          <input
            id="shares-input"
            type="number"
            value={shares}
            onChange={e => setShares(e.target.value)}
            placeholder="0"
            step="1"
            min="0"
            className="w-full bg-white/5 border border-brand-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>

        {/* Quick fractions */}
        <div className="flex gap-1.5 mb-4">
          {[0.25, 0.5, 0.75, 1].map(f => (
            <button
              key={f}
              onClick={() => setFraction(f)}
              className="flex-1 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
            >
              {f === 1 ? 'Max' : `${f * 100}%`}
            </button>
          ))}
        </div>

        {/* Order summary */}
        {sharesNum > 0 && (
          <div className="bg-white/5 rounded-xl p-3 mb-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Shares</span>
              <span>{sharesNum}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Est. Price</span>
              <span>{formatCurrency(execPrice)}</span>
            </div>
            <div className="flex justify-between border-t border-brand-border pt-2">
              <span className="text-gray-400">Est. Total</span>
              <span className="font-semibold">{formatCurrency(orderTotal)}</span>
            </div>
          </div>
        )}

        {/* Buying power / holdings info */}
        <div className="flex justify-between text-xs text-gray-500 mb-4">
          {side === 'BUY' ? (
            <>
              <span>Buying power</span>
              <span>{formatCurrency(cashBalance)}</span>
            </>
          ) : (
            <>
              <span>Shares owned</span>
              <span>{holding?.shares ?? 0}</span>
            </>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !sharesNum}
          className={cn(
            'w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40',
            side === 'BUY'
              ? 'bg-green-500 hover:bg-green-400 text-black'
              : 'bg-red-500 hover:bg-red-400 text-white'
          )}
        >
          {submitting ? 'Placing...' : `Review ${side === 'BUY' ? 'Buy' : 'Sell'} Order`}
        </button>

        {/* Disclaimer */}
        <p className="text-xs text-center text-gray-600 mt-3">
          Simulated only — no real money
        </p>
      </div>

      <OrderConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmOrder}
        side={side}
        type={orderType}
        symbol={stock.symbol}
        shares={sharesNum}
        price={execPrice}
        total={orderTotal}
      />
    </>
  )
}
