'use client'

import { useEffect } from 'react'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export default function TurnstileWidget() {
  useEffect(() => {
    if (!SITE_KEY) return
    if (document.getElementById('cf-turnstile-script')) return
    const script = document.createElement('script')
    script.id = 'cf-turnstile-script'
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }, [])

  if (!SITE_KEY) return null

  return (
    <div
      className="cf-turnstile"
      data-sitekey={SITE_KEY}
      data-theme="dark"
    />
  )
}
