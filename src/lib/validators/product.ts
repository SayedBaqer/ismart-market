import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z.string().min(1).max(100).optional(), // auto-generated if omitted
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  comparePrice: z.coerce.number().min(0).optional(),
  images: z.array(z.string().url().or(z.string().startsWith('/'))).default([]),
  categoryId: z.string().cuid().optional(),
  isActive: z.boolean().default(true),
  isHidden: z.boolean().default(false),
  trackStock: z.boolean().default(true),
  weight: z.coerce.number().min(0).optional(),
  meta: z.record(z.unknown()).default({}),
  // Stock on create
  initialQty: z.coerce.number().int().min(0).default(0),
  initialCostBhd: z.coerce.number().min(0).default(0),
  initialCostCny: z.coerce.number().min(0).default(0),
})

export const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().cuid(),
})

export const createCategorySchema = z.object({
  name: z.string().min(1).max(191),
  slug: z.string().min(1).max(191).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  parentId: z.string().cuid().optional().nullable(),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
  meta: z.record(z.unknown()).default({}),
})

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.string().cuid(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
