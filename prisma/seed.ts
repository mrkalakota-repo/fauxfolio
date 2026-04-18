import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Popular US stocks pre-seeded for fast first load
// Prices are approximate seeds — refreshed from Finnhub on first tick
const STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', currentPrice: 189.84, previousClose: 187.20, openPrice: 188.00, dayHigh: 191.05, dayLow: 187.45, volume: 52400000, marketCap: 2940000000000, description: 'Apple designs and manufactures smartphones, personal computers, tablets, wearables, and accessories.', logoUrl: 'https://logo.clearbit.com/apple.com', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', currentPrice: 415.32, previousClose: 411.80, openPrice: 413.00, dayHigh: 417.90, dayLow: 412.10, volume: 21300000, marketCap: 3080000000000, description: 'Microsoft develops and licenses software, including Windows OS, Microsoft 365, Azure cloud, Xbox gaming, and LinkedIn.', logoUrl: 'https://logo.clearbit.com/microsoft.com', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', currentPrice: 172.63, previousClose: 170.95, openPrice: 171.50, dayHigh: 174.20, dayLow: 170.80, volume: 24500000, marketCap: 2150000000000, description: 'Alphabet is the parent company of Google, operating the world\'s largest search engine, YouTube, and Google Cloud.', logoUrl: 'https://logo.clearbit.com/google.com', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', currentPrice: 186.40, previousClose: 183.75, openPrice: 184.50, dayHigh: 187.80, dayLow: 183.20, volume: 35800000, marketCap: 1950000000000, description: 'Amazon is a global e-commerce and cloud computing company. AWS is the leading cloud platform.', logoUrl: 'https://logo.clearbit.com/amazon.com', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', currentPrice: 875.20, previousClose: 862.40, openPrice: 865.00, dayHigh: 882.50, dayLow: 860.10, volume: 41200000, marketCap: 2160000000000, description: 'NVIDIA designs GPUs and AI computing infrastructure for gaming, data centers, and professional visualization.', logoUrl: 'https://logo.clearbit.com/nvidia.com', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Cyclical', currentPrice: 248.50, previousClose: 241.30, openPrice: 243.00, dayHigh: 251.80, dayLow: 240.50, volume: 98700000, marketCap: 792000000000, description: 'Tesla designs and manufactures electric vehicles, energy storage, and solar products.', logoUrl: 'https://logo.clearbit.com/tesla.com', exchange: 'NASDAQ' },
  { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology', currentPrice: 502.30, previousClose: 496.80, openPrice: 498.50, dayHigh: 505.90, dayLow: 495.60, volume: 15600000, marketCap: 1280000000000, description: 'Meta operates Facebook, Instagram, and WhatsApp, and is investing in AI and the metaverse.', logoUrl: 'https://logo.clearbit.com/meta.com', exchange: 'NASDAQ' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial', currentPrice: 210.45, previousClose: 208.30, openPrice: 209.00, dayHigh: 212.10, dayLow: 207.90, volume: 9800000, marketCap: 603000000000, description: 'JPMorgan Chase is the largest U.S. bank by assets, providing investment banking and financial services.', logoUrl: 'https://logo.clearbit.com/jpmorganchase.com', exchange: 'NYSE' },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Financial', currentPrice: 278.90, previousClose: 275.60, openPrice: 276.50, dayHigh: 280.40, dayLow: 275.10, volume: 6700000, marketCap: 567000000000, description: 'Visa operates the world\'s largest retail electronic payments network.', logoUrl: 'https://logo.clearbit.com/visa.com', exchange: 'NYSE' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', currentPrice: 152.30, previousClose: 151.80, openPrice: 152.00, dayHigh: 153.50, dayLow: 151.20, volume: 7300000, marketCap: 365000000000, description: 'Johnson & Johnson is a global healthcare company with pharmaceuticals and medical devices segments.', logoUrl: 'https://logo.clearbit.com/jnj.com', exchange: 'NYSE' },
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Defensive', currentPrice: 68.25, previousClose: 67.50, openPrice: 67.80, dayHigh: 68.90, dayLow: 67.30, volume: 18900000, marketCap: 547000000000, description: 'Walmart operates a chain of hypermarkets, discount department stores, and grocery stores worldwide.', logoUrl: 'https://logo.clearbit.com/walmart.com', exchange: 'NYSE' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy', currentPrice: 110.80, previousClose: 109.40, openPrice: 109.90, dayHigh: 111.60, dayLow: 109.20, volume: 15400000, marketCap: 435000000000, description: 'ExxonMobil is one of the world\'s largest integrated oil and gas companies.', logoUrl: 'https://logo.clearbit.com/exxonmobil.com', exchange: 'NYSE' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', sector: 'ETF', currentPrice: 543.20, previousClose: 539.80, openPrice: 540.50, dayHigh: 545.10, dayLow: 539.30, volume: 85600000, marketCap: 0, description: 'The SPDR S&P 500 ETF Trust tracks the S&P 500 index, providing broad exposure to 500 large US companies.', logoUrl: 'https://logo.clearbit.com/ssga.com', exchange: 'NYSE' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', currentPrice: 158.40, previousClose: 155.20, openPrice: 156.00, dayHigh: 160.50, dayLow: 154.90, volume: 52800000, marketCap: 256000000000, description: 'AMD designs microprocessors, graphics cards, and semiconductor products for computing.', logoUrl: 'https://logo.clearbit.com/amd.com', exchange: 'NASDAQ' },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Communication', currentPrice: 685.40, previousClose: 679.20, openPrice: 681.00, dayHigh: 689.50, dayLow: 678.00, volume: 4200000, marketCap: 294000000000, description: 'Netflix is the world\'s leading streaming entertainment service with 260M+ subscribers.', logoUrl: 'https://logo.clearbit.com/netflix.com', exchange: 'NASDAQ' },
  { symbol: 'DIS', name: 'The Walt Disney Company', sector: 'Communication', currentPrice: 97.85, previousClose: 96.40, openPrice: 96.80, dayHigh: 98.70, dayLow: 96.10, volume: 12300000, marketCap: 178000000000, description: 'Disney operates theme parks, film studios, streaming services (Disney+), and broadcast networks.', logoUrl: 'https://logo.clearbit.com/disney.com', exchange: 'NYSE' },
  { symbol: 'COIN', name: 'Coinbase Global Inc.', sector: 'Financial', currentPrice: 218.60, previousClose: 210.40, openPrice: 212.00, dayHigh: 222.30, dayLow: 209.80, volume: 8900000, marketCap: 52000000000, description: 'Coinbase is a leading cryptocurrency exchange platform.', logoUrl: 'https://logo.clearbit.com/coinbase.com', exchange: 'NASDAQ' },
  { symbol: 'PLTR', name: 'Palantir Technologies', sector: 'Technology', currentPrice: 28.40, previousClose: 27.60, openPrice: 27.90, dayHigh: 29.10, dayLow: 27.40, volume: 45600000, marketCap: 59000000000, description: 'Palantir builds data analysis platforms for government and commercial clients.', logoUrl: 'https://logo.clearbit.com/palantir.com', exchange: 'NYSE' },
  { symbol: 'RIVN', name: 'Rivian Automotive Inc.', sector: 'Consumer Cyclical', currentPrice: 12.40, previousClose: 12.10, openPrice: 12.20, dayHigh: 12.80, dayLow: 12.00, volume: 28000000, marketCap: 11800000000, description: 'Rivian designs and manufactures electric adventure vehicles and delivery vans.', logoUrl: 'https://logo.clearbit.com/rivian.com', exchange: 'NASDAQ' },
  { symbol: 'SOFI', name: 'SoFi Technologies Inc.', sector: 'Financial', currentPrice: 7.85, previousClose: 7.60, openPrice: 7.65, dayHigh: 8.10, dayLow: 7.55, volume: 32100000, marketCap: 7500000000, description: 'SoFi offers personal loans, mortgages, credit cards, investing, and banking services.', logoUrl: 'https://logo.clearbit.com/sofi.com', exchange: 'NASDAQ' },
  { symbol: 'BAC', name: 'Bank of America Corp', sector: 'Financial', currentPrice: 38.50, previousClose: 37.90, openPrice: 38.10, dayHigh: 38.90, dayLow: 37.80, volume: 42000000, marketCap: 295000000000, description: 'Bank of America is a global financial services company providing banking, investing, and risk management.', logoUrl: 'https://logo.clearbit.com/bankofamerica.com', exchange: 'NYSE' },
  { symbol: 'INTC', name: 'Intel Corporation', sector: 'Technology', currentPrice: 31.20, previousClose: 30.80, openPrice: 31.00, dayHigh: 31.70, dayLow: 30.60, volume: 35000000, marketCap: 131000000000, description: 'Intel designs and manufactures microprocessors and other semiconductor products.', logoUrl: 'https://logo.clearbit.com/intel.com', exchange: 'NASDAQ' },
  { symbol: 'GS', name: 'Goldman Sachs Group', sector: 'Financial', currentPrice: 482.30, previousClose: 478.20, openPrice: 479.00, dayHigh: 484.50, dayLow: 477.80, volume: 3200000, marketCap: 158000000000, description: 'Goldman Sachs is a global investment banking, securities, and investment management firm.', logoUrl: 'https://logo.clearbit.com/goldmansachs.com', exchange: 'NYSE' },
  { symbol: 'UBER', name: 'Uber Technologies Inc.', sector: 'Technology', currentPrice: 72.40, previousClose: 71.20, openPrice: 71.60, dayHigh: 73.10, dayLow: 71.00, volume: 18500000, marketCap: 148000000000, description: 'Uber operates ride-sharing, food delivery (Uber Eats), and freight platforms globally.', logoUrl: 'https://logo.clearbit.com/uber.com', exchange: 'NYSE' },
  { symbol: 'SPOT', name: 'Spotify Technology SA', sector: 'Communication', currentPrice: 385.60, previousClose: 381.40, openPrice: 382.00, dayHigh: 388.20, dayLow: 380.50, volume: 2800000, marketCap: 74000000000, description: 'Spotify is the world\'s largest music streaming service with 600M+ users.', logoUrl: 'https://logo.clearbit.com/spotify.com', exchange: 'NYSE' },
]

