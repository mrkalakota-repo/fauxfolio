'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { TrendingUp, Loader2, Phone, Lock } from 'lucide-react'
import PinInput from '@/components/auth/PinInput'
import PhoneInput from '@/components/auth/PhoneInput'
import TurnstileWidget from '@/components/auth/Turnstile'
import { isNative } from '@/hooks/useNative'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  async function doLoginCore(phoneVal: string, pinVal: string) {
    if (pinVal.length < 4) { toast.error('Enter your PIN'); return }
    setLoading(true)
    try {
      const native = isNative()
      const cfToken = (document.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement)?.value
      if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !cfToken && !native) {
        toast.error('Complete the human verification before signing in')
        return
      }
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneVal, pin: pinVal, cfToken, nativeApp: native }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Login failed'); return }
      toast.success(`Welcome back, ${data.user.name}!`)
      router.push('/dashboard')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    doLoginCore(phone, pin)
  }

  function fillDemo() {
    const demoPhone = '(555) 555-0100'
    const demoPin = '123456'
    setPhone(demoPhone)
    setPin(demoPin)
    doLoginCore(demoPhone, demoPin)
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center px-4 py-12 overflow-y-auto">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-black" />
            </div>
            <span className="text-2xl font-bold">FauxFolio</span>
          </div>
          <p className="text-gray-400 text-sm">Paper trading simulator — learn to invest risk-free</p>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-semibold mb-6">Sign in</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-2 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Phone Number
              </label>
              <PhoneInput value={phone} onChange={setPhone} />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> PIN
              </label>
              <PinInput value={pin} onChange={setPin} onComplete={(p) => doLoginCore(phone, p)} />
            </div>

            <button
              type="submit"
              disabled={loading || pin.length < 4}
              onTouchEnd={(e) => { if (!loading && pin.length >= 4) { e.preventDefault(); doLoginCore(phone, pin) } }}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              style={{ touchAction: 'manipulation' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Sign In
            </button>
            <TurnstileWidget />
          </form>

          <div className="mt-4 pt-4 border-t border-brand-border">
            <button
              type="button"
              onClick={fillDemo}
              onTouchEnd={(e) => { e.preventDefault(); fillDemo() }}
              className="w-full border border-brand-border text-gray-300 py-2.5 rounded-xl text-sm bg-transparent"
              style={{ touchAction: 'manipulation' }}
            >
              Try Demo Account
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            No account?{' '}
            <Link href="/register" className="text-green-400 hover:text-green-300 font-medium">
              Sign up free
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          🛡️ Simulated trading only — no real money involved
        </p>
      </div>
    </div>
  )
}
