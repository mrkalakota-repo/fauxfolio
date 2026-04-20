'use client'

import { BADGE_THRESHOLDS } from '@/lib/badges'

interface BadgeData {
  badge: string
  label: string
  icon: string
  description: string
  earned: boolean
  awardedAt: string | null
}

interface BadgeStripProps {
  badges: BadgeData[]
}

export default function BadgeStrip({ badges }: BadgeStripProps) {
  if (!badges || badges.length === 0) {
    // Show locked state using static thresholds
    return (
      <div className="flex flex-wrap gap-2">
        {BADGE_THRESHOLDS.map(t => (
          <BadgePill key={t.badge} badge={{ ...t, earned: false, awardedAt: null }} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map(b => (
        <BadgePill key={b.badge} badge={b} />
      ))}
    </div>
  )
}

function BadgePill({ badge }: { badge: BadgeData }) {
  const earnedDate = badge.awardedAt
    ? new Date(badge.awardedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="relative group">
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
        badge.earned
          ? 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-300'
          : 'bg-white/5 border border-white/10 text-gray-600 opacity-50'
      }`}>
        <span className={badge.earned ? '' : 'grayscale'}>{badge.icon}</span>
        <span>{badge.label}</span>
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
        <div className="bg-gray-900 border border-brand-border rounded-lg px-3 py-2 text-xs text-gray-300 whitespace-nowrap shadow-xl">
          <p className="font-medium text-white mb-0.5">{badge.label}</p>
          <p>{badge.description}</p>
          {badge.earned && earnedDate && (
            <p className="text-green-400 mt-1">Earned {earnedDate}</p>
          )}
          {!badge.earned && (
            <p className="text-gray-500 mt-1">Not yet earned</p>
          )}
        </div>
        <div className="w-2 h-2 bg-gray-900 border-r border-b border-brand-border rotate-45 mx-auto -mt-1" />
      </div>
    </div>
  )
}
