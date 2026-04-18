'use client'

import { useEffect } from 'react'

// Ticks price engine: real Finnhub prices during market hours, simulation otherwise
export default function SimulationTicker() {
  useEffect(() => {
    const tick = () => {
      fetch('/api/simulation/tick', { method: 'POST' }).catch(() => {})
    }
    tick()
    // 8-second interval: during market hours this batches 5 Finnhub calls,
    // after hours it runs the simulation engine
    const interval = setInterval(tick, 8000)
    return () => clearInterval(interval)
  }, [])

  return null
}
