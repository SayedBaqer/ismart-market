import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

function getPageDesignPolicy(settings: Record<string, unknown>): 'AUTO' | 'APPROVE' {
  const policy = settings.approvalPolicy as Record<string, unknown> | undefined
  const acts = (policy?.activities ?? {}) as Record<string, string>
  return acts.pageDesign === 'AUTO' ? 'AUTO' : 'APPROVE'
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  const shop = await prisma.shop.findUnique({ where: { id: shopUser.shopId }, select: { id: true, name: true, settings: true } })
  if (!shop) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const settings = (shop.settings ?? {}) as Record<string, unknown>
  const pageDesignPolicy = getPageDesignPolicy(settings)

  return NextResponse.json({
    shopId: shop.id,
    shopName: shop.name,
    display: settings.display ?? null,
    displayPending: settings.displayPending ?? null,
    pageDesignPolicy,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopUser = await prisma.shopUser.findFirst({ where: { userId: session.user.id } })
  if (!shopUser || shopUser.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Only shop owners can update display settings' }, { status: 403 })
  }

  const body = await req.json()
  const { sections, banner, tagline } = body

  const shop = await prisma.shop.findUnique({ where: { id: shopUser.shopId }, select: { settings: true } })
  if (!shop) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existing = (shop.settings ?? {}) as Record<string, unknown>
  const pageDesignPolicy = getPageDesignPolicy(existing)

  let updatedSettings: Record<string, unknown>

  if (pageDesignPolicy === 'AUTO') {
    // Publish immediately — no approval needed
    updatedSettings = {
      ...existing,
      display: {
        sections: sections ?? [],
        banner: banner ?? null,
        tagline: tagline ?? '',
        status: 'approved',
        approvedAt: new Date().toISOString(),
        autoApproved: true,
      },
      displayPending: null,
    }
    revalidatePath(`/shops/${shopUser.shopId}`)
    revalidatePath('/')
  } else {
    // Standard: requires approval
    updatedSettings = {
      ...existing,
      displayPending: {
        sections: sections ?? [],
        banner: banner ?? null,
        tagline: tagline ?? '',
        submittedAt: new Date().toISOString(),
        submittedBy: session.user.id,
        status: 'pending',
      },
    }
  }

  const updated = await prisma.shop.update({
    where: { id: shopUser.shopId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { settings: updatedSettings as any },
    select: { id: true, settings: true },
  })

  const s = (updated.settings ?? {}) as Record<string, unknown>
  return NextResponse.json({
    display: s.display ?? null,
    displayPending: s.displayPending ?? null,
    autoApproved: pageDesignPolicy === 'AUTO',
  })
}
