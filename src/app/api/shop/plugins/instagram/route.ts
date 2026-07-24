import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  const shop = await prisma.shop.findUnique({ where: { id: shopUser.shopId }, select: { settings: true } })
  const settings = (shop?.settings ?? {}) as Record<string, unknown>
  const plugin = (settings.plugins as Record<string, unknown> | undefined)?.instagram ?? { posts: [] }

  return NextResponse.json(plugin)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser || shopUser.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Only shop owners can manage Instagram posts' }, { status: 403 })
  }

  const body = await req.json() as { posts: { url: string; caption?: string; productSlug?: string }[] }

  const shop = await prisma.shop.findUnique({ where: { id: shopUser.shopId }, select: { settings: true } })
  const existing = (shop?.settings ?? {}) as Record<string, unknown>
  const plugins = (existing.plugins as Record<string, unknown> | undefined) ?? {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.shop.update({
    where: { id: shopUser.shopId },
    data: {
      settings: {
        ...existing,
        plugins: { ...plugins, instagram: { posts: body.posts } },
      } as any,
    },
  })

  return NextResponse.json({ success: true })
}
