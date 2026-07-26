import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

type Params = { params: Promise<{ slug: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { slug } = await params
  const { active, minPlan } = await req.json() as { active?: boolean; minPlan?: string }

  const data: Record<string, unknown> = {}
  if (active !== undefined) data.active = Boolean(active)
  if (minPlan !== undefined) {
    if (!['FREE', 'STARTER', 'BUSINESS', 'ENTERPRISE'].includes(minPlan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }
    data.minPlan = minPlan
  }

  const plugin = await prisma.plugin.update({ where: { slug }, data })
  return NextResponse.json(plugin)
}
