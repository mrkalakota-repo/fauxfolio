'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { cn, formatCurrency } from '@/lib/utils'
import { hapticSuccess, hapticError, hapticLight } from '@/hooks/useNative'
import type { Stock } from '@/types'
import OrderConfirmModal from './OrderConfirmModal'

interface Props {
  stock: Stock
  tournamentId: string
  cashBalance: number
  holding?: { shares: number; avgCost: number }
  onOrderPlaced: () => void
}

type Side = 'BUY' | 'SELL'
type OrderType = 'MARKET' | 'LIMIT'

export default function TournamentTradingPanel({ stock, tournamentId, cashBalance, holding, onOrderPlaced }: Props) {
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
    setShares(side === 'BUY' ? maxSharesBuy.toFixed(4) : maxSharesSell.toFixed(4))
  }

  function setFraction(fraction: number) {
    if (side === 'BUY') setShares(((cashBalance / execPrice) * fraction).toFixed(4))
    else setShares((maxSharesSell * fraction).toFixed(4))
  }

  async function handleSubmit() {
    if (sharesNum <= 0) { hapticError(); toast.error('Enter a valid number of shares'); return }
    if (side === 'SELL' && sharesNum > maxSharesSell) { hapticError(); toast.error(`You only own ${maxSharesSell} shares`); return }
    if (side === 'BUY' && orderType === 'MARKET' && orderTotal > cashBalance) { hapticError(); toast.error('Insufficient tournament buying power'); return }
    hapticLight()
    setShowConfirm(true)
  }

  async function confirmOrder() {
    setSubmitting(true)
    setShowConfirm(false)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/orders`, {
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
      if (!res.ok) { hapticError(); toast.error(data.error || 'Order failed'); return }
      hapticSuccess()
      if (data.pending) {
        toast('Market is closed. Your order will execute at market open.', { icon: '🕐' })
      } else {
        toast.success(data.message || 'Order placed!')
      }
      setShares('')
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Trade {stock.symbol}</h3>
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-medium">Tournament</span>
        </div>

        {/* BUY / SELL tabs */}
        <div className="flex bg-white/5 rounded-xl p-1 mb-4">
          {(['BUY', 'SELL'] as Side[]).map(s => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={cn(
                'flex-1 py-2 text-sm font-medium rounded-lg transition-all',
                side === s
                  ? s === 'BUY' ? 'bg-green-500 text-black' : 'bg-red-500 text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >{s}</button>
          ))}
        </div>

        {/* Order type */}
        <div className="flex bg-white/5 rounded-xl p-1 mb-4">
          {(['MARKET', 'LIMIT'] as OrderType[]).map(t => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={cn(
                'flex-1 py-1.5 text-xs font-medium rounded-lg transition-all',
                orderType === t ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
              )}
            >{t}</button>
          ))}
        </div>

        {orderType === 'LIMIT' && (
          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-1.5">Limit Price</label>
            <input
              type="number"
              value={limitPrice}
              onChange={e => setLimitPrice(e.target.value)}
              className="w-full bg-white/5 border border-brand-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-gray-400">Shares</label>
            <button onClick={setMaxShares} className="text-xs text-green-400 hover:text-green-300">Max</button>
          </div>
          <input
            type="number"
            value={shares}
            onChange={e => setShares(e.target.value)}
            placeholder="0"
            className="w-full bg-white/5 border border-brand-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
          />
          <div className="flex gap-2 mt-2">
            {[0.25, 0.5, 0.75, 1].map(f => (
              <button
                key={f}
                onClick={() => setFraction(f)}
                className="flex-1 text-xs py-1 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                {f === 1 ? 'Max' : `${f * 100}%`}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-brand-border pt-3 mb-4 space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Tournament Balance</span>
            <span>{formatCurrency(cashBalance)}</span>
          </div>
          <div className="flex justify-between text-sm font-medium">
            <span>Order Total</span>
            <span>{formatCurrency(orderTotal)}</span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || sharesNum <= 0}
          className={cn(
            'w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50',
            side === 'BUY'
              ? 'bg-green-500 hover:bg-green-400 text-black'
              : 'bg-red-500 hover:bg-red-400 text-white'
          )}
        >
          {submitting ? 'Placing…' : `${side} ${sharesNum > 0 ? sharesNum : ''} ${stock.symbol}`}
        </button>
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
