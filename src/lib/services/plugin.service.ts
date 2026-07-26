import { prisma } from '@/lib/db'
import type { ShopPlan } from '@prisma/client'
import { getEffectivePlan } from '@/lib/plan-limits'

const PLAN_RANK: Record<ShopPlan, number> = { FREE: 0, STARTER: 1, BUSINESS: 2, ENTERPRISE: 3 }

export function planMeets(shopPlan: ShopPlan, minPlan: ShopPlan): boolean {
  return PLAN_RANK[shopPlan] >= PLAN_RANK[minPlan]
}

interface DefaultPlugin {
  slug: string
  name: string
  version: string
  description: string
  category: string
  icon: string
  minPlan: ShopPlan
}

// Registered plugins — new ones just get added here and will be upserted on next access.
const DEFAULT_PLUGINS: DefaultPlugin[] = [
  {
    slug: 'instagram-import',
    name: 'Instagram Import',
    version: '1.0.0',
    description: 'Paste Instagram post URLs to preview and import them as products, plus a linkable Instagram catalog on your shop page.',
    category: 'marketing',
    icon: 'Instagram',
    minPlan: 'FREE',
  },
  {
    slug: 'statistics-pro',
    name: 'Pro Statistics',
    version: '1.0.0',
    description: 'Advanced analytics: sales trends, repeat-customer rate, top categories, and low-stock forecasting.',
    category: 'analytics',
    icon: 'BarChart3',
    minPlan: 'STARTER',
  },
]

/** Idempotently ensures the built-in plugin catalogue exists in the DB. Safe to call on every request. */
export async function ensureDefaultPlugins() {
  await Promise.all(
    DEFAULT_PLUGINS.map((p) =>
      prisma.plugin.upsert({
        where: { slug: p.slug },
        update: {}, // never overwrite admin-edited fields (active/minPlan) on subsequent calls
        create: { ...p, active: true },
      })
    )
  )
}

export async function getAllPlugins() {
  await ensureDefaultPlugins()
  return prisma.plugin.findMany({ orderBy: { name: 'asc' } })
}

/** Plugin availability + enabled state for a specific shop. */
export async function getShopPluginStatus(shopId: string, shopPlan: ShopPlan) {
  await ensureDefaultPlugins()
  const [plugins, shopPlugins] = await Promise.all([
    prisma.plugin.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.shopPlugin.findMany({ where: { shopId } }),
  ])
  const enabledMap = new Map(shopPlugins.map((sp) => [sp.pluginSlug, sp]))

  return plugins.map((plugin) => {
    const sp = enabledMap.get(plugin.slug)
    const meetsPlan = planMeets(shopPlan, plugin.minPlan)
    return {
      slug: plugin.slug,
      name: plugin.name,
      description: plugin.description,
      category: plugin.category,
      icon: plugin.icon,
      minPlan: plugin.minPlan,
      locked: !meetsPlan,
      // Default to enabled (opt-out model) once the plan qualifies, unless the shop explicitly disabled it
      enabled: meetsPlan && (sp?.enabled ?? true),
    }
  })
}

/** Fast enable/plan check for gating a route — no DB write, just a read. */
export async function isPluginEnabledForShop(shopId: string, slug: string): Promise<boolean> {
  await ensureDefaultPlugins()
  const [plugin, shop, shopPlugin] = await Promise.all([
    prisma.plugin.findUnique({ where: { slug } }),
    prisma.shop.findUnique({ where: { id: shopId }, select: { plan: true, paymentStatus: true } }),
    prisma.shopPlugin.findUnique({ where: { shopId_pluginSlug: { shopId, pluginSlug: slug } } }),
  ])
  if (!plugin || !plugin.active || !shop) return false
  const effectivePlan = getEffectivePlan(shop.plan, shop.paymentStatus)
  if (!planMeets(effectivePlan, plugin.minPlan)) return false
  return shopPlugin?.enabled ?? true
}

export async function setShopPluginEnabled(shopId: string, slug: string, enabled: boolean) {
  return prisma.shopPlugin.upsert({
    where: { shopId_pluginSlug: { shopId, pluginSlug: slug } },
    update: { enabled, enabledAt: enabled ? new Date() : undefined },
    create: { shopId, pluginSlug: slug, enabled, enabledAt: enabled ? new Date() : undefined },
  })
}
