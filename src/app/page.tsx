import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import LandingPage from '@/components/landing/LandingPage'

export default async function HomePage() {
  const session = await getSessionUser()
  if (session) redirect('/dashboard')
  return <LandingPage />
}
