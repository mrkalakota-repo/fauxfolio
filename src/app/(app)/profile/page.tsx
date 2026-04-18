'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import toast from 'react-hot-toast'
import { Lock, LogOut, User } from 'lucide-react'
import PinInput from '@/components/auth/PinInput'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ProfilePage() {
  const router = useRouter()
  const { data } = useSWR('/api/auth/me', fetcher)

  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)

  const user = data?.user
  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? '??'

  async function handleChangePin(e: React.FormEvent) {
    e.preventDefault()
    if (newPin.length < 4) { toast.error('New PIN must be at least 4 digits'); return }
    if (newPin !== confirmPin) { toast.error('New PINs do not match'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin, confirmPin }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to update PIN'); return }
      toast.success('PIN updated successfully')
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Profile</h1>

      {/* Account info */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-xl font-bold">
            {initials}
          </div>
          <div>
            <div className="font-semibold text-lg">{user?.name ?? '—'}</div>
            <div className="text-sm text-gray-500">Paper Trader</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-t border-brand-border">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <User className="w-4 h-4" />
              Phone
            </div>
            <span className="text-sm font-medium">
              {user?.phone ? `(${user.phone.slice(0,3)}) ${user.phone.slice(3,6)}-${user.phone.slice(6)}` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-brand-border">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Lock className="w-4 h-4" />
              PIN
            </div>
            <span className="text-sm text-gray-500">••••••</span>
          </div>
        </div>
      </div>

      {/* Change PIN */}
      <div className="card p-6">
        <h2 className="font-semibold mb-5">Change PIN</h2>
        <form onSubmit={handleChangePin} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Current PIN</label>
            <PinInput value={currentPin} onChange={setCurrentPin} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">New PIN</label>
            <PinInput value={newPin} onChange={setNewPin} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Confirm New PIN</label>
            <PinInput value={confirmPin} onChange={setConfirmPin} />
          </div>
          <button
            type="submit"
            disabled={loading || currentPin.length < 4 || newPin.length < 4 || confirmPin.length < 4}
            className="w-full py-3 bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Updating…' : 'Update PIN'}
          </button>
        </form>
      </div>

      {/* Sign out */}
      <div className="card p-6">
        <h2 className="font-semibold mb-3">Session</h2>
        <p className="text-sm text-gray-500 mb-4">Signing out will clear your session on this device.</p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}
