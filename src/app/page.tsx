import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import LandingPage from '@/components/landing/LandingPage'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FauxFolio — Free Paper Trading Simulator',
  description: 'Practice stock trading risk-free with FauxFolio. Trade real stocks with $10,000 in virtual money, learn investing strategies, compete on global leaderboards, and master options trading — no real money involved.',
  keywords: [
    'paper trading app', 'free stock market simulator', 'virtual trading platform',
    'learn stock trading', 'practice investing', 'stock market game', 'options trading practice',
    'investment simulator', 'trading competition', 'stock leaderboard',
  ],
  openGraph: {
    title: 'FauxFolio — Free Paper Trading Simulator',
    description: 'Trade real stocks with virtual money. Compete globally, master options, and build your investing skills — completely free.',
    type: 'website',
  },
}

export default async function HomePage() {
  const session = await getSessionUser()
  if (session) redirect('/dashboard')
  return <LandingPage />
}
