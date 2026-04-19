'use client'

import { useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function JoinLeaguePage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) { router.replace(`/leagues/${id}`); return }

    fetch(`/api/leagues/${id}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          toast.success('Joined league!')
        } else {
          toast.error(data.error || 'Could not join league')
        }
        router.replace(`/leagues/${id}`)
      })
      .catch(() => router.replace(`/leagues/${id}`))
  }, [id, token, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Joining league...</span>
      </div>
    </div>
  )
}
