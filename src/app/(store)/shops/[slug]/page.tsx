import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Package, Phone, Mail, MapPin, Newspaper, ChevronRight, Instagram, MessageCircle, Facebook, Music2 } from 'lucide-react'
import { InstagramFeed } from '@/components/store/instagram-feed'
import { getStoreT, getStoreLang } from '@/lib/i18n/get-store-lang'
import { t as tc } from '@/lib/i18n/translate-content'
import type { StoreTranslations, StoreLang } from '@/lib/i18n/store'

export const revalidate = 60

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const shop = await prisma.shop.findUnique({ where: { slug }, select: { name: true, description: true } })
  if (!shop) return { title: 'Shop Not Found' }
  return { title: shop.name, description: shop.description ?? undefined }
}

export default async function ShopPublicPage({ params }: Props) {
  const [{ slug }, t, lang] = await Promise.all([params, getStoreT(), getStoreLang()])

  const shop = await prisma.shop.findUnique({
    where: { slug, status: 'ACTIVE' },
    include: {
      products: {
        where: { isActive: true, isHidden: false },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { category: { select: { name: true, meta: true } } },
      },
      news: {
        where: { status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        include: { author: { select: { name: true } } },
      },
    },
  })

  if (!shop) notFound()

  const settings = (shop.settings ?? {}) as Record<string, unknown>
  const display = (settings.display ?? {}) as Record<string, unknown>
  const sections = Array.isArray(display.sections)
    ? (display.sections as { type: string; enabled: boolean; config?: Record<string, unknown> }[]).filter((s) => s.enabled)
    : defaultSections()
  const tagline = (display.tagline as string) || shop.description || ''
  const bannerUrl = (display.banner as string) || shop.bannerUrl || null
  const announcement = sections.find((s) => s.type === 'announcement-bar')?.config?.text as string | undefined
  const socialLinks = (settings.socialLinks ?? {}) as Record<string, string>
  const igPlugin = (settings.plugins as Record<string, unknown> | undefined)?.instagram as { posts?: { url: string; caption?: string; productSlug?: string }[] } | undefined
  const igPosts = igPlugin?.posts?.filter((p) => p.url) ?? []

  const currency = shop.currency ?? 'BHD'
  const fmt = (n: number) => `${n.toFixed(3)} ${currency}`

  const topSellers = [...shop.products].sort(() => Math.random() - 0.5).slice(0, 8)
  const newArrivals = [...shop.products].slice(0, 8)

  return (
    <div className="min-h-screen bg-gray-50" dir={t.dir}>
      {/* Announcement bar */}
      {announcement && sections.some((s) => s.type === 'announcement-bar') && (
        <div className="bg-blue-700 text-white text-center py-2 text-sm font-medium px-4">
          {announcement}
        </div>
      )}

      {/* Banner / header */}
      <div className="relative h-40 sm:h-56 bg-gradient-to-br from-blue-700 to-blue-900 overflow-hidden">
        {bannerUrl && (
          <Image src={bannerUrl} alt={shop.name} fill className="object-cover" />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex items-end px-4 pb-5 sm:px-8">
          <div className="flex items-end gap-4">
            {shop.logoUrl ? (
              <div className="h-16 w-16 rounded-2xl border-2 border-white overflow-hidden relative shrink-0 shadow-lg">
                <Image src={shop.logoUrl} alt={shop.name} fill className="object-cover" />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-2xl border-2 border-white bg-white/20 flex items-center justify-center shrink-0 shadow-lg">
                <span className="text-2xl font-black text-white">{shop.name[0]}</span>
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">{shop.name}</h1>
              {tagline && <p className="text-sm text-white/80 mt-0.5 line-clamp-1">{tagline}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Contact bar */}
      {(shop.phone || shop.email || shop.address || socialLinks.instagram || socialLinks.whatsapp || socialLinks.facebook || socialLinks.tiktok) && (
        <div className="border-b border-gray-200 bg-white px-4 py-2.5">
          <div className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
              {shop.phone && (
                <a href={`tel:${shop.phone}`} className="flex items-center gap-1 hover:text-blue-600">
                  <Phone className="h-3 w-3" />{shop.phone}
                </a>
              )}
              {shop.email && (
                <a href={`mailto:${shop.email}`} className="flex items-center gap-1 hover:text-blue-600">
                  <Mail className="h-3 w-3" />{shop.email}
                </a>
              )}
              {shop.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{shop.address}
                </span>
              )}
            </div>
            {(socialLinks.instagram || socialLinks.whatsapp || socialLinks.facebook || socialLinks.tiktok) && (
              <div className="flex items-center gap-3">
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500">
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {socialLinks.whatsapp && (
                  <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-green-500">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                )}
                {socialLinks.facebook && (
                  <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600">
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {socialLinks.tiktok && (
                  <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-900">
                    <Music2 className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dynamic sections */}
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-10">
        {sections.map((sec) => {
          switch (sec.type) {
            case 'top-sellers':
              return topSellers.length > 0 ? (
                <ProductSection key="top-sellers" title={(sec.config?.title as string) || t.topSellers} emoji="🏆" products={topSellers} fmt={fmt} shopSlug={slug} seeAllLabel={t.seeAllProducts} lang={lang} />
              ) : null

            case 'new-arrivals':
              return newArrivals.length > 0 ? (
                <ProductSection key="new-arrivals" title={(sec.config?.title as string) || t.newArrivals} emoji="✨" products={newArrivals} fmt={fmt} shopSlug={slug} seeAllLabel={t.seeAllProducts} lang={lang} />
              ) : null

            case 'categories': {
              const seen = new Map<string, string>()
              for (const p of shop.products) {
                if (p.category && !seen.has(p.category.name)) {
                  seen.set(p.category.name, tc(p.category.meta, 'name', p.category.name, lang))
                }
              }
              const cats = [...seen.entries()]
              return cats.length > 1 ? (
                <section key="categories">
                  <SectionHeader title={t.shopCategories} emoji="🗂️" />
                  <div className="flex flex-wrap gap-2 mt-3">
                    {cats.map(([c, translated]) => (
                      <Link key={c} href={`/shops/${slug}?category=${encodeURIComponent(c)}`}
                        className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-700 transition-colors">
                        {translated}
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null
            }

            case 'about':
              return shop.description ? (
                <section key="about" className="rounded-2xl border border-gray-200 bg-white p-6">
                  <SectionHeader title={t.aboutShop} emoji="🏪" />
                  <p className="mt-3 text-sm text-gray-600 leading-relaxed">{shop.description}</p>
                </section>
              ) : null

            default:
              return null
          }
        })}

        {/* News section */}
        {shop.news.length > 0 && (
          <section>
            <SectionHeader title={t.latestNews} emoji="📰" />
            <div className="mt-4 space-y-3">
              {shop.news.map((post) => (
                <div key={post.id} className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                      <Newspaper className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{post.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString(
                          t.lang === 'ar' ? 'ar-BH' : 'en-GB',
                          { day: 'numeric', month: 'long', year: 'numeric' }
                        ) : ''}
                        {post.author.name ? ` · ${post.author.name}` : ''}
                      </p>
                      <p className="mt-2 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{post.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All products fallback */}
        {sections.length === 0 && (
          <ProductSection title={t.allProducts} emoji="📦" products={shop.products} fmt={fmt} shopSlug={slug} seeAllLabel={t.seeAllProducts} lang={lang} />
        )}

        {igPosts.length > 0 && <InstagramFeed posts={igPosts} />}
      </div>
    </div>
  )
}

function defaultSections(): { type: string; enabled: boolean; config?: Record<string, unknown> }[] {
  return [
    { type: 'top-sellers', enabled: true },
    { type: 'new-arrivals', enabled: true },
    { type: 'categories', enabled: true },
  ]
}

function SectionHeader({ title, emoji }: { title: string; emoji: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{emoji}</span>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
    </div>
  )
}

function ProductSection({
  title, emoji, products, fmt, shopSlug, seeAllLabel, lang,
}: {
  title: string
  emoji: string
  products: { id: string; slug: string; name: string; price: unknown; images: unknown; category: { name: string; meta?: unknown } | null }[]
  fmt: (n: number) => string
  shopSlug: string
  seeAllLabel: string
  lang: StoreLang
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <SectionHeader title={title} emoji={emoji} />
        <Link href={`/products?shop=${shopSlug}`} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
          {seeAllLabel} <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {products.map((p) => {
          const images = Array.isArray(p.images) ? (p.images as string[]) : []
          const price = Number(p.price)
          return (
            <Link
              key={p.id}
              href={`/products/${p.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white hover:border-blue-200 hover:shadow-md transition-all"
            >
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                {images[0] ? (
                  <Image src={images[0]} alt={p.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 640px) 50vw, 25vw" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-10 w-10 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-3">
                {p.category && <span className="text-[10px] font-medium uppercase tracking-wider text-blue-500 mb-1">{tc(p.category.meta, 'name', p.category.name, lang)}</span>}
                <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug flex-1">{p.name}</p>
                <p className="mt-2 text-sm font-bold text-blue-700">{fmt(price)}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
