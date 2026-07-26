import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { getEffectiveFeatureLimits, getEffectivePlan } from '@/lib/plan-limits'

async function getShopUser(userId: string) {
  return prisma.shopUser.findFirst({
    where: { userId },
    select: { shopId: true, role: true, shop: { select: { plan: true, settings: true, paymentStatus: true } } },
  })
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await getShopUser(session.user.id)
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  const branches = await prisma.shopBranch.findMany({
    where: { shopId: shopUser.shopId },
    orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
  })

  const limits = await getEffectiveFeatureLimits(getEffectivePlan(shopUser.shop.plan, shopUser.shop.paymentStatus), shopUser.shop.settings)

  return NextResponse.json({ branches, limit: limits.branches, used: branches.length })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await getShopUser(session.user.id)
  if (!shopUser || shopUser.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Only the shop owner can manage branches' }, { status: 403 })
  }

  const body = await req.json()
  const { name, address, phone } = body as { name: string; address?: string; phone?: string }
  if (!name?.trim()) return NextResponse.json({ error: 'Branch name is required' }, { status: 400 })

  const limits = await getEffectiveFeatureLimits(getEffectivePlan(shopUser.shop.plan, shopUser.shop.paymentStatus), shopUser.shop.settings)
  const count = await prisma.shopBranch.count({ where: { shopId: shopUser.shopId } })
  if (count >= limits.branches) {
    return NextResponse.json({
      error: `Your plan includes up to ${limits.branches} branch${limits.branches === 1 ? '' : 'es'}. Upgrade your plan to add more.`,
      code: 'QUOTA_EXCEEDED',
    }, { status: 402 })
  }

  const branch = await prisma.shopBranch.create({
    data: {
      shopId: shopUser.shopId,
      name: name.trim(),
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      isMain: count === 0, // first branch created is the main one
    },
  })

  return NextResponse.json({ branch }, { status: 201 })
}
