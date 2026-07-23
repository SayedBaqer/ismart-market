import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // ── Admin user ─────────────────────────────────────────────────────────────
  const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@ibird.bh' } })
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: 'admin@ibird.bh',
        name: 'iBird Admin',
        passwordHash: await bcrypt.hash('admin123456', 12),
        role: 'SUPER_ADMIN',
      },
    })
    console.log('Created admin user: admin@ibird.bh / admin123456')
    console.log('IMPORTANT: Change this password immediately after first login!')
  }

  // ── Default categories ─────────────────────────────────────────────────────
  const cats = [
    { name: 'Incubators', slug: 'incubators' },
    { name: 'Accessories', slug: 'accessories' },
    { name: 'Spare Parts', slug: 'spare-parts' },
    { name: 'Controllers', slug: 'controllers' },
  ]
  for (const cat of cats) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, displayOrder: cats.indexOf(cat) },
    })
  }
  console.log('Created default categories')

  // ── Default settings ───────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultSettings: Array<{ key: string; value: any }> = [
    { key: 'company.name', value: 'iBird Electronics' },
    { key: 'company.currency', value: 'BHD' },
    { key: 'company.address', value: 'Bahrain' },
    { key: 'currency.rates', value: { USD: 0.376, CNY: 0.052 } }, // to BHD
    { key: 'tax.enabled', value: false },
    { key: 'tax.rate', value: 0 },
    { key: 'stock.deduct_on_invoice', value: false },
    { key: 'invoice.prefix', value: 'INV' },
    { key: 'invoice.pad_width', value: 5 },
    { key: 'invoice.year_reset', value: true },
    { key: 'estimate.prefix', value: 'EST' },
    { key: 'po.prefix', value: 'PO' },
    { key: 'home.sections', value: [
      { id: 'hero', enabled: true, order: 0 },
      { id: 'featured-categories', enabled: true, order: 1 },
      { id: 'featured-products', enabled: true, order: 2 },
      { id: 'news', enabled: true, order: 3 },
    ]},
  ]

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: { key: s.key, value: s.value },
    })
  }
  console.log('Created default settings')

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
