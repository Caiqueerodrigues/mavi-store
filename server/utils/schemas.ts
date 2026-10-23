import { z } from 'zod'

export const materialSchema = z.object({
  name: z.string().trim().min(2).max(160),
  supplier: z.string().trim().max(160).nullable().optional(),
  costType: z.enum(['material', 'labor', 'service', 'packaging']).default('material'),
  unit: z.string().trim().min(1).max(20),
  purchasePrice: z.coerce.number().nonnegative(),
  yieldQuantity: z.coerce.number().positive(),
  active: z.boolean().optional().default(true)
})

export const channelSchema = z.object({
  name: z.string().trim().min(2).max(100),
  fixedFee: z.coerce.number().nonnegative(),
  percentageFee: z.coerce.number().min(0).max(0.99),
  active: z.boolean().optional().default(true)
})

export const componentSchema = z.object({
  materialId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().positive(),
  wastePercent: z.coerce.number().min(0).max(5).default(0)
})

export const productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  sku: z.string().trim().min(1).max(80),
  category: z.string().trim().min(2).max(60),
  color: z.string().trim().max(120).nullable().optional(),
  currentPrice: z.coerce.number().nonnegative(),
  components: z.array(componentSchema).min(1)
})

export const productActiveSchema = z.object({ active: z.boolean() })

export async function validatedBody<T>(event: Parameters<typeof readBody>[0], schema: z.ZodType<T>) {
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createApiError({ statusCode: 422, message: 'Dados inválidos', data: parsed.error.flatten() })
  }
  return parsed.data
}
