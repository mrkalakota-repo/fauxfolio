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

  // Prevent prices from going below 10% of base
  return Math.max(newPrice, basePrice * 0.1)
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
  sector: string,
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
