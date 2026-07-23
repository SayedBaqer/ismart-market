import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="mb-4 text-7xl font-black text-gray-200">404</div>
      <h1 className="mb-2 text-xl font-bold text-gray-900">Page not found</h1>
      <p className="mb-6 text-sm text-gray-500">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Go Home
        </Link>
        <Link
          href="/products"
          className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Browse Products
        </Link>
      </div>
    </div>
  )
}
