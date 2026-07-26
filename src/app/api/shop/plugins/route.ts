import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { getShopPluginStatus } from '@/lib/services/plugin.service'
import { getEffectivePlan } from '@/lib/plan-limits'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({
    where: { userId: session.user.id },
    select: { shopId: true, shop: { select: { plan: true, paymentStatus: true } } },
  })
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  const effectivePlan = getEffectivePlan(shopUser.shop.plan, shopUser.shop.paymentStatus)
  const plugins = await getShopPluginStatus(shopUser.shopId, effectivePlan)
  return NextResponse.json({ plugins, plan: shopUser.shop.plan, effectivePlan })
}
