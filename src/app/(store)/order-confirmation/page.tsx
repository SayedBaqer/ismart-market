import { CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  // In Next.js 16 searchParams is a Promise
  const resolveParams = async () => {
    const p = await searchParams
    return p.order
  }

  return <OrderConfirmationContent paramsPromise={resolveParams()} />
}

async function OrderConfirmationContent({ paramsPromise }: { paramsPromise: Promise<string | undefined> }) {
  const orderNumber = await paramsPromise

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <CheckCircle className="mx-auto mb-6 h-20 w-20 text-green-500" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Order Placed!</h1>
      {orderNumber && (
        <p className="mb-1 text-sm text-gray-500">
          Order number: <span className="font-semibold text-gray-800">{orderNumber}</span>
        </p>
      )}
      <p className="mb-8 text-sm text-gray-500">
        Thank you for your order. We will contact you shortly to confirm delivery details.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/products"
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Continue Shopping
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
