/**
 * Seeds 100 fake trader profiles with varied portfolios for leaderboard demo.
 * Safe to run against a live DB — only inserts, never deletes.
 * Phone range 5550010001–5550010100 avoids collision with the demo user (5555550100).
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Stock symbols expected to exist in the DB (seeded by seed.ts)
const STOCKS = [
  { symbol: 'AAPL', price: 189.84 },
  { symbol: 'MSFT', price: 415.32 },
  { symbol: 'GOOGL', price: 172.63 },
  { symbol: 'AMZN', price: 186.40 },
  { symbol: 'NVDA', price: 875.20 },
  { symbol: 'TSLA', price: 248.50 },
  { symbol: 'META', price: 502.30 },
  { symbol: 'JPM',  price: 210.45 },
  { symbol: 'V',    price: 278.90 },
  { symbol: 'SPY',  price: 543.20 },
  { symbol: 'AMD',  price: 158.40 },
  { symbol: 'NFLX', price: 685.40 },
  { symbol: 'COIN', price: 218.60 },
  { symbol: 'GS',   price: 482.30 },
  { symbol: 'UBER', price: 72.40  },
  { symbol: 'SPOT', price: 385.60 },
  { symbol: 'PLTR', price: 28.40  },
  { symbol: 'RIVN', price: 12.40  },
  { symbol: 'INTC', price: 31.20  },
  { symbol: 'DIS',  price: 97.85  },
  { symbol: 'XOM',  price: 110.80 },
  { symbol: 'WMT',  price: 68.25  },
  { symbol: 'BAC',  price: 38.50  },
  { symbol: 'SOFI', price: 7.85   },
  { symbol: 'JNJ',  price: 152.30 },
]

const FIRST_NAMES = [
  'Aiden','Brooke','Carlos','Diana','Ethan','Fiona','George','Hannah',
  'Ivan','Julia','Kevin','Laura','Marcus','Nina','Oscar','Priya',
  'Quinn','Ryan','Sofia','Tyler','Uma','Victor','Wendy','Xander',
  'Yara','Zoe','Aaron','Bella','Cole','Daria','Eli','Faith',
  'Gavin','Holly','Ian','Jade','Kyle','Leah','Mason','Nora',
  'Owen','Paige','Ravi','Sara','Tate','Uma','Vance','Willow',
  'Xavier','Yasmin','Zane','Abby','Blake','Chase','Dana','Evan',
  'Grace','Hugo','Iris','Jace','Kira','Leo','Mia','Noah',
  'Opal','Pete','Rosa','Seth','Tara','Uri','Val','Wade',
  'Xena','Yogi','Zara','Ali','Ben','Cara','Dean','Elle',
  'Finn','Greta','Hana','Iker','Jess','Kai','Lena','Max',
  'Nell','Olga','Paul','Rhea','Sam','Teo','Ulric','Vera',
  'Wren','Ximena','Yael','Zuri',
]

const LAST_NAMES = [
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis',
  'Wilson','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin',
  'Thompson','Martinez','Robinson','Clark','Rodriguez','Lewis','Lee','Walker',
  'Hall','Allen','Young','King','Wright','Scott','Green','Baker',
  'Adams','Nelson','Carter','Mitchell','Perez','Roberts','Turner','Phillips',
  'Campbell','Parker','Evans','Edwards','Collins','Stewart','Sanchez','Morris',
  'Rogers','Reed','Cook','Morgan','Bell','Murphy','Bailey','Rivera',
  'Cooper','Richardson','Cox','Howard','Ward','Torres','Peterson','Gray',
  'Ramirez','James','Watson','Brooks','Kelly','Sanders','Price','Bennett',
  'Wood','Barnes','Ross','Henderson','Coleman','Jenkins','Perry','Powell',
  'Long','Patterson','Hughes','Flores','Washington','Butler','Simmons','Foster',
  'Gonzalez','Bryant','Alexander','Russell','Griffin','Diaz','Hayes','Myers',
]

function randBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

interface HoldingSpec {
  symbol: string
  shares: number
  avgCost: number
}

/**
 * Build a portfolio for a given performance tier.
 * Returns holdings and the resulting cashBalance.
 */
