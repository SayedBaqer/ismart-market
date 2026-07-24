import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const revalidate = 60

export async function GET() {
  const now = new Date()
  const ads = await prisma.advertisement.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    take: 10,
  })
  return NextResponse.json({ ads })
}
