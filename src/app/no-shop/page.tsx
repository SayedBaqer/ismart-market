import Link from 'next/link'
import { Store, LogIn } from 'lucide-react'

export default function NoShopPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-3xl bg-blue-100 flex items-center justify-center">
            <Store className="h-10 w-10 text-blue-400" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">No Shop Assigned</h1>
          <p className="mt-2 text-gray-500">
            Your account is not associated with any shop. Contact your manager to be added to a shop.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/admin/login"
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <LogIn className="h-4 w-4" /> Sign in with a different account
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to store
          </Link>
        </div>
      </div>
    </div>
  )
}
