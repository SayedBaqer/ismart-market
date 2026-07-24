import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

function isAdmin(role?: string) {
  return ['SUPER_ADMIN', 'ADMIN'].includes(role ?? '')
}

export async function GET() {
  const ads = await prisma.advertisement.findMany({
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json({ ads })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !isAdmin((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const ad = await prisma.advertisement.create({ data: body })
  return NextResponse.json({ ad })
}
