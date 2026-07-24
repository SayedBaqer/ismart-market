import { getHomeSections } from '@/lib/services/settings.service'
import { HeroSection } from '@/components/store/sections/hero'
import { FeaturedCategoriesSection } from '@/components/store/sections/featured-categories'
import { FeaturedProductsSection } from '@/components/store/sections/featured-products'
import { NewsSection } from '@/components/store/sections/news'
import { ShopShowcaseSection } from '@/components/store/sections/shop-showcase'
import { AnnouncementBar } from '@/components/store/sections/announcement-bar'
import { StatsBar } from '@/components/store/sections/stats-bar'
import { BestSellersSection } from '@/components/store/sections/best-sellers'
import { NewArrivalsSection } from '@/components/store/sections/new-arrivals'
import { FlashSaleSection } from '@/components/store/sections/flash-sale'
import { CustomBanner } from '@/components/store/sections/custom-banner'
import { AdCarousel } from '@/components/store/sections/ad-carousel'
import { RankingsSection } from '@/components/store/sections/rankings'
import { prisma } from '@/lib/db'
import { getSetting } from '@/lib/services/settings.service'

export const revalidate = 60

export default async function HomePage() {
  const sections = await getHomeSections()
  const enabled = sections.filter((s) => s.enabled).sort((a, b) => a.order - b.order)

  // Active advertisements
  const now = new Date()
  const ads = await prisma.advertisement.findMany({
    where: { isActive: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    take: 8,
    select: { id: true, title: true, subtitle: true, imageUrl: true, ctaText: true, ctaUrl: true, bgColor: true, textColor: true },
  }).catch(() => [])

  // Rankings data
  const [topViewed, topSellers, onSale, topShops] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true, isHidden: false }, orderBy: { views: 'desc' }, take: 8, select: { id: true, slug: true, name: true, price: true, comparePrice: true, images: true, category: { select: { name: true } } } }).catch(() => []),
    prisma.product.findMany({ where: { isActive: true, isHidden: false }, orderBy: { salesCount: 'desc' }, take: 8, select: { id: true, slug: true, name: true, price: true, comparePrice: true, images: true, category: { select: { name: true } } } }).catch(() => []),
    prisma.product.findMany({ where: { isActive: true, isHidden: false, comparePrice: { not: null } }, orderBy: { comparePrice: 'desc' }, take: 8, select: { id: true, slug: true, name: true, price: true, comparePrice: true, images: true, category: { select: { name: true } } } }).catch(() => []),
    prisma.shop.findMany({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, name: true, slug: true, logoUrl: true, bannerUrl: true, description: true, _count: { select: { products: { where: { isActive: true } } } } } }).catch(() => []),
  ])

  // Pre-fetch flash-sale products if that section is enabled
  const flashSection = enabled.find((s) => s.type === 'flash-sale')
  let flashProducts: {
    id: string; slug: string; name: string; price: number; comparePrice: number | null
    discount: number; images: string[]; category: string | null; inStock: boolean
  }[] = []
  let flashCurrency = 'BHD'

  if (flashSection) {
    flashCurrency = (await getSetting('currency.base')) ?? 'BHD'
    const count = flashSection.config?.count ?? 6
    const rawProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        isHidden: false,
        comparePrice: { not: null },
      },
      take: count,
      orderBy: { comparePrice: 'desc' },
      include: {
        category: { select: { name: true } },
        stockMeta: { select: { currentQty: true } },
      },
    }).catch(() => [])

    flashProducts = rawProducts
      .filter((p) => p.comparePrice && Number(p.comparePrice) > Number(p.price))
      .map((p) => {
        const price = Number(p.price)
        const comparePrice = Number(p.comparePrice)
        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          price,
          comparePrice,
          discount: Math.round(((comparePrice - price) / comparePrice) * 100),
          images: Array.isArray(p.images) ? (p.images as string[]) : [],
          category: p.category?.name ?? null,
          inStock: !p.trackStock || (p.stockMeta ? Number(p.stockMeta.currentQty) > 0 : true),
        }
      })
  }

  const currency = (await getSetting('currency.base')) ?? 'BHD'

  return (
    <>
      {/* Ad carousel — always first if ads exist */}
      {ads.length > 0 && <AdCarousel ads={ads} />}

      {enabled.map((section) => {
        switch (section.type) {
          case 'announcement-bar':
            return <AnnouncementBar key="announcement-bar" config={section.config} />
          case 'hero':
            return <HeroSection key="hero" />
          case 'stats-bar':
            return <StatsBar key="stats-bar" />
          case 'featured-categories':
            return <FeaturedCategoriesSection key="featured-categories" />
          case 'best-sellers':
            return <BestSellersSection key="best-sellers" config={section.config} />
          case 'new-arrivals':
            return <NewArrivalsSection key="new-arrivals" config={section.config} />
          case 'flash-sale':
            return <FlashSaleSection key="flash-sale" config={section.config} products={flashProducts} currency={flashCurrency} />
          case 'featured-products':
            return <FeaturedProductsSection key="featured-products" />
          case 'custom-banner':
            return <CustomBanner key="custom-banner" config={section.config} />
          case 'shop-showcase':
            return <ShopShowcaseSection key="shop-showcase" />
          case 'news':
            return <NewsSection key="news" />
          default:
            return null
        }
      })}

      {/* Rankings */}
      <RankingsSection
        topViewed={topViewed}
        topSellers={topSellers}
        onSale={onSale}
        topShops={topShops}
        currency={currency}
      />
    </>
  )
}
