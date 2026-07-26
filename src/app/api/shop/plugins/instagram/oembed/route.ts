import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

function getAccessToken(): string | null {
  if (process.env.INSTAGRAM_OEMBED_ACCESS_TOKEN) return process.env.INSTAGRAM_OEMBED_ACCESS_TOKEN
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    return `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`
  }
  return null
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  const { url } = await req.json() as { url?: string }
  if (!url || !/https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+/.test(url)) {
    return NextResponse.json({ error: 'Invalid Instagram post URL' }, { status: 400 })
  }

  const token = getAccessToken()
  if (!token) {
    return NextResponse.json({ configured: false })
  }

  try {
    const oembedUrl = `https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${token}&omitscript=true`
    const res = await fetch(oembedUrl)
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
      return NextResponse.json({ configured: true, error: err.error?.message ?? 'Could not fetch this post' }, { status: 200 })
    }
    const data = await res.json() as { thumbnail_url?: string; author_name?: string; title?: string }
    return NextResponse.json({
      configured: true,
      thumbnailUrl: data.thumbnail_url ?? null,
      authorName: data.author_name ?? null,
      caption: data.title ?? null,
    })
  } catch {
    return NextResponse.json({ configured: true, error: 'Could not fetch this post' })
  }
}
