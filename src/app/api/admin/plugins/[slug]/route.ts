import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

type Params = { params: Promise<{ slug: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const { active } = await req.json()

  const plugin = await prisma.plugin.update({
    where: { slug },
    data: { active: Boolean(active) },
  })

  return NextResponse.json(plugin)
}
