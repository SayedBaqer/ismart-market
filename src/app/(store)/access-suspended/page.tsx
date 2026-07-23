import Link from 'next/link'
import { ShieldOff, ArrowLeft } from 'lucide-react'

export default function AccessSuspendedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="max-w-md w-full">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-100">
          <ShieldOff className="h-10 w-10 text-red-500" />
        </div>

        {/* Text */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Store Access Suspended</h1>
        <p className="text-gray-500 text-sm mb-6">
          You declined the Terms &amp; Conditions. Store access requires your agreement to our
          terms before you can browse or purchase products.
        </p>

        {/* Info box */}
        <div className="rounded-2xl bg-white border border-gray-200 p-5 mb-6 text-left space-y-3 shadow-sm">
          <p className="text-sm font-semibold text-gray-900">To restore access:</p>
          <ol className="space-y-2 text-sm text-gray-600 list-none">
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">1</span>
              Return to the store homepage
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">2</span>
              The Terms &amp; Conditions modal will appear again
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">3</span>
              Click &quot;I Accept — Enter Store&quot; to proceed
            </li>
          </ol>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
          style={{ backgroundColor: 'var(--primary, #2563eb)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Store
        </Link>

        <p className="mt-4 text-xs text-gray-400">
          If you believe this is an error, contact the store administrator.
        </p>
      </div>
    </div>
  )
}
