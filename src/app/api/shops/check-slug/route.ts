import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get('slug') ?? ''
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ taken: false })
  }
  const existing = await prisma.shop.findUnique({ where: { slug }, select: { id: true } })
  return NextResponse.json({ taken: Boolean(existing) })
}
