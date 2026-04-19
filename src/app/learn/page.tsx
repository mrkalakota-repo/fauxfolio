import Link from 'next/link'
import {
  TrendingUp, BookOpen, BarChart2, ShieldCheck, Zap,
  ArrowUpRight, ArrowDownRight, AlertTriangle, DollarSign,
  ChevronRight, Clock, Globe,
} from 'lucide-react'

export const metadata = { title: 'Trading 101 — FauxFolio' }

function Section({ id, icon, title, color, children }: {
  id: string
  icon: React.ReactNode
  title: string
  color: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className={`flex items-center gap-3 mb-5 pb-3 border-b border-brand-border`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          {icon}
        </div>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Concept({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-brand-border/50 last:border-0">
      <span className="text-green-400 font-semibold text-sm min-w-[130px] flex-shrink-0 pt-0.5">{term}</span>
      <span className="text-gray-300 text-sm leading-relaxed">{children}</span>
    </div>
  )
}

function Callout({ type, children }: { type: 'tip' | 'warn'; children: React.ReactNode }) {
  const styles = type === 'tip'
    ? 'bg-green-500/10 border-green-500/30 text-green-200'
    : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200'
  return (
    <div className={`flex gap-2.5 p-4 rounded-xl border text-sm leading-relaxed mt-4 ${styles}`}>
      {type === 'tip'
        ? <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" />
        : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
      <span>{children}</span>
    </div>
  )
}

const TOC = [
  { id: 'basics',     label: 'Market Basics' },
  { id: 'orders',     label: 'Order Types' },
  { id: 'reading',    label: 'Reading a Stock' },
  { id: 'portfolio',  label: 'Portfolio Management' },
  { id: 'options',    label: 'Options Trading' },
  { id: 'risk',       label: 'Risk Management' },
]

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-brand-dark text-white">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-brand-dark/80 backdrop-blur-md border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-black" />
            </div>
            <span className="font-bold text-lg">FauxFolio</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link href="/register" className="text-sm bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2 rounded-xl transition-colors">
              Start Free
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex gap-10">
        {/* Sidebar TOC — sticky on desktop */}
        <aside className="hidden lg:block w-52 flex-shrink-0">
          <div className="sticky top-24">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Contents</p>
            <nav className="space-y-1">
              {TOC.map(t => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  className="block text-sm text-gray-400 hover:text-white py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  {t.label}
                </a>
              ))}
            </nav>
            <div className="mt-8 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <p className="text-xs text-green-300 leading-relaxed mb-3">
                Ready to practice what you've learned?
              </p>
              <Link href="/register" className="flex items-center gap-1 text-xs font-semibold text-green-400 hover:text-green-300">
                Start trading free <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-14">
          {/* Hero */}
          <div>
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1 text-green-400 text-xs font-semibold mb-4">
              <BookOpen className="w-3.5 h-3.5" /> Trading 101
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-3">Learn to Trade</h1>
            <p className="text-gray-400 text-lg leading-relaxed max-w-2xl">
              Everything you need to understand stock markets, read charts, and build a strategy — from first principles.
            </p>
          </div>

          {/* 1. Market Basics */}
          <Section id="basics" icon={<Globe className="w-4.5 h-4.5 text-blue-400" />} title="Market Basics" color="bg-blue-500/15">
            <p className="text-gray-400 text-sm mb-5 leading-relaxed">
              A stock represents a fractional ownership stake in a company. When you buy a share, you own a tiny piece of that business and participate in its profits and losses.
            </p>
            <div className="card p-4 mb-4">
              <Concept term="Stock Exchange">
                A marketplace where buyers and sellers trade stocks. The two largest US exchanges are the <strong className="text-white">NYSE</strong> (New York Stock Exchange) and <strong className="text-white">NASDAQ</strong>.
              </Concept>
              <Concept term="Market Hours">
                US markets trade Monday–Friday, <strong className="text-white">9:30 AM – 4:00 PM ET</strong>. Pre-market (4–9:30 AM) and after-hours (4–8 PM) trading exists but has lower liquidity.
              </Concept>
              <Concept term="Bull Market">
                A period of rising prices, generally defined as a 20%+ gain from a recent low. Typically driven by economic growth and investor optimism.
              </Concept>
              <Concept term="Bear Market">
                A decline of 20%+ from recent highs. Driven by slowing growth, rising rates, or fear. Historically lasts 9–18 months.
              </Concept>
              <Concept term="Liquidity">
                How easily a stock can be bought or sold without moving its price. Large-cap stocks (AAPL, MSFT) are highly liquid; small-caps are not.
              </Concept>
              <Concept term="Bid / Ask Spread">
                The bid is the highest price a buyer will pay; the ask is the lowest a seller will accept. The spread is the difference — your immediate cost of trading.
              </Concept>
            </div>
            <Callout type="tip">
              FauxFolio simulates real market hours using live Finnhub data. Outside market hours, the engine uses Geometric Brownian Motion — the same math behind Black-Scholes options pricing.
            </Callout>
          </Section>

          {/* 2. Order Types */}
          <Section id="orders" icon={<Zap className="w-4.5 h-4.5 text-yellow-400" />} title="Order Types" color="bg-yellow-500/15">
            <p className="text-gray-400 text-sm mb-5 leading-relaxed">
              How you submit an order determines when and at what price your trade executes. Choosing the right order type is critical to getting a good fill.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              {[
                {
                  type: 'Market Order',
                  badge: 'Instant',
                  badgeColor: 'bg-green-500/20 text-green-400',
                  desc: 'Executes immediately at the best available price. Simple and reliable for liquid stocks, but you\'re not guaranteed a specific price.',
                  use: 'Best for: liquid large-caps when speed matters more than a few cents.',
                },
                {
                  type: 'Limit Order',
                  badge: 'Price-controlled',
                  badgeColor: 'bg-blue-500/20 text-blue-400',
                  desc: 'Only executes at your specified price or better. A buy limit executes at or below your price; a sell limit at or above.',
                  use: 'Best for: entering positions at a specific target, avoiding bad fills on volatile stocks.',
                },
                {
                  type: 'Stop-Loss',
                  badge: 'Risk protection',
                  badgeColor: 'bg-red-500/20 text-red-400',
                  desc: 'Becomes a market order when the stock hits your stop price. Automatically exits a losing position to cap your downside.',
                  use: 'Best for: protecting gains and limiting losses when you can\'t watch the market.',
                },
                {
                  type: 'Stop-Limit',
                  badge: 'Hybrid',
                  badgeColor: 'bg-purple-500/20 text-purple-400',
                  desc: 'Triggered like a stop order but converts to a limit order. Prevents a bad fill on a fast-moving stock — but risks not filling at all.',
                  use: 'Best for: volatile stocks where you need downside protection but want price control.',
                },
              ].map(o => (
                <div key={o.type} className="card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-sm">{o.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${o.badgeColor}`}>{o.badge}</span>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed mb-2">{o.desc}</p>
                  <p className="text-xs text-gray-500 italic">{o.use}</p>
                </div>
              ))}
            </div>
            <Callout type="tip">
              FauxFolio supports <strong>Market</strong> and <strong>Limit</strong> orders. Practice setting limit orders 1–2% below the current price to simulate patient buying.
            </Callout>
          </Section>

          {/* 3. Reading a Stock */}
          <Section id="reading" icon={<BarChart2 className="w-4.5 h-4.5 text-purple-400" />} title="Reading a Stock" color="bg-purple-500/15">
            <p className="text-gray-400 text-sm mb-5 leading-relaxed">
              A stock's page is packed with data. Here's what the key numbers mean and how to use them.
            </p>
            <div className="card p-4 mb-4">
              <Concept term="Ticker Symbol">The stock's unique abbreviation (e.g., AAPL = Apple, TSLA = Tesla). US tickers are 1–4 letters.</Concept>
              <Concept term="Market Cap">Share price × total shares outstanding. The primary measure of a company's size. Large cap: $10B+, Mid cap: $2–10B, Small cap: under $2B.</Concept>
              <Concept term="Volume">Number of shares traded today. High volume confirms a price move; low volume makes it suspect. Compare to the 30-day average volume.</Concept>
              <Concept term="P/E Ratio">Price-to-Earnings: share price ÷ earnings per share (EPS). Measures how much you're paying for $1 of profit. A P/E of 20 means investors pay $20 per $1 of earnings. Higher P/E = growth expectations baked in.</Concept>
              <Concept term="52-Week Range">The stock's high and low over the past year. Buying near the 52-week low can indicate value; near the high may signal momentum.</Concept>
              <Concept term="Beta">Measures volatility relative to the S&P 500. Beta of 1.5 = moves 50% more than the index. High-beta stocks amplify both gains and losses.</Concept>
              <Concept term="Dividend Yield">Annual dividend ÷ share price. Only relevant for dividend-paying stocks. A 3% yield means $3 paid per year on a $100 stock.</Concept>
              <Concept term="EPS (TTM)">Earnings Per Share (trailing twelve months). The company's net profit divided by shares outstanding. Rising EPS = growing profits.</Concept>
            </div>
            <Callout type="warn">
              Never use a single metric in isolation. A low P/E can mean undervalued — or it can mean the business is declining. Always cross-reference multiple data points.
            </Callout>
          </Section>

          {/* 4. Portfolio Management */}
          <Section id="portfolio" icon={<DollarSign className="w-4.5 h-4.5 text-green-400" />} title="Portfolio Management" color="bg-green-500/15">
            <p className="text-gray-400 text-sm mb-5 leading-relaxed">
              A great portfolio isn't just picking winners — it's managing risk through structure, sizing, and discipline.
            </p>
            <div className="space-y-4 mb-4">
              <div className="card p-4">
                <h3 className="font-bold text-sm mb-2">Diversification</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Spread capital across multiple stocks, sectors, and asset classes. If one position falls 50%, a diversified portfolio might only drop 5%. Rule of thumb: no single position should exceed 10–15% of your total portfolio.
                </p>
              </div>
              <div className="card p-4">
                <h3 className="font-bold text-sm mb-2">Position Sizing</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Decide how much to allocate to each trade based on conviction and risk. The <strong className="text-white">2% rule</strong>: never risk more than 2% of your total portfolio on a single trade. With $10,000, that's $200 max loss per position.
                </p>
              </div>
              <div className="card p-4">
                <h3 className="font-bold text-sm mb-2">Rebalancing</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Over time, winners grow to dominate your portfolio, creating unintended concentration. Rebalancing — selling winners and buying laggards — restores your target allocation. Most investors rebalance quarterly or annually.
                </p>
              </div>
              <div className="card p-4">
                <h3 className="font-bold text-sm mb-2">Cash Reserve</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Keeping 5–20% in cash gives you "dry powder" to buy dips without selling existing positions. During market crashes, cash is your most powerful asset.
                </p>
              </div>
            </div>
            <Callout type="tip">
              In FauxFolio, track your portfolio allocation on the Portfolio page. Aim to hold 5–10 positions across different sectors before going deep into any single stock.
            </Callout>
          </Section>

          {/* 5. Options Trading */}
          <Section id="options" icon={<TrendingUp className="w-4.5 h-4.5 text-orange-400" />} title="Options Trading" color="bg-orange-500/15">
            <p className="text-gray-400 text-sm mb-5 leading-relaxed">
              Options are contracts that give you the <em>right, but not the obligation</em>, to buy or sell a stock at a fixed price before a specific date. They're powerful — and complex.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="card p-4 border-green-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowUpRight className="w-4 h-4 text-green-400" />
                  <span className="font-bold text-sm text-green-400">Call Option</span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">
                  The right to <strong className="text-white">buy</strong> 100 shares at the strike price before expiry. You buy calls when you're bullish on the stock.
                </p>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Example: AAPL $200 Call, exp. June 20</div>
                  <div>If AAPL hits $210, your call is worth ~$10/share × 100 = $1,000</div>
                  <div>If AAPL stays below $200, the call expires worthless</div>
                </div>
              </div>
              <div className="card p-4 border-red-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                  <span className="font-bold text-sm text-red-400">Put Option</span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">
                  The right to <strong className="text-white">sell</strong> 100 shares at the strike price before expiry. You buy puts when you're bearish or want to hedge a long position.
                </p>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Example: TSLA $240 Put, exp. June 20</div>
                  <div>If TSLA drops to $220, your put is worth ~$20/share × 100 = $2,000</div>
                  <div>If TSLA stays above $240, the put expires worthless</div>
                </div>
              </div>
            </div>

            <div className="card p-4 mb-4">
              <h3 className="font-bold text-sm mb-3">Key Options Concepts</h3>
              <Concept term="Premium">The price you pay for the option contract. This is your maximum loss when buying options.</Concept>
              <Concept term="Strike Price">The fixed price at which the option lets you buy (call) or sell (put) the underlying stock.</Concept>
              <Concept term="Expiration Date">The last day the option can be exercised. Options lose value as expiry approaches — this is called time decay.</Concept>
              <Concept term="In / Out of the Money">ITM = the option has intrinsic value (call: stock above strike). OTM = the option would be worthless if exercised today.</Concept>
              <Concept term="Delta (Δ)">How much the option price moves per $1 move in the stock. A delta of 0.5 means the option gains $0.50 for every $1 the stock rises.</Concept>
              <Concept term="Theta (Θ)">Time decay. Options lose value every day as expiry approaches. Theta is your enemy when buying options, your friend when selling them.</Concept>
              <Concept term="Implied Volatility">The market's expectation of future price swings. High IV = expensive options. Buying options before earnings can be costly even if you're right about direction.</Concept>
            </div>

            <div className="card p-4 mb-4">
              <h3 className="font-bold text-sm mb-3">Common Strategies</h3>
              <div className="space-y-3 text-sm">
                <div><span className="text-white font-medium">Covered Call</span><span className="text-gray-400"> — Own 100 shares, sell a call against them. Generates income but caps your upside.</span></div>
                <div><span className="text-white font-medium">Cash-Secured Put</span><span className="text-gray-400"> — Sell a put while holding enough cash to buy the shares if assigned. A way to get paid to buy stocks you want at a discount.</span></div>
                <div><span className="text-white font-medium">Long Call</span><span className="text-gray-400"> — Buy a call option. Leveraged bullish bet with limited downside (only the premium paid).</span></div>
                <div><span className="text-white font-medium">Protective Put</span><span className="text-gray-400"> — Buy a put on a stock you own. Acts like insurance against a large drop.</span></div>
              </div>
            </div>
            <Callout type="warn">
              Options are not available in FauxFolio yet — but understanding them is essential for real investing. Options can expire completely worthless; most retail options buyers lose money. Master stock trading first.
            </Callout>
          </Section>

          {/* 6. Risk Management */}
          <Section id="risk" icon={<ShieldCheck className="w-4.5 h-4.5 text-red-400" />} title="Risk Management" color="bg-red-500/15">
            <p className="text-gray-400 text-sm mb-5 leading-relaxed">
              The traders who survive long-term aren't the ones who pick the most winners — they're the ones who protect their capital when they're wrong.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              {[
                { rule: '2% Rule', desc: 'Never risk more than 2% of your total account on a single trade. Lets you survive 50 consecutive losses before account ruin.' },
                { rule: 'Cut Losses Quickly', desc: 'Set a max loss per trade (e.g., 7-8%) and stick to it. Letting a small loss become a large one is the most common beginner mistake.' },
                { rule: 'Let Winners Run', desc: 'Don\'t sell a winner just because it\'s up 10%. Use trailing stop-losses to ride momentum while protecting profits.' },
                { rule: 'Avoid Revenge Trading', desc: 'After a loss, the urge to immediately win it back leads to reckless trades. Take a break and stick to your plan.' },
                { rule: 'Don\'t Chase', desc: 'If you missed the move, wait for a pullback. Buying after a stock is already up 30% in a week is chasing, not trading.' },
                { rule: 'Keep a Journal', desc: 'Record every trade: why you entered, your target, your stop, and the outcome. Patterns in your mistakes are worth more than any strategy.' },
              ].map(r => (
                <div key={r.rule} className="card p-4">
                  <div className="font-bold text-sm mb-1.5">{r.rule}</div>
                  <p className="text-gray-400 text-xs leading-relaxed">{r.desc}</p>
                </div>
              ))}
            </div>
            <Callout type="tip">
              Use FauxFolio to practice these rules with zero real-money risk. Set yourself a goal: treat your $10,000 virtual account as if it were $100,000 real dollars. The discipline you build now carries directly to real trading.
            </Callout>
          </Section>

          {/* CTA */}
          <div className="card p-8 text-center bg-green-500/5 border-green-500/20">
            <h2 className="text-2xl font-black mb-3">Put it into practice</h2>
            <p className="text-gray-400 mb-6">Start with $10,000 virtual cash. No real money required.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-black font-bold px-8 py-3 rounded-xl transition-all hover:scale-105"
              >
                Start Trading Free <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 border border-brand-border hover:border-gray-500 text-gray-300 hover:text-white px-8 py-3 rounded-xl transition-colors"
              >
                Sign In <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-brand-border mt-12 py-8 text-center text-xs text-gray-600">
        <Link href="/" className="hover:text-gray-400 mr-4">← Back to FauxFolio</Link>
        <Link href="/privacy" className="hover:text-gray-400">Privacy</Link>
        <p className="mt-3 max-w-lg mx-auto leading-relaxed">
          ⚠️ This content is for educational purposes only and does not constitute financial advice.
          Paper trading results do not guarantee real-world investment performance.
        </p>
      </footer>
    </div>
  )
}
