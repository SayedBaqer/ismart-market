import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { isPluginEnabledForShop } from '@/lib/services/plugin.service'

export default async function InstagramPluginLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/admin/login?callbackUrl=%2Fshop')

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser) redirect('/no-shop')

  const enabled = await isPluginEnabledForShop(shopUser.shopId, 'instagram-import')
  if (!enabled) redirect('/shop/plugins')

  return <>{children}</>
}
