'use client'

import { useEffect, useRef } from 'react'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      remove: (widgetId: string) => void
    }
  }
}

export default function TurnstileWidget() {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return

    let intervalId: ReturnType<typeof setInterval> | null = null

    function renderWidget() {
      if (!containerRef.current || widgetIdRef.current !== null) return
      widgetIdRef.current = window.turnstile!.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: 'dark',
      })
    }

    if (window.turnstile) {
      renderWidget()
    } else if (!document.getElementById('cf-turnstile-script')) {
      const script = document.createElement('script')
      script.id = 'cf-turnstile-script'
      // explicit render mode — script won't auto-scan the DOM
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.onload = renderWidget
      document.head.appendChild(script)
    } else {
      // Script is loading but window.turnstile not yet available — poll
      intervalId = setInterval(() => {
        if (window.turnstile) {
          if (intervalId) clearInterval(intervalId)
          renderWidget()
        }
      }, 50)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
      if (widgetIdRef.current !== null && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current) } catch {}
        widgetIdRef.current = null
      }
    }
  }, [])

  if (!SITE_KEY) return null

  return <div ref={containerRef} />
}
