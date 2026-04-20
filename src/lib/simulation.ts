// Geometric Brownian Motion price simulation

const VOLATILITY = parseFloat(process.env.SIMULATION_VOLATILITY || '0.015')
const DRIFT = 0.00002
const MEAN_REVERSION_STRENGTH = 0.05

// Sector correlations — when tech goes up, most tech stocks follow
const SECTOR_CORRELATION: Record<string, number> = {
  Technology: 0.6,
  Financial: 0.5,
  Healthcare: 0.3,
  'Consumer Cyclical': 0.4,
  'Consumer Defensive': 0.2,
  Energy: 0.35,
  Communication: 0.45,
  ETF: 0.7,
}

function randomNormal(): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random()
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

export function simulatePriceTick(
  currentPrice: number,
  basePrice: number,
  sector: string,
  marketSentiment: number = 0
): number {
  const sectorCorr = SECTOR_CORRELATION[sector] || 0.4
  const idiosyncratic = randomNormal() * VOLATILITY
  const systematic = marketSentiment * sectorCorr
  const meanReversion = -MEAN_REVERSION_STRENGTH * (currentPrice - basePrice) / basePrice
  const totalReturn = DRIFT + systematic + idiosyncratic + meanReversion

  const newPrice = currentPrice * (1 + totalReturn)

  // Cap intraday move to ±10% from previous close to prevent simulation drift
  const lowerBound = basePrice * 0.90
  const upperBound = basePrice * 1.10
  return Math.min(upperBound, Math.max(lowerBound, newPrice))
}

export function simulateBatchPriceTick(
  stocks: Array<{ symbol: string; currentPrice: number; previousClose: number; sector: string }>
): Record<string, number> {
  // Generate market-wide sentiment for this tick
  const marketSentiment = randomNormal() * 0.005

  const updates: Record<string, number> = {}
  for (const stock of stocks) {
    const newPrice = simulatePriceTick(
      stock.currentPrice,
      stock.previousClose,
      stock.sector,
      marketSentiment
    )
    updates[stock.symbol] = parseFloat(newPrice.toFixed(2))
  }
  return updates
}

export function generateIntradayHistory(
  basePrice: number,
  _sector: string,
  pointsBack: number = 78
): Array<{ price: number; timestamp: Date }> {
  const points: Array<{ price: number; timestamp: Date }> = []
  let price = basePrice * (0.98 + Math.random() * 0.04)
  const now = new Date()

  for (let i = pointsBack; i >= 0; i--) {
    const change = (Math.random() - 0.495) * basePrice * 0.006
    price = Math.max(price + change, basePrice * 0.85)
    points.push({
      price: parseFloat(price.toFixed(2)),
      timestamp: new Date(now.getTime() - i * 5 * 60 * 1000),
    })
  }
  return points
}

// ─── Black-Scholes Options Pricing ───────────────────────────────────────────

function normCdf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
  const sign = x < 0 ? -1 : 1
  const t = 1 / (1 + p * Math.abs(x) * 0.5)
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI)
  return 0.5 * (1 + sign * (2 * y - 1))
}

function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

export interface BlackScholesResult {
  price: number
  delta: number
  gamma: number
  theta: number
  vega: number
}

export function blackScholes(
  S: number,   // spot price
  K: number,   // strike price
  T: number,   // time to expiry in years
  r: number,   // risk-free rate (annualized)
  sigma: number, // implied volatility (annualized)
  type: 'CALL' | 'PUT'
): BlackScholesResult {
  const t = Math.max(T, 0.001)
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * t) / (sigma * Math.sqrt(t))
  const d2 = d1 - sigma * Math.sqrt(t)

  const npd1 = normPdf(d1)

  const price = type === 'CALL'
    ? S * normCdf(d1) - K * Math.exp(-r * t) * normCdf(d2)
    : K * Math.exp(-r * t) * normCdf(-d2) - S * normCdf(-d1)

  const delta = type === 'CALL' ? normCdf(d1) : normCdf(d1) - 1
  const gamma = npd1 / (S * sigma * Math.sqrt(t))
  const theta = (type === 'CALL'
    ? -(S * npd1 * sigma) / (2 * Math.sqrt(t)) - r * K * Math.exp(-r * t) * normCdf(d2)
    : -(S * npd1 * sigma) / (2 * Math.sqrt(t)) + r * K * Math.exp(-r * t) * normCdf(-d2)
  ) / 365
  const vega = S * npd1 * Math.sqrt(t) / 100

  return {
    price: Math.max(price, 0),
    delta: parseFloat(delta.toFixed(4)),
    gamma: parseFloat(gamma.toFixed(6)),
    theta: parseFloat(theta.toFixed(4)),
    vega: parseFloat(vega.toFixed(4)),
  }
}

