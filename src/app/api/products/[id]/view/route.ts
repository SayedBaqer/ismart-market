import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// The URL segment is a product slug, but lives under [id] to avoid
// a Next.js dynamic-param naming conflict with the [id] CRUD route.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params
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
