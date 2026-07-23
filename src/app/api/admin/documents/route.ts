import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { ci } from '@/lib/db-compat'
import { z } from 'zod'

const itemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1),
  sku: z.string().optional(),
  description: z.string().optional(),
  qty: z.number().positive(),
  unitPrice: z.number().min(0),
  discountPct: z.number().min(0).max(100).default(0),
  taxPct: z.number().min(0).max(100).default(0),
  serial: z.string().optional(),
  warranty: z.string().optional(),
})

const docSchema = z.object({
  docType: z.enum(['ESTIMATE', 'INVOICE', 'SALES_ORDER', 'PURCHASE_ORDER', 'CREDIT_NOTE']),
  customerId: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  currency: z.string().default('BHD'),
  notes: z.string().optional(),
  terms: z.string().optional(),
  contactPhone: z.string().optional(),
  items: z.array(itemSchema).min(1),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const docType = req.nextUrl.searchParams.get('docType')
  const status = req.nextUrl.searchParams.get('status')
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1')
  const pageSize = 25

  const where = {
    ...(docType ? { docType: docType as never } : {}),
    ...(status ? { status } : {}),
    ...(q ? {
      OR: [
        { docNumber: { contains: q, ...ci() } },
        { customer: { displayName: { contains: q, ...ci() } } },
      ],
    } : {}),
  }

  const [docs, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { id: true, displayName: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.document.count({ where }),
  ])

  return NextResponse.json({ docs, total, page, totalPages: Math.ceil(total / pageSize) })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id?: string }).id

  const body = await req.json()
  const parsed = docSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data

  // Calculate totals
  let subtotal = 0
  let discountTotal = 0
  let taxTotal = 0

  const lineItems = d.items.map((item, idx) => {
    const base = item.qty * item.unitPrice
    const discount = base * (item.discountPct / 100)
    const afterDiscount = base - discount
    const tax = afterDiscount * (item.taxPct / 100)
    const lineTotal = afterDiscount + tax

    subtotal += base
    discountTotal += discount
    taxTotal += tax

    return {
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      description: item.description,
      qty: item.qty,
      unitPrice: item.unitPrice,
      discountPct: item.discountPct,
      taxPct: item.taxPct,
      lineTotal,
      serial: item.serial,
      warranty: item.warranty,
      sortOrder: idx,
    }
  })

  const grandTotal = subtotal - discountTotal + taxTotal

  // Generate doc number: INV-YYYYMMDD-XXXX
  const prefix = {
    ESTIMATE: 'EST',
    INVOICE: 'INV',
    SALES_ORDER: 'SO',
    PURCHASE_ORDER: 'PO',
    CREDIT_NOTE: 'CN',
  }[d.docType]

  const today = new Date()
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const last = await prisma.document.findFirst({
    where: { docType: d.docType, docNumber: { startsWith: `${prefix}-${ymd}` } },
    orderBy: { createdAt: 'desc' },
    select: { docNumber: true },
  })
  const seq = last ? Number((last.docNumber ?? '').split('-')[2] ?? '0') + 1 : 1
  const docNumber = `${prefix}-${ymd}-${String(seq).padStart(4, '0')}`

  const doc = await prisma.document.create({
    data: {
      docType: d.docType,
      docNumber,
      status: 'draft',
      customerId: d.customerId ?? null,
      currency: d.currency,
      issueDate: d.issueDate ? new Date(d.issueDate) : undefined,
      dueDate: d.dueDate ? new Date(d.dueDate) : undefined,
      expiryDate: d.expiryDate ? new Date(d.expiryDate) : undefined,
      notes: d.notes,
      terms: d.terms,
      contactPhone: d.contactPhone,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      grandTotalBase: grandTotal,
      createdById: userId,
      items: { create: lineItems },
    },
    include: { items: true, customer: true },
  })

  return NextResponse.json(doc, { status: 201 })
}
