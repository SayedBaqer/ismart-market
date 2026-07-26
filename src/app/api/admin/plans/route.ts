import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getPlanConfig, savePlanConfig, DEFAULT_PLAN_CONFIG, type PlanFeatureLimits } from '@/lib/plan-limits'
import type { ShopPlan } from '@prisma/client'

const PLANS: ShopPlan[] = ['FREE', 'STARTER', 'BUSINESS', 'ENTERPRISE']

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = await getPlanConfig()
  return NextResponse.json(config)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as Record<string, Partial<PlanFeatureLimits>>

  const current = await getPlanConfig()
  const next = { ...current }
  for (const plan of PLANS) {
    const incoming = body[plan]
    if (!incoming) continue
    next[plan] = {
      price: Number(incoming.price ?? current[plan].price) || 0,
      branches: Math.max(0, Math.round(Number(incoming.branches ?? current[plan].branches) || DEFAULT_PLAN_CONFIG[plan].branches)),
      ordersPerMonth: Math.max(0, Math.round(Number(incoming.ordersPerMonth ?? current[plan].ordersPerMonth) || DEFAULT_PLAN_CONFIG[plan].ordersPerMonth)),
      ordersPerDay: Math.max(0, Math.round(Number(incoming.ordersPerDay ?? current[plan].ordersPerDay) || DEFAULT_PLAN_CONFIG[plan].ordersPerDay)),
    }
  }

  await savePlanConfig(next)
  return NextResponse.json(next)
}
