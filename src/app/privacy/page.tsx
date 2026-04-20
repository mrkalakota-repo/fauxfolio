import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'FauxFolio privacy policy — how we collect, use, and protect your data.',
  robots: { index: false, follow: false },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-brand-dark text-white">
      <header className="sticky top-0 z-40 bg-brand-dark/80 backdrop-blur-md border-b border-brand-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-black" />
            </div>
            <span className="font-bold text-lg">FauxFolio</span>
          </Link>
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-4xl font-black mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-12">Last updated: April 2026</p>

        <div className="space-y-10 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Overview</h2>
            <p>
              FauxFolio is a paper trading simulator for educational purposes. We collect minimal
              personal information and use it solely to operate the service. We never sell your data
              to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Information We Collect</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><span className="text-white font-medium">Name</span> — displayed on the leaderboard and your profile.</li>
              <li><span className="text-white font-medium">Phone number</span> — used as your login identifier, stored as a normalized 10-digit string.</li>
              <li><span className="text-white font-medium">PIN</span> — stored as a one-way bcrypt hash; we cannot recover it.</li>
              <li><span className="text-white font-medium">Trading activity</span> — orders, holdings, and portfolio snapshots generated within the app.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>To authenticate you and maintain your session.</li>
              <li>To display your portfolio, trading history, and leaderboard rank.</li>
              <li>To process virtual cash top-ups via Stripe (real payments are handled entirely by Stripe — we do not store card details).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Data Retention</h2>
            <p>
              Your data is retained for as long as your account is active. You may request deletion
              at any time (see Section 6).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Third-Party Services</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><span className="text-white font-medium">Finnhub</span> — provides real-time stock market data. Your trading activity is not shared with Finnhub.</li>
              <li><span className="text-white font-medium">Stripe</span> — processes payments for virtual cash top-ups. Governed by <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 underline">Stripe&apos;s Privacy Policy</a>.</li>
              <li><span className="text-white font-medium">AWS Amplify</span> — hosts the application. Data is stored in a PostgreSQL database in a private cloud environment.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Account Deletion</h2>
            <p className="mb-4">
              You can request permanent deletion of your account and all associated data at any time.
              To delete your account, send an email to:
            </p>
            <a
              href="mailto:mrksportsfeedback@gmail.com?subject=FauxFolio Account Deletion Request"
              className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors px-5 py-3 rounded-xl font-medium"
            >
              mrksportsfeedback@gmail.com
            </a>
            <p className="mt-4 text-sm text-gray-500">
              Please include the phone number associated with your account. We will process your
              request within 7 business days and confirm deletion by reply.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Cookies &amp; Sessions</h2>
            <p>
              We use a single httpOnly cookie (<code className="text-green-400 bg-white/5 px-1.5 py-0.5 rounded text-sm">fauxfolio_token</code>) to
              maintain your login session for up to 7 days. No tracking or advertising cookies are used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Contact</h2>
            <p>
              For any privacy-related questions or concerns, contact us at{' '}
              <a href="mailto:mrksportsfeedback@gmail.com" className="text-green-400 hover:text-green-300 underline">
                mrksportsfeedback@gmail.com
              </a>.
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-brand-border mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between text-xs text-gray-600">
          <span>© 2026 FauxFolio</span>
          <Link href="/" className="hover:text-gray-400">← Back to home</Link>
        </div>
      </footer>
    </div>
  )
}
