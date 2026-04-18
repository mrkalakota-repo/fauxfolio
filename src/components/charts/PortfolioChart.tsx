'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import type { PortfolioSnapshot } from '@/types'

interface Props {
  data: PortfolioSnapshot[]
  loading?: boolean
}

export default function PortfolioChart({ data, loading }: Props) {
  if (loading) {
    return <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
  }

  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
        No history yet
      </div>
    )
  }

  const isPositive = data.length > 1 && data[data.length - 1].totalValue >= data[0].totalValue
  const color = isPositive ? '#4ade80' : '#f87171'

  const chartData = data.map(p => ({
    date: format(new Date(p.snapshotAt), 'MMM d'),
    value: p.totalValue,
  }))

  const minVal = Math.min(...chartData.map(d => d.value)) * 0.995
  const maxVal = Math.max(...chartData.map(d => d.value)) * 1.005

  return (
    <ResponsiveContainer width="100%" height={192}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
        <XAxis
          dataKey="date"
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
          tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
          width={52}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1A1A1A',
            border: '1px solid #2A2A2A',
            borderRadius: '12px',
            fontSize: '13px',
          }}
          labelStyle={{ color: '#9CA3AF' }}
          formatter={(value: number) => [formatCurrency(value), 'Portfolio Value']}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill="url(#portfolioGrad)"
          dot={false}
          activeDot={{ r: 4, fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
