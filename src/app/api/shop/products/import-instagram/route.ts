import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { rehostImageFromUrl } from '@/lib/upload'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const su = await prisma.shopUser.findFirst({
    where: { userId: (session.user as { id: string }).id },
    select: { shopId: true, role: true, shop: { select: { currency: true } } },
  })
  if (!su || !['MANAGER', 'STAFF'].includes(su.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { instagramUrl, name, description, price, comparePrice, sku, imageUrl } = body as {
    instagramUrl: string; name: string; description?: string
    price: number; comparePrice?: number | null; sku: string; imageUrl?: string
  }

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!sku?.trim()) return NextResponse.json({ error: 'SKU is required' }, { status: 400 })

  // Check SKU uniqueness
  const existing = await prisma.product.findUnique({ where: { sku }, select: { id: true } })
  if (existing) {
    return NextResponse.json({ error: `SKU "${sku}" already exists` }, { status: 409 })
  }

  // Re-host the selected post's image on our own storage — the Instagram CDN URL
  // from oEmbed is signed/expiring and shouldn't be relied on long-term.
  let images: string[] = []
  if (imageUrl) {
    try {
      images = [await rehostImageFromUrl(imageUrl)]
    } catch (err) {
      console.error('[import-instagram] image rehost failed', err)
      // Non-fatal — product is still created, owner can add images manually
    }
  }

  const slug = `${sku.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`

  const product = await prisma.product.create({
    data: {
      shopId: su.shopId,
      sku,
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      price,
      comparePrice: comparePrice ?? null,
      images,
      isActive: false, // draft — shop owner reviews before publishing
      trackStock: false,
      meta: instagramUrl ? { instagramUrl } : {},
    },
    select: { id: true, slug: true, name: true },
  })

  return NextResponse.json({ ok: true, product }, { status: 201 })
}
