import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fauxfolio.com'
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/learn', '/privacy'],
        disallow: ['/api/', '/dashboard', '/portfolio', '/markets', '/watchlist', '/orders', '/profile', '/leagues', '/tournaments'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
