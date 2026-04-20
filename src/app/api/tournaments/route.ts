import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { getOrCreateCurrentTournament, finalizeTournament, maskName, formatMonth } from '@/lib/tournament'

export async function GET() {
  try {
    const session = await getSessionUser()

    const tournament = await getOrCreateCurrentTournament()
    const now = new Date()

    // Lazy finalization
    if (tournament.status === 'ACTIVE' && tournament.endsAt <= now) {
      await finalizeTournament(tournament.id)
      // Re-fetch after finalization
      const updated = await prisma.tournament.findUnique({ where: { id: tournament.id } })
      if (updated) Object.assign(tournament, updated)
    }

    // Determine the authenticated user's entry status
    let entryStatus: 'NONE' | 'PENDING' | 'ACTIVE' | 'ENDED' = 'NONE'
    let entryId: string | null = null
    if (session) {
      const entry = await prisma.tournamentEntry.findUnique({
        where: { tournamentId_userId: { tournamentId: tournament.id, userId: session.userId } },
        select: { id: true, status: true },
      })
      if (entry) {
        entryStatus = entry.status as typeof entryStatus
        entryId = entry.id
      }
    }

    // Current tournament winner (if ended)
    let winner = null
    if (tournament.status === 'ENDED') {
      const winnerEntry = await prisma.tournamentEntry.findFirst({
        where: { tournamentId: tournament.id, rank: 1 },
        include: { user: { select: { id: true, name: true } } },
      })
      if (winnerEntry) {
        const returnPct = winnerEntry.finalBalance != null
          ? (((winnerEntry.finalBalance - 20000) / 20000) * 100).toFixed(1)
          : '0.0'
        winner = {
          name: maskName(winnerEntry.user.name),
          fullName: winnerEntry.user.name,
          userId: winnerEntry.user.id,
          finalBalance: winnerEntry.finalBalance,
          returnPct,
          certificateUrl: `/api/tournaments/${tournament.id}/certificate?userId=${winnerEntry.user.id}`,
          month: formatMonth(tournament.month, tournament.year),
        }
      }
    }

    // Previous month's winner (for landing page display)
    let previousWinner = null
    const prevDate = new Date(tournament.year, tournament.month - 2, 1)
    const prevMonth = prevDate.getMonth() + 1
    const prevYear = prevDate.getFullYear()
    const prevTournament = await prisma.tournament.findUnique({
      where: { month_year: { month: prevMonth, year: prevYear } },
    })
    if (prevTournament) {
      const prevWinnerEntry = await prisma.tournamentEntry.findFirst({
        where: { tournamentId: prevTournament.id, rank: 1 },
        include: { user: { select: { id: true, name: true } } },
      })
      if (prevWinnerEntry) {
        const returnPct = prevWinnerEntry.finalBalance != null
          ? (((prevWinnerEntry.finalBalance - 20000) / 20000) * 100).toFixed(1)
          : '0.0'
        previousWinner = {
          name: maskName(prevWinnerEntry.user.name),
          fullName: prevWinnerEntry.user.name,
          userId: prevWinnerEntry.user.id,
          finalBalance: prevWinnerEntry.finalBalance,
          returnPct,
          certificateUrl: `/api/tournaments/${prevTournament.id}/certificate?userId=${prevWinnerEntry.user.id}`,
          month: formatMonth(prevTournament.month, prevTournament.year),
        }
      }
    }

    return NextResponse.json({
      tournament: {
        ...tournament,
        startsAt: tournament.startsAt.toISOString(),
        endsAt: tournament.endsAt.toISOString(),
        createdAt: tournament.createdAt.toISOString(),
      },
      entryStatus,
      entryId,
      winner,
      previousWinner,
    })
  } catch (error) {
    console.error('[tournaments/current]', error)
    return NextResponse.json({ error: 'Failed to load tournament' }, { status: 500 })
  }
}
