import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getSetting } from '@/lib/services/settings.service'
import { formatCurrency } from '@/lib/utils'
import { ChevronRight, Package, Tag, Layers } from 'lucide-react'
import type { Metadata } from 'next'
import { AddToCartButton } from '@/components/store/add-to-cart-button'
import { ProductViewTracker } from '@/components/store/product-view-tracker'
import { getStoreT } from '@/lib/i18n/get-store-lang'
import { t as tc } from '@/lib/i18n/translate-content'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { name: true, description: true },
  })
  if (!product) return { title: 'Product not found' }
  return {
    title: product.name,
    description: product.description ?? undefined,
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params

  const [product, currency, t] = await Promise.all([
    prisma.product.findUnique({
      where: { slug, isActive: true, isHidden: false },
      include: {
        category: true,
        stockMeta: true,
        asAssembly: {
          include: {
            components: {
              include: {
                product: { select: { id: true, name: true, sku: true, price: true } },
              },
            },
          },
        },
      },
    }),
    getSetting('currency.base'),
    getStoreT(),
  ])

  if (!product) notFound()

  // Increment view count (once per session, client-side)

  const images = (product.images as string[]) ?? []
  const curr = currency ?? 'BHD'
  const lang = t.lang as 'en' | 'ar'
  const displayName = tc(product.meta, 'name', product.name, lang)
  const displayDesc = tc(product.meta, 'description', product.description ?? '', lang)
  const displayCatName = product.category ? tc(product.category.meta, 'name', product.category.name, lang) : ''
  const inStock =
    !product.trackStock ||
    (product.stockMeta ? Number(product.stockMeta.currentQty) > 0 : true)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" dir={t.dir}>
      <ProductViewTracker slug={slug} />
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-xs text-gray-500">
        <Link href="/" className="hover:text-gray-900">{lang === 'ar' ? 'الرئيسية' : 'Home'}</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/products" className="hover:text-gray-900">{t.allProducts}</Link>
        {product.category && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/products?category=${product.category.slug}`} className="hover:text-gray-900">
              {displayCatName}
            </Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="text-gray-900 font-medium">{displayName}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Images */}
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
            {images[0] ? (
              <Image
                src={images[0]}
                alt={product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-300">
                <Package className="h-20 w-20" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.slice(0, 5).map((img, i) => (
                <div
                  key={i}
                  className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200"
                >
                  <Image src={img} alt={`${product.name} ${i + 1}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-4">
          {product.category && (
            <Link
              href={`/products?category=${product.category.slug}`}
              className="inline-flex w-fit items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              <Tag className="h-3 w-3" />
              {displayCatName}
            </Link>
          )}

          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{displayName}</h1>

          {product.sku && (
            <p className="text-sm text-gray-400">{t.sku}: <span className="font-mono">{product.sku}</span></p>
          )}

          <div className="flex items-center gap-3">
            <span className="text-3xl font-extrabold text-blue-700">
              {formatCurrency(Number(product.price), curr)}
            </span>
            {inStock ? (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                {t.inStock}
              </span>
            ) : (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                {t.outOfStock}
              </span>
            )}
          </div>

          {displayDesc && (
            <p className="text-sm text-gray-600 leading-relaxed">{displayDesc}</p>
          )}

          <div className="mt-2">
            <AddToCartButton
              productId={product.id}
              name={product.name}
              sku={product.sku}
              price={Number(product.price)}
              imageUrl={(product.images as string[])?.[0] ?? null}
              inStock={inStock}
              labels={{ addToCart: t.addToCart, outOfStock: t.outOfStock, added: t.lang === 'ar' ? 'تمت الإضافة!' : 'Added!' }}
            />
          </div>

          {/* Assembly info */}
          {product.asAssembly && product.asAssembly.components.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
                <Layers className="h-4 w-4" />
                Bundle includes {product.asAssembly.components.length} item
                {product.asAssembly.components.length > 1 ? 's' : ''}
              </div>
              <ul className="space-y-1">
                {product.asAssembly.components.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-xs text-amber-700">
                    <span>{item.product.name}</span>
                    <span className="font-medium">× {String(item.qty)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
