import { prisma } from '@/lib/db'
import { ProductForm } from '@/components/admin/product-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Product' }

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Add Product</h1>
        <p className="text-sm text-gray-500">Create a new product in your catalogue</p>
      </div>
      <ProductForm categories={categories} />
    </div>
  )
}
