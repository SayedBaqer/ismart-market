import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  excerpt: z.string().max(500).optional(),
  content: z.string().optional(),
  imageUrl: z.string().optional(),
  isPublished: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const d = parsed.data
  const post = await prisma.newsPost.update({
    where: { id },
    data: {
      ...(d.title !== undefined && { title: d.title }),
      ...(d.excerpt !== undefined && { excerpt: d.excerpt }),
      ...(d.content !== undefined && { content: d.content }),
      ...(d.imageUrl !== undefined && { imageUrl: d.imageUrl || undefined }),
      ...(d.isPublished !== undefined && {
        isPublished: d.isPublished,
        publishedAt: d.isPublished ? new Date() : null,
      }),
    },
  })

  return NextResponse.json(post)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.newsPost.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