const SECTOR_IV: Record<string, number> = {
  Technology: 0.40,
  Financial: 0.28,
  Healthcare: 0.35,
  Energy: 0.35,
  'Consumer Cyclical': 0.30,
  'Consumer Defensive': 0.22,
  Communication: 0.32,
  ETF: 0.20,
}

export function deriveImpliedVolatility(sector: string, vix: number = 20): number {
  const base = SECTOR_IV[sector] ?? 0.30
  // Scale by VIX normalised to a baseline of 20 (typical long-run average)
  return base * (vix / 20)
}

export interface OptionChainContract {
  stockSymbol: string
  optionType: 'CALL' | 'PUT'
  strikePrice: number
  expiresAt: Date
  price: number
  delta: number
  gamma: number
  theta: number
  vega: number
}

function nextFridays(from: Date, count: number): Date[] {
  const results: Date[] = []
  const d = new Date(from)
  d.setHours(16, 0, 0, 0)
  const dayOfWeek = d.getDay()
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7
  d.setDate(d.getDate() + daysUntilFriday)
  for (let i = 0; i < count; i++) {
    results.push(new Date(d))
    d.setDate(d.getDate() + 7)
  }
  return results
}

function lastFridayOfMonth(year: number, month: number): Date {
  const d = new Date(year, month + 1, 0) // last day of month
  d.setDate(d.getDate() - ((d.getDay() + 2) % 7))
  d.setHours(16, 0, 0, 0)
  return d
}

export function generateOptionChain(
  symbol: string,
  currentPrice: number,
  sector: string,
  referenceDate: Date = new Date()
): OptionChainContract[] {
  const sigma = deriveImpliedVolatility(sector)
  const r = 0.05

  const strikeMultipliers = [0.80, 0.85, 0.90, 0.95, 1.0, 1.05, 1.10, 1.15, 1.20]
  const strikes = [...new Set(
    strikeMultipliers.map(m => Math.round(currentPrice * m))
  )]

  const weeklies = nextFridays(referenceDate, 4)
  const monthlies: Date[] = []
  for (let i = 1; i <= 3; i++) {
    const target = new Date(referenceDate)
    target.setMonth(target.getMonth() + i)
    const lf = lastFridayOfMonth(target.getFullYear(), target.getMonth())
    if (!weeklies.some(w => w.getTime() === lf.getTime())) {
      monthlies.push(lf)
    }
  }
  const expiries = [...weeklies, ...monthlies]

  const contracts: OptionChainContract[] = []
  for (const expiresAt of expiries) {
    const T = (expiresAt.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
    if (T <= 0) continue
    for (const strike of strikes) {
      for (const optionType of ['CALL', 'PUT'] as const) {
        const greeks = blackScholes(currentPrice, strike, T, r, sigma, optionType)
        contracts.push({
          stockSymbol: symbol,
          optionType,
          strikePrice: strike,
          expiresAt,
          ...greeks,
        })
      }
    }
  }
  return contracts
}

// ─── Limit Orders ─────────────────────────────────────────────────────────────

export function checkLimitOrders(
  orders: Array<{ id: string; side: string; limitPrice: number; stockSymbol: string }>,
  currentPrices: Record<string, number>
): string[] {
  const toFill: string[] = []
  for (const order of orders) {
    const price = currentPrices[order.stockSymbol]
    if (!price) continue

    if (order.side === 'BUY' && price <= order.limitPrice) {
      toFill.push(order.id)
    } else if (order.side === 'SELL' && price >= order.limitPrice) {
      toFill.push(order.id)
    }
  }
  return toFill
}