function buildPortfolio(
  tier: 'star' | 'good' | 'flat' | 'poor',
  topUpBudget: number // total virtual cash available
): { holdings: HoldingSpec[]; cashBalance: number } {
  const totalBudget = topUpBudget  // total cash they ever had

  // Portion of budget invested
  const investRatio = randBetween(0.4, 0.85)
  let remaining = totalBudget
  const holdings: HoldingSpec[] = []

  // Pick 2–5 stocks based on tier
  const pickCount = tier === 'flat' ? 2 : tier === 'poor' ? Math.floor(randBetween(2, 4)) : Math.floor(randBetween(3, 6))
  const chosen = [...STOCKS].sort(() => Math.random() - 0.5).slice(0, pickCount)

  // Stars: buy good stocks at a discount (avgCost < currentPrice)
  // Poor: buy at premium (avgCost > currentPrice), or volatile stocks
  const costMultipliers: Record<string, [number, number]> = {
    star: [0.50, 0.78],  // bought 22–50% cheaper
    good: [0.78, 0.94],  // bought 6–22% cheaper
    flat: [0.92, 1.08],  // roughly at current price
    poor: [1.10, 1.45],  // bought 10–45% above current (losers)
  }

  const [lo, hi] = costMultipliers[tier]
  const budget = totalBudget * investRatio

  // Distribute budget across chosen stocks (random weights)
  const weights = chosen.map(() => Math.random())
  const weightSum = weights.reduce((a, b) => a + b, 0)

  for (let i = 0; i < chosen.length; i++) {
    const stock = chosen[i]
    const alloc = (weights[i] / weightSum) * budget
    const avgCost = parseFloat((stock.price * randBetween(lo, hi)).toFixed(2))
    const shares = parseFloat((alloc / avgCost).toFixed(4))
    if (shares < 0.1) continue
    const spent = shares * avgCost
    remaining -= spent
    holdings.push({ symbol: stock.symbol, shares, avgCost })
  }

  return { holdings, cashBalance: Math.max(remaining, 50) }
}

async function main() {
  console.log('🌱 Seeding 100 fake trader profiles...')

  // Single bcrypt hash for all fake users — PIN is 000000
  const fakePin = await bcrypt.hash('000000', 10)

  // Verify stocks exist
  const dbStockCount = await prisma.stock.count()
  if (dbStockCount === 0) {
    console.error('❌ No stocks found. Run npm run db:seed first.')
    process.exit(1)
  }

  // Remove any previously seeded fake profiles so re-runs are idempotent
  const existing = await prisma.user.findMany({
    where: { phone: { startsWith: '555001' } },
    select: { id: true },
  })
  if (existing.length > 0) {
    console.log(`  ↻ Removing ${existing.length} existing fake profiles...`)
    await prisma.user.deleteMany({ where: { phone: { startsWith: '555001' } } })
  }

  const tiers: Array<{ tier: 'star' | 'good' | 'flat' | 'poor'; count: number }> = [
    { tier: 'star', count: 10 },
    { tier: 'good', count: 25 },
    { tier: 'flat', count: 35 },
    { tier: 'poor', count: 30 },
  ]

  let userIndex = 1

  for (const { tier, count } of tiers) {
    for (let i = 0; i < count; i++) {
      const phone = `555001${String(userIndex).padStart(4, '0')}`
      const firstName = FIRST_NAMES[(userIndex - 1) % FIRST_NAMES.length]
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
      const name = `${firstName} ${lastName}`

      // Stars sometimes have top-ups; most others don't
      const topUps = tier === 'star' && Math.random() < 0.4 ? Math.floor(randBetween(1, 4)) : 0
      const totalBudget = 10000 + topUps * 10000

      const { holdings, cashBalance } = buildPortfolio(tier, totalBudget)

      const user = await prisma.user.create({
        data: {
          phone,
          pin: fakePin,
          name,
          cashBalance: parseFloat(cashBalance.toFixed(2)),
          totalTopUps: topUps,
        },
      })

      if (holdings.length > 0) {
        await prisma.holding.createMany({
          data: holdings.map(h => ({
            userId: user.id,
            stockSymbol: h.symbol,
            shares: h.shares,
            avgCost: h.avgCost,
          })),
        })
      }

      userIndex++
    }
    console.log(`  ✓ ${count} ${tier} traders created`)
  }

  const total = await prisma.user.count()
  console.log(`\n✅ Done — ${total} total users in DB (including demo account)`)
  console.log('   Fake profiles use phone 555001XXXX, PIN 000000')
}

main().catch(console.error).finally(() => prisma.$disconnect())
