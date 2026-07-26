import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { planMeets, setShopPluginEnabled } from '@/lib/services/plugin.service'

interface RouteParams { params: Promise<{ slug: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({
    where: { userId: session.user.id },
    select: { shopId: true, role: true, shop: { select: { plan: true } } },
  })
  if (!shopUser || shopUser.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Only the shop owner can manage plugins' }, { status: 403 })
  }

  const { slug } = await params
  const { enabled } = await req.json() as { enabled?: boolean }
  if (enabled === undefined) return NextResponse.json({ error: 'enabled is required' }, { status: 400 })

  const plugin = await prisma.plugin.findUnique({ where: { slug } })
  if (!plugin || !plugin.active) return NextResponse.json({ error: 'Plugin not found' }, { status: 404 })

  if (enabled && !planMeets(shopUser.shop.plan, plugin.minPlan)) {
    return NextResponse.json({
      error: `This plugin requires the ${plugin.minPlan} plan or higher. Upgrade your plan to enable it.`,
      code: 'PLAN_TOO_LOW',
    }, { status: 402 })
  }

  const shopPlugin = await setShopPluginEnabled(shopUser.shopId, slug, enabled)
  return NextResponse.json({ ok: true, shopPlugin })
}
