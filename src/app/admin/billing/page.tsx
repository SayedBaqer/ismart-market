'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Plus, Search, ExternalLink } from 'lucide-react'

const DOC_TYPES = [
  { value: '', label: 'All' },
  { value: 'INVOICE', label: 'Invoices' },
  { value: 'ESTIMATE', label: 'Estimates' },
  { value: 'SALES_ORDER', label: 'Sales Orders' },
  { value: 'PURCHASE_ORDER', label: 'Purchase Orders' },
  { value: 'CREDIT_NOTE', label: 'Credit Notes' },
]

const STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'default',
  sent: 'info',
  paid: 'success',
  partial: 'warning',
  overdue: 'danger',
  cancelled: 'default',
}

interface DocRow {
  id: string
  docType: string
  docNumber: string | null
  status: string
  issueDate: string
  dueDate: string | null
  grandTotal: number
  customer: { id: string; displayName: string } | null
  _count: { items: number }
}

export default function BillingPage() {
  const [docs, setDocs] = useState<DocRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [docType, setDocType] = useState('')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      ...(docType ? { docType } : {}),
      ...(q ? { q } : {}),
    })
    const res = await fetch(`/api/admin/documents?${params}`)
    if (res.ok) {
      const d = await res.json()
      setDocs(d.docs)
      setTotal(d.total)
    }
    setLoading(false)
  }, [page, docType, q])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Billing & Documents</h1>
          <p className="text-sm text-gray-500">{total} documents</p>
        </div>
        <Link href="/admin/billing/new">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" /> New Document
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-gray-100 p-1">
          {DOC_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => { setDocType(t.value); setPage(1) }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                docType === t.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1) }}
            placeholder="Search doc # or customer…"
            className="h-9 w-48 rounded-lg border border-gray-200 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
          ) : docs.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-400">No documents yet</p>
              <Link href="/admin/billing/new" className="mt-2 inline-block text-xs text-blue-600 hover:underline">
                Create your first invoice
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                  <th className="px-4 py-3 text-left font-medium">Number</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-center font-medium">Issue Date</th>
                  <th className="px-4 py-3 text-center font-medium">Due Date</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-800">
                      {doc.docNumber ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {doc.docType.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-gray-800">
                      {doc.customer?.displayName ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={STATUS_COLORS[doc.status] ?? 'default'}>
                        {doc.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">
                      {new Date(doc.issueDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">
                      {doc.dueDate ? new Date(doc.dueDate).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {Number(doc.grandTotal).toFixed(3)} BHD
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/billing/${doc.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <ExternalLink className="h-3 w-3" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 25 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-xs text-gray-500">
            Page {page} of {Math.ceil(total / 25)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(total / 25)}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
