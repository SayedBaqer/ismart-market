import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { ProductForm } from '@/components/admin/product-form'
import type { Metadata } from 'next'
import { getStoreLang } from '@/lib/i18n/get-store-lang'
import { shopT } from '@/lib/i18n/shop'

export const metadata: Metadata = { title: 'Add Product' }

export default async function NewShopProductPage() {
  const session = await auth()
  if (!session?.user) redirect('/admin/login')

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser) redirect('/no-shop')
  if (!['MANAGER', 'STAFF'].includes(shopUser.role)) redirect('/shop/products')

  const categories = await prisma.category.findMany({
    where: { isActive: true, OR: [{ shopId: null }, { shopId: shopUser.shopId }] },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  })
  const t = shopT[await getStoreLang()]

  return (
    <div className="p-4 sm:p-6 pb-24 md:pb-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{t.prodAddProductTitle}</h1>
        <p className="text-sm text-gray-500">{t.prodAddProductSubtitle}</p>
      </div>
      <ProductForm categories={categories} apiBase="/api/shop/products" redirectPath="/shop/products" />
    </div>
  )
}
