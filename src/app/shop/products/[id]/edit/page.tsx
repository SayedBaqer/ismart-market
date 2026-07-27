import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { ProductForm } from '@/components/admin/product-form'
import type { Metadata } from 'next'
import { getStoreLang } from '@/lib/i18n/get-store-lang'
import { shopT } from '@/lib/i18n/shop'

interface PageProps { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const p = await prisma.product.findUnique({ where: { id }, select: { name: true } })
  return { title: p ? `Edit: ${p.name}` : 'Edit Product' }
}

export default async function EditShopProductPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect('/admin/login')

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser) redirect('/no-shop')
  if (!['MANAGER', 'STAFF'].includes(shopUser.role)) redirect('/shop/products')

  const { id } = await params
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { stockMeta: true } }),
    prisma.category.findMany({
      where: { isActive: true, OR: [{ shopId: null }, { shopId: shopUser.shopId }] },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
  ])

  if (!product || product.shopId !== shopUser.shopId) notFound()
  const t = shopT[await getStoreLang()]

  return (
    <div className="p-4 sm:p-6 pb-24 md:pb-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{t.prodEditProductTitle}</h1>
        <p className="text-sm text-gray-500">{product.name}</p>
      </div>
      <ProductForm
        categories={categories}
        apiBase="/api/shop/products"
        redirectPath="/shop/products"
        initialData={{
          id: product.id,
          name: product.name,
          sku: product.sku,
          description: product.description,
          price: String(product.price),
          comparePrice: product.comparePrice ? String(product.comparePrice) : null,
          categoryId: product.categoryId,
          isActive: product.isActive,
          isHidden: product.isHidden,
          trackStock: product.trackStock,
          images: (product.images as string[]) ?? [],
          weight: product.weight ? String(product.weight) : null,
          meta: (product.meta as Record<string, unknown>) ?? {},
          instagramUrl: ((product.meta as Record<string, unknown>)?.instagramUrl as string) ?? '',
        }}
      />
    </div>
  )
}
