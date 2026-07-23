import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser || !['MANAGER', 'STAFF'].includes(shopUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const post = await prisma.shopNews.findUnique({ where: { id } })
  if (!post || post.shopId !== shopUser.shopId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (post.status === 'PUBLISHED') {
    return NextResponse.json({ error: 'Cannot edit a published post' }, { status: 400 })
  }

  const { title, body, imageUrl, submit } = await req.json()
  const updated = await prisma.shopNews.update({
    where: { id },
    data: {
      title: title?.trim() ?? post.title,
      body: body?.trim() ?? post.body,
      imageUrl: imageUrl?.trim() || null,
      status: submit ? 'PENDING' : 'DRAFT',
      reviewNote: submit ? null : post.reviewNote,
    },
  })

  return NextResponse.json({ post: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser || shopUser.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const post = await prisma.shopNews.findUnique({ where: { id } })
  if (!post || post.shopId !== shopUser.shopId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.shopNews.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
