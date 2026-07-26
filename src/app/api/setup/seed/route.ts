import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runSeed()
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-seed-secret')
  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runSeed()
}

async function runSeed() {
  const results: string[] = []

  const existing = await prisma.user.findFirst({ where: { email: 'admin@ismart.market' } })
  if (!existing) {
    await prisma.user.create({
      data: {
        email: 'admin@ismart.market',
        username: 'admin',
        name: 'iSmart Admin',
        passwordHash: await bcrypt.hash('admin123456', 12),
        role: 'SUPER_ADMIN',
      },
    })
    results.push('✅ Created admin user')
  } else {
    if (!existing.username) {
      await prisma.user.update({ where: { id: existing.id }, data: { username: 'admin' } })
      results.push('✅ Updated admin username')
    } else {
      results.push('ℹ️ Admin already exists')
    }
  }

  const cats = [
    { name: 'Electronics', slug: 'electronics' },
    { name: 'Clothing', slug: 'clothing' },
    { name: 'Food & Drinks', slug: 'food-drinks' },
    { name: 'Home & Garden', slug: 'home-garden' },
  ]
  for (const cat of cats) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, displayOrder: cats.indexOf(cat) },
    })
  }
  results.push('✅ Categories ready')

  const defaults = [
    { key: 'company.name', value: 'iSmart Market' },
    { key: 'company.currency', value: 'BHD' },
    { key: 'locale.language', value: 'en' },
    { key: 'locale.direction', value: 'ltr' },
  ]
  for (const { key, value } of defaults) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } })
  }
  results.push('✅ Settings ready')

  return NextResponse.json({ success: true, results })
}
