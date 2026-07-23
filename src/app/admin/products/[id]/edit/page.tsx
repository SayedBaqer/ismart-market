import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { ProductForm } from '@/components/admin/product-form'
import Link from 'next/link'
import type { Metadata } from 'next'

interface PageProps { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const p = await prisma.product.findUnique({ where: { id }, select: { name: true } })
  return { title: p ? `Edit: ${p.name}` : 'Edit Product' }
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { stockMeta: true },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
  ])

  if (!product) notFound()

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Edit Product</h1>
          <p className="text-sm text-gray-500">{product.name}</p>
        </div>
        <Link
          href={`/admin/products/${product.id}/variants`}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          Manage Variants
        </Link>
      </div>
      <ProductForm
        categories={categories}
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
