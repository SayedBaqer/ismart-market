import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: (session.user as { id: string }).id } })
  if (!shopUser || !['MANAGER', 'STAFF'].includes(shopUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const docType = url.searchParams.get('docType')
  const status = url.searchParams.get('status')
  const q = url.searchParams.get('q')?.trim()
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
  const limit = 25

  const where = {
    shopId: shopUser.shopId,
    ...(docType ? { docType: docType as never } : {}),
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ docNumber: { contains: q } }, { customer: { displayName: { contains: q } } }] } : {}),
  }

  const [docs, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: { select: { id: true, displayName: true } },
        _count: { select: { items: true, payments: true } },
      },
    }),
    prisma.document.count({ where }),
  ])

  return NextResponse.json({ docs, total, page, totalPages: Math.ceil(total / limit) })
}
