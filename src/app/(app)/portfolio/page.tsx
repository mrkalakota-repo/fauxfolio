'use client'

import useSWR from 'swr'
import Link from 'next/link'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  cn, formatCurrency, formatPercent, formatChange, getChangeColor,
} from '@/lib/utils'
import PortfolioChart from '@/components/charts/PortfolioChart'
import type { Portfolio } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const COLORS = ['#4ade80', '#60a5fa', '#f59e0b', '#f472b6', '#a78bfa', '#34d399', '#fb923c', '#818cf8']

export default function PortfolioPage() {
  const { data, isLoading } = useSWR<Portfolio>('/api/portfolio', fetcher, {
    refreshInterval: 8000,
  })

  const portfolio = data

  const pieData = portfolio?.holdings.map((h, i) => ({
    name: h.stockSymbol,
    value: parseFloat((h.currentValue ?? 0).toFixed(2)),
    color: COLORS[i % COLORS.length],
  })) ?? []

  if (portfolio?.user.cashBalance) {
    pieData.push({
      name: 'Cash',
      value: parseFloat(portfolio.user.cashBalance.toFixed(2)),
      color: '#6B7280',
    })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Portfolio</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Value"
          value={formatCurrency(portfolio?.totalValue ?? 0)}
          loading={isLoading}
          accent
        />
        <SummaryCard
          label="Cash Balance"
          value={formatCurrency(portfolio?.user.cashBalance ?? 0)}
          loading={isLoading}
        />
        <SummaryCard
          label="Today's P&L"
          value={formatChange(portfolio?.dayChange ?? 0)}
          sub={formatPercent(portfolio?.dayChangePercent ?? 0)}
          valueClass={getChangeColor(portfolio?.dayChange ?? 0)}
          loading={isLoading}
        />
        <SummaryCard
          label="Total Return"
          value={formatChange(portfolio?.totalGainLoss ?? 0)}
          sub={formatPercent(portfolio?.totalGainLossPercent ?? 0)}
          valueClass={getChangeColor(portfolio?.totalGainLoss ?? 0)}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Performance chart */}
        <div className="xl:col-span-2 card p-5">
          <h2 className="font-semibold mb-4">Performance History</h2>
          <PortfolioChart
            data={portfolio?.portfolioHistory ?? []}
            loading={isLoading}
          />
        </div>

        {/* Allocation pie */}
        <div className="card p-5">
          <h2 className="font-semibold mb-4">Allocation</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #2A2A2A',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(v: number) => [formatCurrency(v), '']}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: '#9CA3AF', fontSize: '12px' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
              No holdings yet
            </div>
          )}
        </div>
      </div>

      {/* Holdings table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-brand-border">
          <h2 className="font-semibold">Holdings</h2>
          <Link href="/markets" className="text-sm text-green-400 hover:text-green-300">
            + Add position
          </Link>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : portfolio?.holdings.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="mb-2">No holdings yet.</p>
            <Link href="/markets" className="text-green-400 hover:text-green-300 text-sm">
              Start trading →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Asset</th>
                  <th className="text-right px-5 py-3">Shares</th>
                  <th className="text-right px-5 py-3">Avg Cost</th>
                  <th className="text-right px-5 py-3">Current Price</th>
                  <th className="text-right px-5 py-3">Market Value</th>
                  <th className="text-right px-5 py-3">P&L</th>
                  <th className="text-right px-5 py-3">Return</th>
                </tr>
              </thead>
              <tbody>
                {portfolio?.holdings.map(h => (
                  <tr
                    key={h.stockSymbol}
                    className="border-t border-brand-border hover:bg-white/2 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <Link href={`/stock/${h.stockSymbol}`} className="flex items-center gap-3 hover:opacity-80">
                        <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-xs font-bold">
                          {h.stockSymbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{h.stockSymbol}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[120px]">
                            {h.stock?.name}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="text-right px-5 py-3.5 text-sm">{h.shares}</td>
                    <td className="text-right px-5 py-3.5 text-sm">{formatCurrency(h.avgCost)}</td>
                    <td className="text-right px-5 py-3.5 text-sm">
                      {formatCurrency(h.stock?.currentPrice ?? 0)}
                    </td>
                    <td className="text-right px-5 py-3.5 text-sm font-medium">
                      {formatCurrency(h.currentValue ?? 0)}
                    </td>
                    <td className={cn('text-right px-5 py-3.5 text-sm font-medium', getChangeColor(h.gainLoss ?? 0))}>
                      {formatChange(h.gainLoss ?? 0)}
                    </td>
                    <td className="text-right px-5 py-3.5">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-md font-medium',
                        (h.gainLossPercent ?? 0) >= 0
                          ? 'bg-green-500/15 text-green-400'
                          : 'bg-red-500/15 text-red-400'
                      )}>
                        {formatPercent(h.gainLossPercent ?? 0)}
                      </span>
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

function SummaryCard({
  label, value, sub, loading, accent, valueClass,
}: {
  label: string
  value: string
  sub?: string
  loading?: boolean
  accent?: boolean
  valueClass?: string
}) {
  return (
    <div className="card p-4">
      <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">{label}</div>
      {loading ? (
        <div className="h-7 bg-white/5 rounded-lg animate-pulse" />
      ) : (
        <>
          <div className={cn('text-xl font-bold', valueClass, accent && 'text-white')}>{value}</div>
          {sub && <div className={cn('text-xs mt-0.5', valueClass || 'text-gray-500')}>{sub}</div>}
        </>
      )}
    </div>
  )
}
