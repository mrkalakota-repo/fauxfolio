'use client'

interface Props {
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

export default function PhoneInput({ value, onChange, autoFocus }: Props) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(formatPhone(e.target.value))
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">+1</span>
      <input
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        autoFocus={autoFocus}
        placeholder="(555) 555-0100"
        className="w-full bg-white/5 border border-brand-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors placeholder-gray-600"
      />
    </div>
  )
}
