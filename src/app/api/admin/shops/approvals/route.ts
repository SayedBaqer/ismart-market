import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as { role?: string }).role
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Shops with pending display settings
  const shopsWithPending = await prisma.shop.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, slug: true, logoUrl: true, settings: true },
  })

  const pendingDisplays = shopsWithPending
    .filter((s) => {
      const settings = (s.settings ?? {}) as Record<string, unknown>
      const p = settings.displayPending as Record<string, unknown> | undefined
      return p?.status === 'pending'
    })
    .map((s) => {
      const settings = (s.settings ?? {}) as Record<string, unknown>
      const p = settings.displayPending as Record<string, unknown>
      return {
        shopId: s.id,
        shopName: s.name,
        shopSlug: s.slug,
        shopLogoUrl: s.logoUrl,
        submittedAt: p.submittedAt,
        sections: p.sections,
        banner: p.banner,
        tagline: p.tagline,
      }
    })

  // Pending news posts
  const pendingNews = await prisma.shopNews.findMany({
    where: { status: 'PENDING' },
    orderBy: { updatedAt: 'asc' },
    include: {
      shop: { select: { id: true, name: true, slug: true, logoUrl: true } },
      author: { select: { name: true, email: true } },
    },
  })

  return NextResponse.json({ pendingDisplays, pendingNews })
}
