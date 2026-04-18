import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { symbol } = await params
  await prisma.watchlistItem.deleteMany({
    where: {
      userId: session.userId,
      stockSymbol: symbol.toUpperCase(),
    },
  })

  return NextResponse.json({ success: true })
}
