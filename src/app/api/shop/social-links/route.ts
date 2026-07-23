import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  const shop = await prisma.shop.findUnique({ where: { id: shopUser.shopId }, select: { settings: true } })
  if (!shop) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const settings = (shop.settings ?? {}) as Record<string, unknown>
  return NextResponse.json({ socialLinks: settings.socialLinks ?? {} })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser || shopUser.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Only shop owners can update social links' }, { status: 403 })
  }

  const body = await req.json()
  const { instagram, whatsapp, facebook, tiktok } = body as Record<string, string | undefined>

  const shop = await prisma.shop.findUnique({ where: { id: shopUser.shopId }, select: { settings: true } })
  if (!shop) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existing = (shop.settings ?? {}) as Record<string, unknown>
  const updatedSettings = {
    ...existing,
    socialLinks: {
      instagram: instagram?.trim() || '',
      whatsapp: whatsapp?.trim() || '',
      facebook: facebook?.trim() || '',
      tiktok: tiktok?.trim() || '',
    },
  }

  const updated = await prisma.shop.update({
    where: { id: shopUser.shopId },
    data: { settings: updatedSettings },
    select: { id: true, settings: true },
  })

  revalidatePath(`/shops/${shopUser.shopId}`)

  const s = (updated.settings ?? {}) as Record<string, unknown>
  return NextResponse.json({ socialLinks: s.socialLinks ?? {} })
}
