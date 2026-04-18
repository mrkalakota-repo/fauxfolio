import { NextRequest, NextResponse } from 'next/server'

export function proxy(req: NextRequest) {
  // Enforce HTTPS in production
  if (
    process.env.NODE_ENV === 'production' &&
    req.headers.get('x-forwarded-proto') === 'http'
  ) {
    const httpsUrl = `https://${req.headers.get('host')}${req.nextUrl.pathname}${req.nextUrl.search}`
    return NextResponse.redirect(httpsUrl, { status: 301 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)',
}
