'use client'

import { useEffect } from 'react'

// window.Capacitor is injected by the native bridge on iOS/Android
function getPlatform(): 'ios' | 'android' | 'web' {
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    return (window as any).Capacitor.getPlatform()
  }
  return 'web'
}

export function isNative() {
  return getPlatform() !== 'web'
}

async function getHaptics() {
  try {
    const mod = await import('@capacitor/haptics')
    // Return wrapped object — never return a Capacitor plugin directly from
    // an async function or the async machinery calls .then() on the proxy
    return { Haptics: mod.Haptics, ImpactStyle: mod.ImpactStyle }
  } catch {
    return null
  }
}

async function getStatusBar() {
  try {
    const mod = await import('@capacitor/status-bar')
    return { StatusBar: mod.StatusBar, Style: mod.Style }
  } catch {
    return null
  }
}

export async function hapticSuccess() {
  if (!isNative()) return
  const mod = await getHaptics()
  if (!mod) return
  try { await mod.Haptics.impact({ style: mod.ImpactStyle.Medium }) } catch { /* no-op */ }
}

export async function hapticError() {
  if (!isNative()) return
  const mod = await getHaptics()
  if (!mod) return
  try { await mod.Haptics.notification({ type: 'ERROR' as any }) } catch { /* no-op */ }
}

export async function hapticLight() {
  if (!isNative()) return
  const mod = await getHaptics()
  if (!mod) return
  try { await mod.Haptics.impact({ style: mod.ImpactStyle.Light }) } catch { /* no-op */ }
}

export async function hapticHeavy() {
  if (!isNative()) return
  const mod = await getHaptics()
  if (!mod) return
  try { await mod.Haptics.impact({ style: mod.ImpactStyle.Heavy }) } catch { /* no-op */ }
}

export async function initStatusBar() {
  if (getPlatform() !== 'ios') return  // status bar styling is iOS-only
  const mod = await getStatusBar()
  if (!mod) return
  try {
    await mod.StatusBar.setStyle({ style: mod.Style.Dark })
    await mod.StatusBar.show()
  } catch { /* no-op */ }
}

// Android-only: hardware back button — not used on iOS
export function useAndroidBack(handler: () => void) {
  useEffect(() => {
    if (getPlatform() !== 'android') return

    let removeListener: (() => void) | undefined

    // Lazy-load @capacitor/app only on Android to avoid iOS proxy .then() issue
    import('@capacitor/app').then((mod) => {
      // mod.App is a Capacitor proxy — wrap before returning from async context
      const App = mod.App
      App.addListener('backButton', handler).then((handle: any) => {
        removeListener = () => handle.remove()
      }).catch(() => { /* no-op */ })
    }).catch(() => { /* no-op */ })

    return () => removeListener?.()
  }, [handler])
}

export function useNativeInit() {
  useEffect(() => {
    initStatusBar()
  }, [])
}
