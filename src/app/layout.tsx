import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import NativeProvider from '@/components/NativeProvider'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fauxfolio.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'FauxFolio — Free Paper Trading Simulator',
    template: '%s | FauxFolio',
  },
  description: 'Practice stock trading risk-free with FauxFolio. Trade real stocks with virtual money, learn investing strategies, compete on leaderboards, and master options trading — no real money involved.',
  keywords: [
    'paper trading', 'stock market simulator', 'virtual trading', 'stock trading practice',
    'learn to invest', 'stock simulator', 'investing education', 'options trading simulator',
    'stock market game', 'virtual stock market', 'trading simulator free', 'portfolio simulator',
    'practice investing', 'paper trading app', 'stock market learning',
  ],
  authors: [{ name: 'FauxFolio' }],
  creator: 'FauxFolio',
  publisher: 'FauxFolio',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    siteName: 'FauxFolio',
    title: 'FauxFolio — Free Paper Trading Simulator',
    description: 'Practice stock trading risk-free. Trade real stocks with virtual money, compete on leaderboards, and master options trading.',
    url: siteUrl,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'FauxFolio — Paper Trading Simulator' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FauxFolio — Free Paper Trading Simulator',
    description: 'Practice stock trading risk-free. Trade real stocks with virtual money, compete on leaderboards, and master options trading.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FauxFolio',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0F0F0F',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
      </head>
      <body className="bg-brand-dark text-white">
        <NativeProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1A1A1A',
                color: '#fff',
                border: '1px solid #2A2A2A',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: {
                iconTheme: { primary: '#00C853', secondary: '#1A1A1A' },
              },
              error: {
                iconTheme: { primary: '#FF3B30', secondary: '#1A1A1A' },
              },
            }}
          />
        </NativeProvider>
      </body>
    </html>
  )
}
