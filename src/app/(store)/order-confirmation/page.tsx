import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { getStoreT } from '@/lib/i18n/get-store-lang'

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const [params, t] = await Promise.all([searchParams, getStoreT()])
  const orderNumber = params.order

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center" dir={t.dir}>
      <CheckCircle className="mx-auto mb-6 h-20 w-20 text-green-500" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{t.orderPlacedTitle}</h1>
      {orderNumber && (
        <p className="mb-1 text-sm text-gray-500">
          {t.orderNumberLabel} <span className="font-semibold text-gray-800">{orderNumber}</span>
        </p>
      )}
      <p className="mb-8 text-sm text-gray-500">{t.orderThankYou}</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/products"
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          {t.continueShopping}
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {t.backToHome}
        </Link>
      </div>
    </div>
  )
}
