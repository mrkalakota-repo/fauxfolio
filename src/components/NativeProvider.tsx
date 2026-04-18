'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNativeInit, useAndroidBack } from '@/hooks/useNative'

export default function NativeProvider({ children }: { children: React.ReactNode }) {
  useNativeInit()
  const router = useRouter()

  // Android: hardware back button navigates back
  useAndroidBack(() => {
    router.back()
  })

  return <>{children}</>
}
