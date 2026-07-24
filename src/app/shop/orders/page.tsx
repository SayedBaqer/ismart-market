import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { ShopOrdersClient } from './orders-client'

export default async function ShopOrdersPage() {
  const session = await auth()
  if (!session?.user) redirect('/shop/login')

  const shopUser = await prisma.shopUser.findFirst({
    where: { userId: (session.user as { id: string }).id },
    include: { shop: { select: { address: true } } },
  })
  if (!shopUser) redirect('/shop/login')

  const shopAddress =
    (shopUser.shop?.address as Record<string, string> | null)?.line1 ??
    (shopUser.shop?.address as string | null) ??
    ''

  return (
    <ShopOrdersClient
      role={shopUser.role as 'MANAGER' | 'STAFF' | 'CASHIER'}
      shopAddress={shopAddress}
    />
  )
}
