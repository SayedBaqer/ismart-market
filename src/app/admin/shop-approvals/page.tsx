'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, Clock, Store, RefreshCw, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ShopApproval {
  shopId: string
  shopName: string
  shopSlug: string
  pending: {
    sections: Array<{ type: string; enabled: boolean }>
    banner: string | null
    tagline: string
    submittedAt: string
    submittedBy: string
    status: string
  }
}

const SECTION_LABELS: Record<string, string> = {
  'top-sellers': '🏆 Top Sellers',
  'recent-sales': '⚡ Recent Sales',
  'new-arrivals': '✨ New Arrivals',
  'featured': '⭐ Featured',
  'categories': '🗂️ Categories',
}

export default function ShopApprovalsPage() {
  const [approvals, setApprovals] = useState<ShopApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/shop-approvals')
    if (res.ok) setApprovals(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function act(shopId: string, action: 'approve' | 'reject') {
    setProcessing(shopId)
    await fetch(`/api/admin/shops/${shopId}/display`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    await load()
    setProcessing(null)
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Store className="h-5 w-5 text-blue-600" /> Shop Display Approvals
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and approve display setting changes from shop owners</p>
        </div>
        <button onClick={load} className="rounded-xl p-2 bg-gray-100 hover:bg-gray-200 transition-colors">
          <RefreshCw className={`h-4 w-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading…</p>
        </div>
      ) : approvals.length === 0 ? (
        <div className="text-center py-16 rounded-2xl bg-white border border-gray-100">
          <CheckCircle2 className="h-12 w-12 text-emerald-200 mx-auto mb-3" />
          <p className="font-medium text-gray-500">No pending approvals</p>
          <p className="text-sm text-gray-400 mt-1">Shop display changes will appear here for review</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((item) => {
            const isExpanded = expanded === item.shopId
            const isProcessing = processing === item.shopId
            const enabledSections = item.pending.sections.filter((s) => s.enabled)

            return (
              <div key={item.shopId} className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                    <Store className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{item.shopName}</p>
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <Clock className="h-3 w-3" />
                      Submitted {new Date(item.pending.submittedAt).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : item.shopId)}
                    className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>

                {/* Quick preview */}
                <div className="px-5 pb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {enabledSections.map((s) => (
                      <span key={s.type} className="rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs text-blue-700">
                        {SECTION_LABELS[s.type] ?? s.type}
                      </span>
                    ))}
                    {item.pending.tagline && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 italic">
                        &ldquo;{item.pending.tagline.slice(0, 30)}{item.pending.tagline.length > 30 ? '…' : ''}&rdquo;
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">All Requested Sections</p>
                    <div className="grid grid-cols-2 gap-2">
                      {item.pending.sections.map((s) => (
                        <div key={s.type} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${s.enabled ? 'bg-white border border-emerald-200 text-emerald-700' : 'bg-white border border-gray-100 text-gray-400 line-through'}`}>
                          {s.enabled ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                          {SECTION_LABELS[s.type] ?? s.type}
                        </div>
                      ))}
                    </div>
                    {item.pending.tagline && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Tagline</p>
                        <p className="text-sm text-gray-700 italic">&ldquo;{item.pending.tagline}&rdquo;</p>
                      </div>
                    )}
                    {item.pending.banner && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Banner</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.pending.banner} alt="Banner preview" className="max-h-24 rounded-lg object-cover border border-gray-100" />
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 px-5 pb-4">
                  <Button
                    size="sm"
                    isLoading={isProcessing}
                    onClick={() => act(item.shopId, 'approve')}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={isProcessing}
                    onClick={() => act(item.shopId, 'reject')}
                    className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
