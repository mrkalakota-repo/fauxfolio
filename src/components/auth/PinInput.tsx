'use client'

import { useRef } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  onComplete?: (pin: string) => void
  length?: number
  autoFocus?: boolean
}

export default function PinInput({ value, onChange, onComplete, length = 6, autoFocus }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, length)
    onChange(raw)
    if (raw.length === length) onComplete?.(raw)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={handleChange}
        maxLength={length}
        autoFocus={autoFocus}
        autoComplete="one-time-code"
        placeholder="tap to enter PIN"
        className="w-full p-4 bg-white/5 border border-brand-border rounded-xl text-center text-2xl tracking-[0.4em] text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50"
        style={{
          WebkitTextSecurity: 'disc',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        } as React.CSSProperties}
      />
      {value.length > 0 && (
        <p className="text-xs text-gray-500 text-center mt-1.5">{value.length}/{length} digits entered</p>
      )}
    </div>
  )
}
