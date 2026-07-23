import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; newsId: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as { role?: string }).role
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { newsId } = await params
  const { action, note } = await req.json() // action: 'approve' | 'reject'

  const post = await prisma.shopNews.findUnique({ where: { id: newsId } })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.shopNews.update({
    where: { id: newsId },
    data: {
      status: action === 'approve' ? 'PUBLISHED' : 'REJECTED',
      reviewerId: session.user.id,
      reviewNote: note?.trim() || null,
      publishedAt: action === 'approve' ? new Date() : null,
    },
  })

  return NextResponse.json({ post: updated })
}
