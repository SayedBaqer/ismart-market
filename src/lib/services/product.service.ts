import { prisma } from '@/lib/db'
import { ci } from '@/lib/db-compat'
import { slugify, nextSku } from '@/lib/utils'
import type { CreateProductInput, UpdateProductInput, CreateCategoryInput, UpdateCategoryInput } from '@/lib/validators/product'
import type { Prisma } from '@prisma/client'

// ── Categories ────────────────────────────────────────────────────────────────

export async function getCategories(activeOnly = false) {
  return prisma.category.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    include: {
      children: { orderBy: { displayOrder: 'asc' } },
      _count: { select: { products: true } },
    },
  })
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({ where: { slug } })
}

export async function createCategory(input: CreateCategoryInput) {
  const slug = input.slug || slugify(input.name)
  return prisma.category.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      imageUrl: input.imageUrl || undefined,
      displayOrder: input.displayOrder ?? 0,
      isActive: input.isActive ?? true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      meta: (input.meta ?? {}) as any,
      ...(input.parentId ? { parent: { connect: { id: input.parentId } } } : {}),
    },
  })
}

export async function updateCategory(input: UpdateCategoryInput) {
  const { id, parentId, meta, ...data } = input
  if (data.name && !data.slug) data.slug = slugify(data.name)
  return prisma.category.update({
    where: { id },
    data: {
      ...data,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(meta !== undefined ? { meta: meta as any } : {}),
      ...(parentId !== undefined
        ? parentId
          ? { parent: { connect: { id: parentId } } }
          : { parent: { disconnect: true } }
        : {}),
    },
  })
}

export async function deleteCategory(id: string) {
  // Move child categories to parent before deleting
  await prisma.category.updateMany({ where: { parentId: id }, data: { parentId: null } })
  // Unlink products
  await prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } })
  return prisma.category.delete({ where: { id } })
}

// ── Products ──────────────────────────────────────────────────────────────────

export interface ProductListOptions {
  search?: string
  categoryId?: string
  isActive?: boolean
  lowStock?: boolean
  page?: number
  pageSize?: number
}

export async function getProducts(opts: ProductListOptions = {}) {
  const { search, categoryId, isActive, page = 1, pageSize = 20 } = opts
  const skip = (page - 1) * pageSize

  const where: Prisma.ProductWhereInput = {
    ...(isActive !== undefined && { isActive }),
    ...(categoryId && { categoryId }),
    ...(search && {
      OR: [
        { name: { contains: search, ...ci() } },
        { sku: { contains: search, ...ci() } },
        { description: { contains: search, ...ci() } },
      ],
    }),
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        stockMeta: { select: { currentQty: true, avgCostBhd: true, threshold: true } },
      },
    }),
    prisma.product.count({ where }),
  ])

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      stockMeta: true,
      fifoBatches: { orderBy: { receivedAt: 'asc' } },
      variants: true,
    },
  })
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      stockMeta: { select: { currentQty: true } },
      variants: { where: { isActive: true } },
    },
  })
}

export async function createProduct(input: CreateProductInput, createdById?: string) {
  // Generate SKU if not provided
  let sku = input.sku
  if (!sku) {
    const existing = await prisma.product.findMany({ select: { sku: true } })
    sku = nextSku(existing.map((p) => p.sku))
  }

  const slug = slugify(input.name)

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: input.name,
        sku,
        slug: await uniqueSlug(slug, tx),
        description: input.description,
        price: input.price,
        comparePrice: input.comparePrice,
        images: input.images,
        categoryId: input.categoryId,
        isActive: input.isActive,
        isHidden: input.isHidden,
        trackStock: input.trackStock,
        weight: input.weight,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: input.meta as any,
      },
    })

    // Initialise stock meta
    await tx.stockMeta.create({
      data: {
        productId: product.id,
        currentQty: input.initialQty,
        avgCostBhd: input.initialCostBhd,
        avgCostCny: input.initialCostCny,
      },
    })

    // Create opening FIFO batch if there's initial stock
    if (input.initialQty > 0) {
      await tx.fifoBatch.create({
        data: {
          productId: product.id,
          qtyReceived: input.initialQty,
          qtyRemaining: input.initialQty,
          unitCostBhd: input.initialCostBhd,
          unitCostCny: input.initialCostCny,
          reference: 'Opening stock',
        },
      })
      await tx.stockAdjustment.create({
        data: {
          productId: product.id,
          type: 'IMPORT',
          qtyBefore: 0,
          qtyChange: input.initialQty,
          qtyAfter: input.initialQty,
          costBhd: input.initialCostBhd,
          reason: 'Opening stock',
          createdById,
        },
      })
    }

    return product
  })
}

export async function updateProduct(input: UpdateProductInput) {
  const { id, initialQty: _q, initialCostBhd: _cb, initialCostCny: _cc, meta, categoryId, ...data } = input
  if (data.name && !('slug' in data)) {
    (data as { slug?: string }).slug = slugify(data.name as string)
  }
  return prisma.product.update({
    where: { id },
    data: {
      ...data,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(meta !== undefined ? { meta: meta as any } : {}),
      ...(categoryId !== undefined
        ? categoryId
          ? { category: { connect: { id: categoryId } } }
          : { category: { disconnect: true } }
        : {}),
    },
  })
}

export async function deleteProduct(id: string) {
  // Soft-delete by deactivating rather than hard deleting (preserves invoice history)
  return prisma.product.update({ where: { id }, data: { isActive: false, isHidden: true } })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function uniqueSlug(base: string, tx: Prisma.TransactionClient): Promise<string> {
  let slug = base
  let i = 1
  while (await tx.product.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`
  }
  return slug
}
