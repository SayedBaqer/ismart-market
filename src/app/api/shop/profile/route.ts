import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

async function getShopUser(userId: string) {
  return prisma.shopUser.findFirst({ where: { userId } })
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await getShopUser(session.user.id)
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  const shop = await prisma.shop.findUnique({
    where: { id: shopUser.shopId },
    select: {
      id: true, name: true, description: true, email: true, phone: true,
      address: true, logoUrl: true, plan: true,
    },
  })
  if (!shop) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ shop })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await getShopUser(session.user.id)
  if (!shopUser || shopUser.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Only the shop owner can edit shop info' }, { status: 403 })
  }

  const body = await req.json()
  const { name, description, email, phone, address, logoUrl } = body as {
    name?: string; description?: string; email?: string; phone?: string
    address?: string; logoUrl?: string
  }

  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: 'Shop name cannot be empty' }, { status: 400 })
  }

  const shop = await prisma.shop.update({
    where: { id: shopUser.shopId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description.trim() || null }),
      ...(email !== undefined && { email: email.trim() || null }),
      ...(phone !== undefined && { phone: phone.trim() || null }),
      ...(address !== undefined && { address: address.trim() || null }),
      ...(logoUrl !== undefined && { logoUrl: logoUrl.trim() || null }),
    },
    select: {
      id: true, name: true, description: true, email: true, phone: true,
      address: true, logoUrl: true, plan: true,
    },
  })

  return NextResponse.json({ shop })
}
