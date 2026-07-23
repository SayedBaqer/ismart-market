'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, X, Check, FileText, ExternalLink } from 'lucide-react'

interface TermsGateProps {
  version: number
  content: string
  required: boolean
  storeName: string
}

const COOKIE_PREFIX = 'terms_accepted_v'

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : undefined
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

export function TermsGate({ version, content, required, storeName }: TermsGateProps) {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [tab, setTab] = useState<'terms' | 'summary'>('summary')
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!required || !content) return
    const cookieName = `${COOKIE_PREFIX}${version}`
    const accepted = getCookie(cookieName)
    if (!accepted) setShow(true)
  }, [required, content, version])

  function accept() {
    const cookieName = `${COOKIE_PREFIX}${version}`
    setCookie(cookieName, 'true', 3650) // 10 years
    setShow(false)
  }

  function deny() {
    setShow(false)
    router.push('/access-suspended')
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700 text-white shrink-0">
          <div className="rounded-2xl bg-white/20 p-2.5">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold">Terms &amp; Conditions</h2>
            <p className="text-sm text-blue-100 mt-0.5">{storeName} · Version {version}</p>
          </div>
          <span className="text-xs bg-white/20 rounded-full px-2.5 py-1 font-medium">Required</span>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-gray-100 px-6 shrink-0 bg-gray-50/50">
          {[
            { id: 'summary', label: 'Summary', icon: Check },
            { id: 'terms', label: 'Full Terms', icon: FileText },
          ].map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as 'terms' | 'summary')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto px-6 py-5"
          onScroll={(e) => {
            const el = e.currentTarget
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setScrolled(true)
          }}
        >
          {tab === 'summary' ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">What you&apos;re agreeing to:</p>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    Use {storeName} services in accordance with our terms
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    We collect minimal data to operate the service (see Privacy Policy)
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    Orders are subject to availability and our returns policy
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    Your continued use means acceptance of any future updates
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
                <Shield className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Store Access Notice</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Declining these terms will suspend your access to this store. You can return
                    and accept at any time to restore access.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setTab('terms')}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <ExternalLink className="h-4 w-4" />
                Read full Terms &amp; Conditions
              </button>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-gray-700 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {content || 'No terms content has been set by the store administrator.'}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 border-t border-gray-100 bg-gray-50/80 px-6 py-4">
          <div className="flex gap-3">
            <button
              onClick={deny}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all"
            >
              <X className="h-4 w-4" />
              Decline &amp; Exit
            </button>
            <button
              onClick={accept}
              className="flex-[2] flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all shadow-sm"
              style={{ backgroundColor: 'var(--primary, #2563eb)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-dark, #1d4ed8)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary, #2563eb)')}
            >
              <Check className="h-4 w-4" />
              I Accept — Enter Store
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2.5">
            By clicking &quot;I Accept&quot; you agree to our Terms &amp; Conditions and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
