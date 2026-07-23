import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

function getNewsPolicy(settings: Record<string, unknown>): 'AUTO' | 'APPROVE' {
  const policy = settings.approvalPolicy as Record<string, unknown> | undefined
  const acts = (policy?.activities ?? {}) as Record<string, string>
  return acts.news === 'AUTO' ? 'AUTO' : 'APPROVE'
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  const news = await prisma.shopNews.findMany({
    where: { shopId: shopUser.shopId },
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { name: true, email: true } }, reviewer: { select: { name: true } } },
  })

  // Fetch policy to inform the UI
  const shop = await prisma.shop.findUnique({ where: { id: shopUser.shopId }, select: { settings: true } })
  const settings = (shop?.settings ?? {}) as Record<string, unknown>
  const newsPolicy = getNewsPolicy(settings)

  return NextResponse.json({ news, newsPolicy })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser || !['MANAGER', 'STAFF'].includes(shopUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { title, body, imageUrl, submit } = await req.json()
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
  }

  // Check approval policy
  const shop = await prisma.shop.findUnique({ where: { id: shopUser.shopId }, select: { settings: true } })
  const settings = (shop?.settings ?? {}) as Record<string, unknown>
  const newsPolicy = getNewsPolicy(settings)

  // AUTO policy → publish immediately; APPROVE policy → set PENDING for review
  let status: 'DRAFT' | 'PENDING' | 'PUBLISHED' = 'DRAFT'
  let publishedAt: Date | null = null

  if (submit) {
    if (newsPolicy === 'AUTO') {
      status = 'PUBLISHED'
      publishedAt = new Date()
    } else {
      status = 'PENDING'
    }
  }

  const post = await prisma.shopNews.create({
    data: {
      shopId: shopUser.shopId,
      authorId: session.user.id,
      title: title.trim(),
      body: body.trim(),
      imageUrl: imageUrl?.trim() || null,
      status,
      publishedAt,
    },
  })

  return NextResponse.json({ post, autoPublished: status === 'PUBLISHED' }, { status: 201 })
}
