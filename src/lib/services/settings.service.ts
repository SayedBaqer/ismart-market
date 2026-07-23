import { prisma } from '@/lib/db'

export async function getSetting(key: string): Promise<string | null> {
  try {
    const s = await prisma.setting.findUnique({ where: { key } })
    if (s == null) return null
    return typeof s.value === 'string' ? s.value : JSON.stringify(s.value)
  } catch {
    // DB not yet configured (setup wizard not run) — return null so callers use their defaults
    return null
  }
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } })
    const map: Record<string, string> = {}
    for (const r of rows) {
      map[r.key] = typeof r.value === 'string' ? r.value : JSON.stringify(r.value)
    }
    return map
  } catch {
    return {}
  }
}

export async function getHomeSections(): Promise<HomeSection[]> {
  const raw = await getSetting('home.sections')
  if (!raw) return defaultSections
  try {
    return JSON.parse(raw) as HomeSection[]
  } catch {
    return defaultSections
  }
}

export type HomeSectionType =
  | 'announcement-bar'
  | 'hero'
  | 'stats-bar'
  | 'featured-categories'
  | 'best-sellers'
  | 'new-arrivals'
  | 'flash-sale'
  | 'featured-products'
  | 'custom-banner'
  | 'shop-showcase'
  | 'news'
  | 'promotions'

export interface HomeSection {
  type: HomeSectionType
  enabled: boolean
  order: number
  config?: {
    title?: string
    subtitle?: string
    count?: number
    // announcement-bar
    messages?: string[]
    speed?: number
    bgColor?: string
    textColor?: string
    // flash-sale
    endDate?: string
    badge?: string
    // custom-banner
    imageUrl?: string
    ctaText?: string
    ctaUrl?: string
    bgFrom?: string
    bgTo?: string
    // best-sellers / new-arrivals
    period?: string
  }
}

const defaultSections: HomeSection[] = [
  { type: 'announcement-bar', enabled: false, order: 0, config: { messages: ['Free delivery on orders over 10 BHD', 'New arrivals every week!', 'Quality guaranteed — shop with confidence'], speed: 40 } },
  { type: 'hero', enabled: true, order: 1 },
  { type: 'stats-bar', enabled: true, order: 2 },
  { type: 'featured-categories', enabled: true, order: 3 },
  { type: 'best-sellers', enabled: true, order: 4, config: { title: 'Best Sellers', count: 8, period: '30' } },
  { type: 'new-arrivals', enabled: true, order: 5, config: { title: 'New Arrivals', count: 8 } },
  { type: 'flash-sale', enabled: false, order: 6, config: { title: 'Flash Sale', badge: 'HOT DEAL', count: 6, endDate: '' } },
  { type: 'featured-products', enabled: false, order: 7 },
  { type: 'custom-banner', enabled: false, order: 8, config: { title: 'Special Offer', subtitle: 'Limited time deals on premium products', ctaText: 'Shop Now', ctaUrl: '/products', bgFrom: '#0f172a', bgTo: '#1e3a5f' } },
  { type: 'shop-showcase', enabled: false, order: 9 },
  { type: 'news', enabled: true, order: 10 },
]
