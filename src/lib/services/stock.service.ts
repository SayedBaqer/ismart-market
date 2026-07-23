/**
 * FIFO Stock Engine — ported from iStock Suite v3.6.0 patterns
 *
 * Rules (same as iStock):
 * - Single source of truth: stock_meta.current_qty + fifo_batches
 * - All writes are idempotent absolute or delta operations
 * - Every change logs to stock_adjustments
 * - Average cost recomputed after every write
 */

import { prisma } from '@/lib/db'
import { ci } from '@/lib/db-compat'
import { Decimal } from 'decimal.js'
import type { StockAdjustmentType } from '@prisma/client'

// ── Read helpers ──────────────────────────────────────────────────────────────

export async function getStockList(opts: {
  search?: string
  lowStock?: boolean
  outOfStock?: boolean
  page?: number
  pageSize?: number
}) {
  const { search, lowStock, outOfStock, page = 1, pageSize = 30 } = opts
  const skip = (page - 1) * pageSize

  const items = await prisma.product.findMany({
    where: {
      isActive: true,
      trackStock: true,
      ...(search && {
        OR: [
          { name: { contains: search, ...ci() } },
          { sku: { contains: search, ...ci() } },
        ],
      }),
    },
    skip,
    take: pageSize,
    orderBy: { name: 'asc' },
    include: {
      stockMeta: true,
      category: { select: { name: true } },
    },
  })

  const filtered = items.filter((p) => {
    const qty = p.stockMeta?.currentQty ?? 0
    const threshold = p.stockMeta?.threshold ?? 0
    if (outOfStock) return qty <= 0
    if (lowStock) return threshold > 0 && qty > 0 && qty <= threshold
    return true
  })

  return filtered
}

export async function getProductStock(productId: string) {
  const [meta, batches, movements] = await Promise.all([
    prisma.stockMeta.findUnique({ where: { productId } }),
    prisma.fifoBatch.findMany({
      where: { productId },
      orderBy: { receivedAt: 'asc' },
    }),
    prisma.stockAdjustment.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { createdBy: { select: { name: true, email: true } } },
    }),
  ])
  return { meta, batches, movements }
}

// ── Write operations ──────────────────────────────────────────────────────────

export interface AdjustOptions {
  productId: string
  type: StockAdjustmentType
  qty: number            // positive = add, negative = consume
  costBhd?: number       // unit cost (for IMPORT)
  costCny?: number
  reason?: string
  reference?: string     // order ID, invoice ID, etc.
  createdById?: string
}

/**
 * Apply a stock delta (+/-). Idempotent relative to the direction.
 * For IMPORT: creates a new FIFO batch.
 * For SALE/DEFECT/MANUAL (negative): consumes oldest batches first (FIFO).
 */
export async function adjustStock(opts: AdjustOptions) {
  const { productId, type, qty, costBhd = 0, costCny = 0, reason, reference, createdById } = opts

  return prisma.$transaction(async (tx) => {
    // Lock the stock meta row
    const meta = await tx.stockMeta.findUnique({ where: { productId } })
    if (!meta) throw new Error(`No stock meta for product ${productId}`)

    const before = meta.currentQty

    if (qty > 0) {
      // ── Receive stock: create new FIFO batch ─────────────────────────────
      await tx.fifoBatch.create({
        data: {
          productId,
          qtyReceived: qty,
          qtyRemaining: qty,
          unitCostBhd: costBhd,
          unitCostCny: costCny,
          reference,
        },
      })
    } else if (qty < 0) {
      // ── Consume stock: FIFO depletion ────────────────────────────────────
      let remaining = Math.abs(qty)
      const batches = await tx.fifoBatch.findMany({
        where: { productId, qtyRemaining: { gt: 0 } },
        orderBy: { receivedAt: 'asc' },
      })

      for (const batch of batches) {
        if (remaining <= 0) break
        const consume = Math.min(Number(batch.qtyRemaining), remaining)
        await tx.fifoBatch.update({
          where: { id: batch.id },
          data: { qtyRemaining: { decrement: consume } },
        })
        remaining -= consume
      }

      if (remaining > 0) {
        // Oversell guard — allow but log (some businesses allow negative stock)
        console.warn(`[stock] Product ${productId} stock went negative by ${remaining}`)
      }
    }

    // Recompute average cost from remaining batches
    const batches = await tx.fifoBatch.findMany({
      where: { productId, qtyRemaining: { gt: 0 } },
    })

    let totalQty = new Decimal(0)
    let totalCostBhd = new Decimal(0)
    let totalCostCny = new Decimal(0)

    for (const b of batches) {
      const q = new Decimal(b.qtyRemaining.toString())
      totalQty = totalQty.plus(q)
      totalCostBhd = totalCostBhd.plus(q.times(b.unitCostBhd.toString()))
      totalCostCny = totalCostCny.plus(q.times(b.unitCostCny.toString()))
    }

    const newQty = Number(meta.currentQty) + qty
    const avgCostBhd = totalQty.gt(0) ? totalCostBhd.div(totalQty) : new Decimal(meta.avgCostBhd.toString())
    const avgCostCny = totalQty.gt(0) ? totalCostCny.div(totalQty) : new Decimal(meta.avgCostCny.toString())

    // Update stock meta
    await tx.stockMeta.update({
      where: { productId },
      data: {
        currentQty: newQty,
        avgCostBhd: avgCostBhd.toFixed(4),
        avgCostCny: avgCostCny.toFixed(4),
      },
    })

    // Log adjustment
    await tx.stockAdjustment.create({
      data: {
        productId,
        type,
        qtyBefore: before,
        qtyChange: qty,
        qtyAfter: newQty,
        costBhd: costBhd || null,
        reason,
        reference,
        createdById,
      },
    })

    return { before, after: newQty, avgCostBhd: avgCostBhd.toFixed(4) }
  })
}

