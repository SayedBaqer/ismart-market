import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { getShopPluginStatus } from '@/lib/services/plugin.service'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({
    where: { userId: session.user.id },
    select: { shopId: true, shop: { select: { plan: true } } },
  })
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  const plugins = await getShopPluginStatus(shopUser.shopId, shopUser.shop.plan)
  return NextResponse.json({ plugins, plan: shopUser.shop.plan })
}
