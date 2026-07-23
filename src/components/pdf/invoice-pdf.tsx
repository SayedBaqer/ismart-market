import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

// Register a font that supports Arabic (optional — falls back to Helvetica if not needed)
// Font.register({ family: 'NotoSans', src: '/fonts/NotoSans-Regular.ttf' })

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  companyBlock: {
    flex: 1,
  },
  companyName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#1d4ed8',
    marginBottom: 4,
  },
  companyInfo: {
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.4,
  },
  docInfoBlock: {
    alignItems: 'flex-end',
  },
  docType: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textTransform: 'uppercase',
  },
  docNumber: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 4,
    fontFamily: 'Helvetica-Bold',
  },
  statusBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#dcfce7',
  },
  statusText: {
    fontSize: 9,
    color: '#15803d',
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 20,
  },
  metaBlock: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    color: '#9ca3af',
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 10,
    color: '#111827',
    lineHeight: 1.4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 0,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  colName: { flex: 3 },
  colQty: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colDisc: { flex: 1, textAlign: 'center' },
  colTotal: { flex: 1.5, textAlign: 'right' },
  headerText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  cellText: {
    fontSize: 10,
    color: '#374151',
  },
  cellTextBold: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  cellSub: {
    fontSize: 8,
    color: '#9ca3af',
    marginTop: 1,
  },
  totalsSection: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalsBlock: {
    width: 200,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalsLabel: {
    fontSize: 9,
    color: '#6b7280',
  },
  totalsValue: {
    fontSize: 9,
    color: '#374151',
    fontFamily: 'Helvetica-Bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 2,
    borderTopColor: '#1d4ed8',
    marginTop: 4,
  },
  grandLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  grandValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1d4ed8',
  },
  notesSection: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  notesLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
  },
})

export interface InvoicePDFProps {
  docType: string
  docNumber: string | null
  status: string
  issueDate: string
  dueDate: string | null
  currency: string
  subtotal: number
  discountTotal: number
  taxTotal: number
  grandTotal: number
  notes: string | null
  terms: string | null
  customer: {
    displayName: string
    mobile?: string
    email?: string | null
    billingAddress?: string | null
  } | null
  items: Array<{
    name: string
    sku?: string | null
    description?: string | null
    qty: number
    unitPrice: number
    discountPct: number
    taxPct: number
    lineTotal: number
    serial?: string | null
    warranty?: string | null
  }>
  company: {
    name: string
    address?: string
    phone?: string
    email?: string
    taxNumber?: string
  }
}

function fmt(n: number, currency = 'BHD') {
  return `${n.toFixed(3)} ${currency}`
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function InvoicePDF({
  docType,
  docNumber,
  status,
  issueDate,
  dueDate,
  currency,
  subtotal,
  discountTotal,
  taxTotal,
  grandTotal,
  notes,
  terms,
  customer,
  items,
  company,
}: InvoicePDFProps) {
  const label = docType.replace('_', ' ')

  return (
    <Document title={docNumber ?? label} author={company.name}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.companyInfo}>
              {[company.address, company.phone, company.email, company.taxNumber ? `VAT: ${company.taxNumber}` : null]
                .filter(Boolean)
                .join('\n')}
            </Text>
          </View>
          <View style={styles.docInfoBlock}>
            <Text style={styles.docType}>{label}</Text>
            <Text style={styles.docNumber}>{docNumber ?? 'DRAFT'}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Bill To</Text>
            <Text style={styles.metaValue}>
              {customer
                ? [customer.displayName, customer.mobile, customer.email, customer.billingAddress]
                    .filter(Boolean)
                    .join('\n')
                : 'Walk-in Customer'}
            </Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Issue Date</Text>
            <Text style={styles.metaValue}>{fmtDate(issueDate)}</Text>
            {dueDate && (
              <>
                <Text style={[styles.metaLabel, { marginTop: 8 }]}>Due Date</Text>
                <Text style={styles.metaValue}>{fmtDate(dueDate)}</Text>
              </>
            )}
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Currency</Text>
            <Text style={styles.metaValue}>{currency}</Text>
          </View>
        </View>

        {/* Items table header */}
        <View style={styles.tableHeader}>
          <View style={styles.colName}><Text style={styles.headerText}>Item</Text></View>
          <View style={styles.colQty}><Text style={styles.headerText}>Qty</Text></View>
          <View style={styles.colPrice}><Text style={styles.headerText}>Unit Price</Text></View>
          <View style={styles.colDisc}><Text style={styles.headerText}>Disc %</Text></View>
          <View style={styles.colTotal}><Text style={styles.headerText}>Total</Text></View>
        </View>

        {/* Items */}
        {items.map((item, i) => (
          <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
            <View style={styles.colName}>
              <Text style={styles.cellTextBold}>{item.name}</Text>
              {item.sku && <Text style={styles.cellSub}>SKU: {item.sku}</Text>}
              {item.description && <Text style={styles.cellSub}>{item.description}</Text>}
              {item.serial && <Text style={styles.cellSub}>S/N: {item.serial}</Text>}
              {item.warranty && <Text style={styles.cellSub}>Warranty: {item.warranty}</Text>}
            </View>
            <View style={styles.colQty}><Text style={styles.cellText}>{item.qty}</Text></View>
            <View style={styles.colPrice}><Text style={styles.cellText}>{item.unitPrice.toFixed(3)}</Text></View>
            <View style={styles.colDisc}>
              <Text style={styles.cellText}>{item.discountPct > 0 ? `${item.discountPct}%` : '—'}</Text>
            </View>
            <View style={styles.colTotal}>
              <Text style={styles.cellTextBold}>{item.lineTotal.toFixed(3)}</Text>
            </View>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{fmt(subtotal, currency)}</Text>
            </View>
            {discountTotal > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Discount</Text>
                <Text style={styles.totalsValue}>− {fmt(discountTotal, currency)}</Text>
              </View>
            )}
            {taxTotal > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Tax</Text>
                <Text style={styles.totalsValue}>+ {fmt(taxTotal, currency)}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandLabel}>Grand Total</Text>
              <Text style={styles.grandValue}>{fmt(grandTotal, currency)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {(notes || terms) && (
          <View style={styles.notesSection}>
            {notes && (
              <>
                <Text style={styles.notesLabel}>Notes</Text>
                <Text style={styles.notesText}>{notes}</Text>
              </>
            )}
            {terms && (
              <>
                <Text style={[styles.notesLabel, { marginTop: notes ? 8 : 0 }]}>Terms & Conditions</Text>
                <Text style={styles.notesText}>{terms}</Text>
              </>
            )}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          {company.name} — {docNumber ?? 'DRAFT'} — Generated by iSmart Market
        </Text>
      </Page>
    </Document>
  )
}
