'use client'

import Link from 'next/link'
import { Trophy, Users, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import LeagueCountdown from './LeagueCountdown'

interface LeagueCardProps {
  id: string
  name: string
  status: string
  endsAt: string
  memberCount: number
  maxMembers: number
  creatorName: string
}

export default function LeagueCard({ id, name, status, endsAt, memberCount, maxMembers, creatorName }: LeagueCardProps) {
  const ended = status === 'ENDED'
  return (
    <Link href={`/leagues/${id}`} data-testid="league-card" className="card p-4 hover:border-green-500/30 transition-colors block">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center',
            ended ? 'bg-gray-500/20' : 'bg-green-500/15'
          )}>
            <Trophy className={cn('w-4 h-4', ended ? 'text-gray-400' : 'text-green-400')} />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{name}</h3>
            <p className="text-xs text-gray-500">by {creatorName}</p>
          </div>
        </div>
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-md font-medium',
          ended ? 'bg-gray-500/15 text-gray-400' : 'bg-green-500/15 text-green-400'
        )}>
          {ended ? 'Ended' : 'Active'}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {memberCount}/{maxMembers}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {ended ? new Date(endsAt).toLocaleDateString() : <LeagueCountdown endsAt={endsAt} />}
        </span>
      </div>
    </Link>
  )
}
