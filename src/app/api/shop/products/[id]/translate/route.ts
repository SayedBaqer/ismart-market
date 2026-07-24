import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { mergeTranslation } from '@/lib/i18n/translate-content'
import type { StoreLang } from '@/lib/i18n/store'

async function getShopId(userId: string) {
  const su = await prisma.shopUser.findFirst({ where: { userId }, select: { shopId: true, role: true } })
  return su
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const su = await getShopId((session.user as { id: string }).id)
  if (!su) return NextResponse.json({ error: 'No shop' }, { status: 404 })

  const product = await prisma.product.findFirst({
    where: { id, shopId: su.shopId },
    select: { id: true, name: true, description: true, meta: true },
  })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const meta = (product.meta ?? {}) as Record<string, unknown>
  const translations = (meta.translations ?? {}) as Record<string, unknown>

  return NextResponse.json({ id: product.id, name: product.name, description: product.description, translations })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const su = await getShopId((session.user as { id: string }).id)
  if (!su || !['MANAGER', 'STAFF'].includes(su.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { lang, name, description } = body as { lang: StoreLang; name?: string; description?: string }

  if (!lang || !['ar', 'en'].includes(lang)) {
    return NextResponse.json({ error: 'Invalid lang' }, { status: 400 })
  }

  const product = await prisma.product.findFirst({
    where: { id, shopId: su.shopId },
    select: { meta: true },
  })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const newMeta = mergeTranslation(product.meta, lang, {
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
  })

  await prisma.product.update({ where: { id }, data: { meta: newMeta as never } })
  return NextResponse.json({ ok: true })
}
