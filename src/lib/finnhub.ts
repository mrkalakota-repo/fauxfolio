// Finnhub API client — real market data with simulation fallback

const BASE = 'https://finnhub.io/api/v1'
const KEY = process.env.FINNHUB_API_KEY

export function hasRealData(): boolean {
  return !!KEY
}

// Is US market currently open? (9:30am – 4:00pm ET, Mon–Fri)
export function isMarketOpen(): boolean {
  const now = new Date()
  const et = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now)

  const wd = et.find(p => p.type === 'weekday')?.value ?? ''
  const h = parseInt(et.find(p => p.type === 'hour')?.value ?? '0')
  const m = parseInt(et.find(p => p.type === 'minute')?.value ?? '0')
  const mins = h * 60 + m
  return !['Sat', 'Sun'].includes(wd) && mins >= 570 && mins < 960 // 9:30–16:00
}

interface FinnhubQuote {
  c: number   // current price
  d: number   // change
  dp: number  // change percent
  h: number   // day high
  l: number   // day low
  o: number   // open
  pc: number  // prev close
  t: number   // timestamp
}

export async function getQuote(symbol: string): Promise<FinnhubQuote | null> {
  if (!KEY) return null
  try {
    const res = await fetch(`${BASE}/quote?symbol=${symbol}&token=${KEY}`, {
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    const data: FinnhubQuote = await res.json()
    if (!data.c || data.c === 0) return null
    return data
  } catch {
    return null
  }
}

interface FinnhubCandle {
  c: number[]  // close
  h: number[]  // high
  l: number[]  // low
  o: number[]  // open
  t: number[]  // unix timestamps
  v: number[]  // volume
  s: string    // 'ok' | 'no_data'
}

export async function getCandles(
  symbol: string,
  resolution: string,
  fromUnix: number,
  toUnix: number
): Promise<FinnhubCandle | null> {
  if (!KEY) return null
  try {
    const url = `${BASE}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${fromUnix}&to=${toUnix}&token=${KEY}`
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return null
    const data: FinnhubCandle = await res.json()
    return data.s === 'ok' ? data : null
  } catch {
    return null
  }
}

interface FinnhubProfile {
  name: string
  ticker: string
  finnhubIndustry: string
  exchange: string
  marketCapitalization: number  // in millions
  shareOutstanding: number
  logo: string
  weburl: string
  description?: string
}

export async function getProfile(symbol: string): Promise<FinnhubProfile | null> {
  if (!KEY) return null
  try {
    const res = await fetch(`${BASE}/stock/profile2?symbol=${symbol}&token=${KEY}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const data: FinnhubProfile = await res.json()
    return data.name ? data : null
  } catch {
    return null
  }
}

export interface SearchResult {
  symbol: string
  description: string
  type: string
  displaySymbol: string
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  if (!KEY || !query) return []
  try {
    const res = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}&token=${KEY}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    const data: { result: SearchResult[]; count: number } = await res.json()
    return (data.result ?? [])
      .filter(r => r.type === 'Common Stock' && !r.symbol.includes('.') && !r.symbol.includes('-'))
      .slice(0, 10)
  } catch {
    return []
  }
}

export async function getVix(): Promise<number | null> {
  const quote = await getQuote('^VIX')
  return quote ? quote.c : null
}

// Resolution + epoch range for each chart timeframe
export function candleParams(range: string): { resolution: string; from: number; to: number } {
  const now = Math.floor(Date.now() / 1000)
  const day = 86400
  switch (range) {
    case '1D': return { resolution: '5',  from: now - day,       to: now }
    case '1W': return { resolution: '60', from: now - 7 * day,   to: now }
    case '1M': return { resolution: 'D',  from: now - 30 * day,  to: now }
    case '3M': return { resolution: 'D',  from: now - 90 * day,  to: now }
    case '1Y': return { resolution: 'W',  from: now - 365 * day, to: now }
    default:   return { resolution: 'M',  from: now - 5 * 365 * day, to: now }
  }
}
