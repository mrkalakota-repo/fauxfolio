'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Lock, ChevronDown } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import OptionOrderModal from './OptionOrderModal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

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
  symbol: string
  currentPrice: number
  totalTopUps: number
  cashBalance: number
  onNeedUpgrade: () => void
}

export default function OptionsPanel({ symbol, currentPrice, totalTopUps, cashBalance, onNeedUpgrade }: Props) {
  const [selectedExpiry, setSelectedExpiry] = useState<string>('')
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)

  const { data, mutate } = useSWR(
    totalTopUps >= 1 ? `/api/options/${symbol}` : null,
    fetcher,
    { refreshInterval: 8000 }
  )

  if (totalTopUps < 1) {
    return (
      <div className="card p-6 text-center">
        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
          <Lock className="w-5 h-5 text-gray-400" />
        </div>
        <h3 className="font-semibold mb-1">Options Trading Locked</h3>
        <p className="text-sm text-gray-500 mb-4">Purchase any virtual cash pack to unlock paper options trading.</p>
        <button
          onClick={onNeedUpgrade}
          className="w-full bg-green-500 hover:bg-green-400 text-black font-semibold py-2.5 rounded-xl text-sm transition-colors"
        >
          Unlock with any cash pack
        </button>
      </div>
    )
  }

  const calls: Contract[] = data?.calls ?? []
  const puts: Contract[] = data?.puts ?? []
  const expiries: string[] = data?.expiries ?? []

  const activeExpiry = selectedExpiry || expiries[0] || ''

  const filteredCalls = calls.filter(c => c.expiresAt === activeExpiry)
  const filteredPuts = puts.filter(c => c.expiresAt === activeExpiry)

  const strikes = [...new Set([...filteredCalls, ...filteredPuts].map(c => c.strikePrice))].sort((a, b) => a - b)

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Options Chain</h3>
        <div className="relative">
          <select
            value={activeExpiry}
            onChange={e => setSelectedExpiry(e.target.value)}
            className="appearance-none bg-white/5 border border-brand-border rounded-lg pl-3 pr-7 py-1.5 text-xs focus:outline-none focus:border-green-500"
          >
            {expiries.map(exp => (
              <option key={exp} value={exp}>
                {new Date(exp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {!data ? (
        <div className="h-40 flex items-center justify-center text-sm text-gray-500">Loading chain...</div>
      ) : strikes.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm text-gray-500">No contracts available</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left pb-2 font-medium text-green-400/80">CALL</th>
                <th className="text-center pb-2 font-medium">Strike</th>
                <th className="text-right pb-2 font-medium text-red-400/80">PUT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/30">
              {strikes.map(strike => {
                const call = filteredCalls.find(c => c.strikePrice === strike)
                const put = filteredPuts.find(c => c.strikePrice === strike)
                const atm = Math.abs(strike - currentPrice) / currentPrice < 0.025
                return (
                  <tr key={strike} className={cn(atm && 'bg-white/[0.02]')}>
                    <td className="py-1.5 pr-2">
                      {call ? (
                        <button
                          onClick={() => setSelectedContract(call)}
                          className="text-green-400 hover:text-green-300 font-mono hover:underline"
                        >
                          {formatCurrency(call.price)}
                        </button>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className={cn('text-center font-mono font-semibold py-1.5', atm ? 'text-yellow-400' : 'text-gray-400')}>
                      {strike}
                    </td>
                    <td className="py-1.5 pl-2 text-right">
                      {put ? (
                        <button
                          onClick={() => setSelectedContract(put)}
                          className="text-red-400 hover:text-red-300 font-mono hover:underline"
                        >
                          {formatCurrency(put.price)}
                        </button>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-600 text-center">Click any premium to open a position</p>

      <OptionOrderModal
        contract={selectedContract}
        symbol={symbol}
        currentPrice={currentPrice}
        cashBalance={cashBalance}
        onClose={() => setSelectedContract(null)}
        onSuccess={() => mutate()}
      />
    </div>
  )
}
