import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const setupSchema = z.object({
  company: z.object({
    name: z.string().min(1).max(100),
    currency: z.enum(['BHD', 'SAR', 'AED', 'USD', 'EUR', 'CNY']),
    language: z.enum(['en', 'ar']),
    address: z.string().max(255).optional(),
    phone: z.string().max(50).optional(),
  }),
  admin: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(10).max(128),
  }),
})

export async function POST(req: NextRequest) {
  try {
    // Prevent re-running setup if already completed
    const completedSetting = await prisma.setting.findUnique({
      where: { key: 'setup.completed' },
    })
    if (completedSetting?.value === 'true') {
      return NextResponse.json({ error: 'Setup already completed' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = setupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { company, admin } = parsed.data

    // Check email not already taken
    const existingUser = await prisma.user.findUnique({ where: { email: admin.email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(admin.password, 12)

    // Determine decimal places for selected currency
    const currencyDecimals: Record<string, number> = {
      BHD: 3, KWD: 3, OMR: 3,
      SAR: 2, AED: 2, USD: 2, EUR: 2, CNY: 2,
    }
    const decimals = currencyDecimals[company.currency] ?? 2

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      // Create admin user
      await tx.user.create({
        data: {
          name: admin.name,
          email: admin.email,
          passwordHash,
          role: 'SUPER_ADMIN',
          isActive: true,
        },
      })

      // Upsert all settings in one go
      const settings = [
        { key: 'setup.completed', value: 'true' },
        { key: 'company.name', value: company.name },
        { key: 'company.address', value: company.address ?? '' },
        { key: 'company.phone', value: company.phone ?? '' },
        { key: 'currency.base', value: company.currency },
        { key: 'currency.decimals', value: String(decimals) },
        { key: 'currency.rates', value: JSON.stringify({ USD: 0.376, CNY: 0.052 }) },
        { key: 'locale.language', value: company.language },
        { key: 'locale.direction', value: company.language === 'ar' ? 'rtl' : 'ltr' },
        { key: 'tax.enabled', value: 'false' },
        { key: 'tax.rate', value: '0' },
        { key: 'platform.mode', value: 'single' },
        {
          key: 'home.sections',
          value: JSON.stringify([
            { type: 'hero', enabled: true, order: 0 },
            { type: 'featured-categories', enabled: true, order: 1 },
            { type: 'featured-products', enabled: true, order: 2 },
            { type: 'news', enabled: false, order: 3 },
          ]),
        },
      ]

      for (const s of settings) {
        await tx.setting.upsert({
          where: { key: s.key },
          update: { value: s.value },
          create: { key: s.key, value: s.value },
        })
      }

      // Seed default categories
      const defaultCategories = [
        { name: 'Incubators', slug: 'incubators', description: 'Egg incubation equipment' },
        { name: 'Accessories', slug: 'accessories', description: 'Incubator accessories' },
        { name: 'Spare Parts', slug: 'spare-parts', description: 'Replacement parts' },
        { name: 'Controllers', slug: 'controllers', description: 'Temperature & humidity controllers' },
      ]

      for (const cat of defaultCategories) {
        const exists = await tx.category.findUnique({ where: { slug: cat.slug } })
        if (!exists) {
          await tx.category.create({ data: cat })
        }
      }
    })

    const response = NextResponse.json({ success: true })
    // Mark setup done in a long-lived cookie so middleware can skip the redirect
    response.cookies.set('setup_completed', 'true', {
      httpOnly: false, // readable by JS so client can also check
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 3650, // 10 years
      path: '/',
    })
    return response
  } catch (err) {
    console.error('Setup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
