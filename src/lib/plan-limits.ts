import type { ShopPlan } from '@prisma/client'
import { prisma } from '@/lib/db'

// Plan-based feature limits + pricing. Admin-editable base config lives in the
// Setting table (key: platform.plans); these are the fallback defaults used
// until an admin saves an override via /admin/plans. Per-shop overrides on top
// of the (possibly admin-edited) base live in `shop.settings.quotas`.
export interface PlanFeatureLimits {
  price: number // BHD per month, shown to shop owners — 0 for FREE
  branches: number
  ordersPerMonth: number
  ordersPerDay: number
}

export const DEFAULT_PLAN_CONFIG: Record<ShopPlan, PlanFeatureLimits> = {
  FREE:       { price: 0,  branches: 1,   ordersPerMonth: 100,   ordersPerDay: 30 },
  STARTER:    { price: 15, branches: 3,   ordersPerMonth: 500,   ordersPerDay: 100 },
  BUSINESS:   { price: 35, branches: 10,  ordersPerMonth: 5000,  ordersPerDay: 500 },
  ENTERPRISE: { price: 0,  branches: 999, ordersPerMonth: 99999, ordersPerDay: 99999 }, // 0 = "Contact us"
}

const PLAN_CONFIG_KEY = 'platform.plans'

/** The admin-editable base plan config — falls back to defaults for anything not yet saved. */
export async function getPlanConfig(): Promise<Record<ShopPlan, PlanFeatureLimits>> {
  const setting = await prisma.setting.findUnique({ where: { key: PLAN_CONFIG_KEY } })
  if (!setting?.value) return DEFAULT_PLAN_CONFIG
  try {
    const saved = (typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value) as Partial<Record<ShopPlan, Partial<PlanFeatureLimits>>>
    const merged = { ...DEFAULT_PLAN_CONFIG }
    for (const plan of Object.keys(DEFAULT_PLAN_CONFIG) as ShopPlan[]) {
      merged[plan] = { ...DEFAULT_PLAN_CONFIG[plan], ...(saved[plan] ?? {}) }
    }
    return merged
  } catch {
    return DEFAULT_PLAN_CONFIG
  }
}

export async function savePlanConfig(config: Record<ShopPlan, PlanFeatureLimits>) {
  await prisma.setting.upsert({
    where: { key: PLAN_CONFIG_KEY },
    update: { value: JSON.stringify(config) },
    create: { key: PLAN_CONFIG_KEY, value: JSON.stringify(config) },
  })
}

/** Effective limits for a specific shop: admin base config + this shop's own override, if any. */
export async function getEffectiveFeatureLimits(
  plan: ShopPlan,
  shopSettings: unknown,
): Promise<PlanFeatureLimits> {
  const config = await getPlanConfig()
  const base = config[plan]
  const quotas = ((shopSettings as { quotas?: Partial<PlanFeatureLimits> } | null)?.quotas) ?? {}
  return {
    price: quotas.price ?? base.price,
    branches: quotas.branches ?? base.branches,
    ordersPerMonth: quotas.ordersPerMonth ?? base.ordersPerMonth,
    ordersPerDay: quotas.ordersPerDay ?? base.ordersPerDay,
  }
}
