import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500).optional(),
  content: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isPublished: z.boolean().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const posts = await prisma.newsPost.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(posts)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const d = parsed.data
  const slug = d.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const post = await prisma.newsPost.create({
    data: {
      title: d.title,
      slug: `${slug}-${Date.now()}`,
      excerpt: d.excerpt,
      content: d.content ?? '',
      imageUrl: d.imageUrl || undefined,
      isPublished: d.isPublished ?? false,
      publishedAt: d.isPublished ? new Date() : undefined,
    },
  })

  return NextResponse.json(post, { status: 201 })
}