/**
 * Set an absolute quantity (idempotent).
 * Computes the delta and calls adjustStock.
 */
export async function setAbsoluteQty(opts: {
  productId: string
  targetQty: number
  costBhd?: number
  costCny?: number
  reason?: string
  createdById?: string
}) {
  const meta = await prisma.stockMeta.findUnique({ where: { productId: opts.productId } })
  if (!meta) throw new Error('Product not found')

  const delta = opts.targetQty - Number(meta.currentQty)
  if (delta === 0) return { before: Number(meta.currentQty), after: Number(meta.currentQty), avgCostBhd: meta.avgCostBhd.toString() }

  return adjustStock({
    productId: opts.productId,
    type: 'MANUAL',
    qty: delta,
    costBhd: opts.costBhd,
    costCny: opts.costCny,
    reason: opts.reason ?? 'Absolute quantity set',
    createdById: opts.createdById,
  })
}

/**
 * Delete a FIFO batch and resync stock.
 */
export async function deleteFifoBatch(batchId: string, userId?: string) {
  return prisma.$transaction(async (tx) => {
    const batch = await tx.fifoBatch.findUnique({ where: { id: batchId } })
    if (!batch) throw new Error('Batch not found')

    await tx.fifoBatch.delete({ where: { id: batchId } })

    // Recompute from remaining batches
    const remaining = await tx.fifoBatch.findMany({
      where: { productId: batch.productId, qtyRemaining: { gt: 0 } },
    })

    let totalQty = new Decimal(0)
    let totalCostBhd = new Decimal(0)
    let totalCostCny = new Decimal(0)

    for (const b of remaining) {
      const q = new Decimal(b.qtyRemaining.toString())
      totalQty = totalQty.plus(q)
      totalCostBhd = totalCostBhd.plus(q.times(b.unitCostBhd.toString()))
      totalCostCny = totalCostCny.plus(q.times(b.unitCostCny.toString()))
    }

    const newQty = totalQty.toNumber()
    const meta = await tx.stockMeta.findUnique({ where: { productId: batch.productId } })
    const avgCostBhd = totalQty.gt(0) ? totalCostBhd.div(totalQty) : new Decimal(meta?.avgCostBhd?.toString() ?? '0')
    const avgCostCny = totalQty.gt(0) ? totalCostCny.div(totalQty) : new Decimal(meta?.avgCostCny?.toString() ?? '0')

    await tx.stockMeta.update({
      where: { productId: batch.productId },
      data: {
        currentQty: newQty,
        avgCostBhd: avgCostBhd.toFixed(4),
        avgCostCny: avgCostCny.toFixed(4),
      },
    })

    await tx.stockAdjustment.create({
      data: {
        productId: batch.productId,
        type: 'MANUAL',
        qtyBefore: meta?.currentQty ?? 0,
        qtyChange: newQty - Number(meta?.currentQty ?? 0),
        qtyAfter: newQty,
        reason: `FIFO batch deleted (ref: ${batch.reference ?? batch.id})`,
        createdById: userId,
      },
    })

    return { newQty, avgCostBhd: avgCostBhd.toFixed(4) }
  })
}
