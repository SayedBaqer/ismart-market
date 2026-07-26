import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAllPlugins } from '@/lib/services/plugin.service'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plugins = await getAllPlugins()
  return NextResponse.json(plugins)
}
