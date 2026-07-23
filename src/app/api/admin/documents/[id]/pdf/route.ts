import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { InvoicePDF } from '@/components/pdf/invoice-pdf'
import { getSetting } from '@/lib/services/settings.service'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [doc, companyName, companyAddress, companyPhone, companyEmail, taxNumber] = await Promise.all([
    prisma.document.findUnique({
      where: { id },
      include: {
        customer: { select: { displayName: true, mobile: true, email: true, billingAddress: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
    }),
    getSetting('company.name'),
    getSetting('company.address'),
    getSetting('company.phone'),
    getSetting('company.email'),
    getSetting('company.taxNumber'),
  ])

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(
    createElement(InvoicePDF, {
      docType: doc.docType,
      docNumber: doc.docNumber,
      status: doc.status,
      issueDate: doc.issueDate.toISOString(),
      dueDate: doc.dueDate?.toISOString() ?? null,
      currency: doc.currency,
      subtotal: Number(doc.subtotal),
      discountTotal: Number(doc.discountTotal),
      taxTotal: Number(doc.taxTotal),
      grandTotal: Number(doc.grandTotal),
      notes: doc.notes,
      terms: doc.terms,
      customer: doc.customer
        ? {
            displayName: doc.customer.displayName,
            mobile: doc.customer.mobile,
            email: doc.customer.email,
            billingAddress: doc.customer.billingAddress,
          }
        : null,
      items: doc.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        description: item.description,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
        discountPct: Number(item.discountPct),
        taxPct: Number(item.taxPct),
        lineTotal: Number(item.lineTotal),
        serial: item.serial,
        warranty: item.warranty,
      })),
      company: {
        name: companyName ?? 'Company',
        address: companyAddress ?? undefined,
        phone: companyPhone ?? undefined,
        email: companyEmail ?? undefined,
        taxNumber: taxNumber ?? undefined,
      },
    }) as any, // InvoicePDF renders a <Document> internally; react-pdf types expect DocumentProps at the top
  )

  const filename = `${doc.docNumber ?? 'document'}.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdfBuffer.length),
    },
  })
}
