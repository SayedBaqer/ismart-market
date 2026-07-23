import { prisma } from '@/lib/db'
import Image from 'next/image'
import Link from 'next/link'
import { Store, Package } from 'lucide-react'

export const revalidate = 60

export default async function ShopsPage() {
  const shops = await prisma.shop.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      bannerUrl: true,
      _count: { select: { products: { where: { isActive: true, isHidden: false } } } },
    },
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shops</h1>
        <p className="text-sm text-gray-500 mt-1">{shops.length} active {shops.length === 1 ? 'shop' : 'shops'}</p>
      </div>

      {shops.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Store className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500">No shops yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <Link
              key={shop.id}
              href={`/shops/${shop.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white hover:border-blue-200 hover:shadow-md transition-all"
            >
              {/* Banner */}
              <div className="relative h-24 bg-gradient-to-br from-blue-600 to-blue-800 overflow-hidden">
                {shop.bannerUrl && (
                  <Image src={shop.bannerUrl} alt={shop.name} fill className="object-cover" />
                )}
                <div className="absolute inset-0 bg-black/20" />
              </div>

              {/* Logo + info */}
              <div className="p-4 flex gap-3 items-start -mt-6">
                <div className="h-12 w-12 rounded-xl border-2 border-white overflow-hidden relative shrink-0 shadow-md bg-white">
                  {shop.logoUrl ? (
                    <Image src={shop.logoUrl} alt={shop.name} fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-blue-600">
                      <span className="text-lg font-black text-white">{shop.name[0]}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-5">
                  <p className="font-bold text-gray-900 truncate">{shop.name}</p>
                  {shop.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{shop.description}</p>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <Package className="h-3 w-3" />
                    {shop._count.products} products
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
