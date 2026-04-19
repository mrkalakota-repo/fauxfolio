'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { format } from 'date-fns'
import { ClipboardList, X } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Order } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const STATUS_STYLES: Record<string, string> = {
  FILLED: 'bg-green-500/15 text-green-400',
  PENDING: 'bg-yellow-500/15 text-yellow-400',
  CANCELLED: 'bg-gray-500/15 text-gray-400',
  REJECTED: 'bg-red-500/15 text-red-400',
}

export default function OrdersPage() {
  const [filter, setFilter] = useState<'ALL' | 'FILLED' | 'PENDING' | 'CANCELLED'>('ALL')
  const { data, isLoading, mutate } = useSWR<{ orders: Order[]; error?: string }>(
    '/api/orders', fetcher, { refreshInterval: 5000 }
  )

  const orders = (data?.orders ?? []).filter(o =>
    filter === 'ALL' || o.status === filter
  )

  async function cancelOrder(id: string) {
    const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' })
    const d = await res.json()
    if (!res.ok) { toast.error(d.error || 'Failed to cancel'); return }
    toast.success('Order cancelled')
    mutate()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6" /> Order History
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{data?.orders?.length ?? 0} total orders</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(['ALL', 'FILLED', 'PENDING', 'CANCELLED'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-1.5 rounded-xl text-sm font-medium border transition-all',
              filter === f
                ? 'border-green-500/40 bg-green-500/10 text-green-400'
                : 'border-brand-border text-gray-500 hover:text-white hover:border-gray-500'
            )}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : data?.error ? (
          <div className="p-12 text-center text-red-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>{data.error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>No orders {filter !== 'ALL' ? `with status "${filter.toLowerCase()}"` : 'yet'}</p>
            <Link href="/markets" className="text-green-400 hover:text-green-300 text-sm mt-2 inline-block">
              Start trading →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-brand-border">
                  <th className="text-left px-5 py-3">Stock</th>
                  <th className="text-left px-5 py-3">Side</th>
                  <th className="text-left px-5 py-3 hidden sm:table-cell">Type</th>
                  <th className="text-right px-5 py-3">Shares</th>
                  <th className="text-right px-5 py-3">Price</th>
                  <th className="text-right px-5 py-3 hidden md:table-cell">Total</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3 hidden lg:table-cell">Date</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="border-t border-brand-border hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/stock/${order.stockSymbol}`} className="flex items-center gap-2 hover:opacity-80">
                        <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center text-xs font-bold">
                          {order.stockSymbol.slice(0, 2)}
                        </div>
                        <span className="text-sm font-semibold">{order.stockSymbol}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-md font-semibold',
                        order.side === 'BUY' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                      )}>
                        {order.side}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-400 hidden sm:table-cell">
                      {order.type}
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm">{order.shares}</td>
                    <td className="px-5 py-3.5 text-right text-sm">
                      {order.fillPrice
                        ? formatCurrency(order.fillPrice)
                        : order.limitPrice
                        ? `${formatCurrency(order.limitPrice)} (limit)`
                        : 'Market'}
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm hidden md:table-cell">
                      {order.fillPrice
                        ? formatCurrency(order.fillPrice * order.shares)
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-md font-medium',
                        STATUS_STYLES[order.status] || 'text-gray-400'
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-gray-500 hidden lg:table-cell">
                      {format(new Date(order.createdAt), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {order.status === 'PENDING' && (
                        <button
                          onClick={() => cancelOrder(order.id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Cancel order"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
