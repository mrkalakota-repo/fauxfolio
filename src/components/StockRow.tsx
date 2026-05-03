'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'

interface StockRowProps {
  stock: {
    symbol: string
    name?: string
    currentPrice: number
    changePercent?: number
    change?: number
  }
  showName?: boolean
}

export default function StockRow({ stock, showName = true }: StockRowProps) {
  const prevPrice = useRef(stock.currentPrice)
  const rowRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (stock.currentPrice !== prevPrice.current) {
      const cls = stock.currentPrice > prevPrice.current ? 'flash-green' : 'flash-red'
      prevPrice.current = stock.currentPrice
      rowRef.current?.classList.add(cls)
      const t = setTimeout(() => rowRef.current?.classList.remove(cls), 600)
      return () => clearTimeout(t)
    }
  }, [stock.currentPrice])

  const positive = (stock.changePercent ?? 0) >= 0

  return (
    <Link
      ref={rowRef}
      href={`/stock/${stock.symbol}`}
      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">
          {stock.symbol.slice(0, 2)}
        </div>
        <div>
          <div className="text-sm font-semibold">{stock.symbol}</div>
          {showName && stock.name && (
            <div className="text-xs text-gray-500 truncate max-w-[120px]">{stock.name}</div>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium price-value">{formatCurrency(stock.currentPrice)}</div>
        <div className={cn(
          'text-xs px-1.5 py-0.5 rounded-md font-medium inline-block',
          positive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
        )}>
          {formatPercent(stock.changePercent ?? 0)}
        </div>
      </div>
    </Link>
  )
}
