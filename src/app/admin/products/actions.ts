'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function toggleProductActive(id: string, isActive: boolean) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  await prisma.product.update({ where: { id }, data: { isActive } })
  revalidatePath('/admin/products')
}
