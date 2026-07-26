import type { ShopPlan } from '@prisma/client'

// Plan-based feature limits. Per-shop overrides live in `shop.settings.quotas`
// (same object used by the admin shop-detail page's products/staff/orders quota bars).
export interface PlanFeatureLimits {
  branches: number
  ordersPerMonth: number
  ordersPerDay: number
}

export const PLAN_FEATURE_LIMITS: Record<ShopPlan, PlanFeatureLimits> = {
  FREE:       { branches: 1,   ordersPerMonth: 100,   ordersPerDay: 30 },
  STARTER:    { branches: 3,   ordersPerMonth: 500,   ordersPerDay: 100 },
  BUSINESS:   { branches: 10,  ordersPerMonth: 5000,  ordersPerDay: 500 },
  ENTERPRISE: { branches: 999, ordersPerMonth: 99999, ordersPerDay: 99999 },
}

export function getEffectiveFeatureLimits(
  plan: ShopPlan,
  settings: unknown,
): PlanFeatureLimits {
  const base = PLAN_FEATURE_LIMITS[plan]
  const quotas = ((settings as { quotas?: Partial<PlanFeatureLimits> } | null)?.quotas) ?? {}
  return {
    branches: quotas.branches ?? base.branches,
    ordersPerMonth: quotas.ordersPerMonth ?? base.ordersPerMonth,
    ordersPerDay: quotas.ordersPerDay ?? base.ordersPerDay,
  }
}
