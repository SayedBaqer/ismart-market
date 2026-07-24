import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    await prisma.product.update({
      where: { slug, isActive: true },
      data: { views: { increment: 1 } },
    })
  } catch {
    // Silently ignore — product may not exist or already deleted
  }
  return NextResponse.json({ ok: true })
}
