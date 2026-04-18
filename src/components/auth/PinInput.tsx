'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (v: string) => void
  onComplete?: (pin: string) => void
  length?: number
}

export default function PinInput({ value, onChange, onComplete, length = 6 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, length)
    onChange(raw)
    if (raw.length === length) onComplete?.(raw)
  }

  const dots = Array.from({ length })

  return (
    <div className="relative">
      {/* Hidden real input */}
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        maxLength={length}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        autoComplete="one-time-code"
      />
      {/* Visual dots */}
      <div
        className="flex items-center justify-center gap-3 p-4 bg-white/5 border border-brand-border rounded-xl cursor-pointer"
        onClick={() => inputRef.current?.focus()}
      >
        {dots.map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-3 h-3 rounded-full transition-all duration-150',
              i < value.length
                ? 'bg-green-500 scale-110'
                : i === value.length
                ? 'bg-green-500/50 scale-100 animate-pulse'
                : 'bg-white/20'
            )}
          />
        ))}
      </div>
      {value.length > 0 && (
        <p className="text-xs text-gray-500 text-center mt-1.5">{value.length}/{length} digits entered</p>
      )}
    </div>
  )
}
