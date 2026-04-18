'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { TrendingUp, Loader2, Phone, Lock, User } from 'lucide-react'
import PinInput from '@/components/auth/PinInput'
import PhoneInput from '@/components/auth/PhoneInput'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)

  function goToStep2(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Enter your name'); return }
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) { toast.error('Enter a valid phone number'); return }
    setStep(2)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length < 4) { toast.error('PIN must be at least 4 digits'); return }
    if (pin !== confirmPin) { toast.error('PINs do not match'); return }
    if (/^(\d)\1+$/.test(pin)) { toast.error('PIN cannot be all the same digit'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin, name }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Registration failed'); return }
      toast.success('Account created! You start with $10,000 virtual cash 🎉')
      router.push('/dashboard')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-black" />
            </div>
            <span className="text-2xl font-bold">FauxFolio</span>
          </div>
          <p className="text-gray-400 text-sm">Start with $10,000 virtual cash</p>
        </div>

        <div className="card p-8">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= s ? 'bg-green-500 text-black' : 'bg-white/10 text-gray-500'
                }`}>
                  {s}
                </div>
                {s < 2 && <div className={`flex-1 h-0.5 w-8 ${step > s ? 'bg-green-500' : 'bg-white/10'}`} />}
              </div>
            ))}
            <span className="text-xs text-gray-500 ml-2">
              {step === 1 ? 'Your info' : 'Set your PIN'}
            </span>
          </div>

          {step === 1 ? (
            <form onSubmit={goToStep2} className="space-y-5">
              <h1 className="text-xl font-semibold">Create your account</h1>

              <div>
                <label className="block text-sm text-gray-400 mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white/5 border border-brand-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors placeholder-gray-600"
                  placeholder="Alex Johnson"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone Number
                </label>
                <PhoneInput value={phone} onChange={setPhone} />
              </div>

              <button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-400 text-black font-semibold py-3 rounded-xl transition-colors"
              >
                Continue
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h1 className="text-xl font-semibold mb-1">Set your PIN</h1>
                <p className="text-sm text-gray-500">Choose a 4–6 digit PIN to secure your account</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> PIN
                </label>
                <PinInput value={pin} onChange={setPin} onComplete={() => {}} />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Confirm PIN
                </label>
                <PinInput value={confirmPin} onChange={setConfirmPin} onComplete={() => {}} />
                {confirmPin.length >= pin.length && pin !== confirmPin && (
                  <p className="text-xs text-red-400 mt-1">PINs do not match</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border border-brand-border hover:border-gray-500 text-gray-300 py-3 rounded-xl text-sm transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || pin.length < 4 || pin !== confirmPin}
                  className="flex-1 bg-green-500 hover:bg-green-400 text-black font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create Account
                </button>
              </div>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-green-400 hover:text-green-300 font-medium">
              Sign in
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
