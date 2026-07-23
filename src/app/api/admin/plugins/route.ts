import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plugins = await prisma.plugin.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(plugins)
}