async function main() {
  console.log('🌱 Seeding database...')

  await prisma.priceHistory.deleteMany()
  await prisma.portfolioSnapshot.deleteMany()
  await prisma.watchlistItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.holding.deleteMany()
  await prisma.stock.deleteMany()
  await prisma.user.deleteMany()

  for (const stock of STOCKS) {
    await prisma.stock.create({ data: stock })

    const points = []
    let price = stock.previousClose
    const now = new Date()
    for (let i = 30 * 78; i >= 0; i--) {
      price = Math.max(price + (Math.random() - 0.495) * stock.currentPrice * 0.008, stock.currentPrice * 0.5)
      points.push({
        stockSymbol: stock.symbol,
        price: parseFloat(price.toFixed(2)),
        volume: Math.floor(Math.random() * 100000 + 50000),
        timestamp: new Date(now.getTime() - i * 5 * 60 * 1000),
      })
    }
    for (let i = 0; i < points.length; i += 500) {
      await prisma.priceHistory.createMany({ data: points.slice(i, i + 500) })
    }
    console.log(`  ✓ ${stock.symbol}`)
  }

  const hashedPin = await bcrypt.hash('123456', 12)
  const demoUser = await prisma.user.create({
    data: {
      phone: '5555550100',
      pin: hashedPin,
      name: 'Demo Trader',
      cashBalance: 7843.52,
    },
  })

  for (const h of [
    { symbol: 'AAPL', shares: 5, avgCost: 182.30 },
    { symbol: 'NVDA', shares: 2, avgCost: 820.00 },
    { symbol: 'TSLA', shares: 8, avgCost: 235.60 },
    { symbol: 'META', shares: 3, avgCost: 480.20 },
  ]) {
    await prisma.holding.create({
      data: { userId: demoUser.id, stockSymbol: h.symbol, shares: h.shares, avgCost: h.avgCost },
    })
  }

  for (const symbol of ['MSFT', 'GOOGL', 'AMZN', 'AMD', 'NFLX']) {
    await prisma.watchlistItem.create({ data: { userId: demoUser.id, stockSymbol: symbol } })
  }

  let pv = 10000
  const now = new Date()
  const snaps = []
  for (let i = 90; i >= 0; i--) {
    pv = Math.max(pv + (Math.random() - 0.48) * pv * 0.02, 5000)
    snaps.push({
      userId: demoUser.id,
      totalValue: parseFloat(pv.toFixed(2)),
      cashBalance: demoUser.cashBalance,
      snapshotAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
    })
  }
  await prisma.portfolioSnapshot.createMany({ data: snaps })

  console.log('\n✅ Seed complete!')
  console.log('📱 Demo login: phone=5555550100  PIN=123456')
}

main().catch(console.error).finally(() => prisma.$disconnect())
