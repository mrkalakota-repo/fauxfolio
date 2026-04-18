'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import type { PricePoint } from '@/types'

interface Props {
  data: PricePoint[]
  loading?: boolean
  positive: boolean
  symbol: string
}

export default function StockChart({ data, loading, positive, symbol }: Props) {
  if (loading) {
    return <div className="h-64 bg-white/5 rounded-xl animate-pulse" />
  }

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
        No price history available
      </div>
    )
  }

  const color = positive ? '#4ade80' : '#f87171'
  const minVal = Math.min(...data.map(d => d.price)) * 0.998
  const maxVal = Math.max(...data.map(d => d.price)) * 1.002

  const chartData = data.map(p => ({
    time: format(new Date(p.timestamp), 'HH:mm'),
    fullTime: format(new Date(p.timestamp), 'MMM d, HH:mm'),
    price: p.price,
  }))

  return (
    <ResponsiveContainer width="100%" height={256}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad_${symbol}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fill: '#6B6B6B', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minVal, maxVal]}
          tick={{ fill: '#6B6B6B', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `$${v.toFixed(0)}`}
          width={56}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1A1A1A',
            border: '1px solid #2A2A2A',
            borderRadius: '12px',
            fontSize: '13px',
          }}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime ?? ''}
          formatter={(value: number) => [formatCurrency(value), symbol]}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad_${symbol})`}
          dot={false}
          activeDot={{ r: 4, fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
