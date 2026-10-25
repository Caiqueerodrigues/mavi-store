import { z } from 'zod'

const orderBaseSchema = z.object({
  orderNumber: z.string().trim().min(1).max(40),
  customerId: z.coerce.number().int().positive(),
  customerName: z.string().trim().min(2).max(160),
  serviceTypeId: z.coerce.number().int().positive(),
  orderType: z.string().trim().max(40).optional().default(''),
  productDescription: z.string().trim().min(2).max(300),
  material: z.string().trim().max(180).nullable().optional(),
  color: z.string().trim().max(120).nullable().optional(),
  orderDate: z.string().date(), dueDate: z.string().date().nullable().optional(),
  paymentDate: z.string().date().nullable().optional(),
  quantity: z.coerce.number().positive(), unitPrice: z.coerce.number().nonnegative(), paidAmount: z.coerce.number().nonnegative().default(0),
  paymentStatus: z.enum(['pending','partial','paid','refunded']).default('pending'),
  status: z.enum(['pending','in_production','ready','delivered','completed','cancelled']).default('pending'),
  sizes: z.array(z.object({ size: z.string().trim().min(1).max(20), color: z.string().trim().max(120).optional().default(''), quantity: z.coerce.number().positive() })).default([]),
  withdrawalDate: z.string().date().nullable().optional(), withdrawnBy: z.string().trim().max(160).nullable().optional(), notes: z.string().max(2000).nullable().optional()
})

function validateGrade(input: { quantity: number, sizes: Array<{ quantity: number }> }, context: z.RefinementCtx) {
  const gradeQuantity = input.sizes.reduce((sum, item) => sum + Number(item.quantity), 0)
  if (Math.abs(gradeQuantity - Number(input.quantity)) > 0.0001) {
    context.addIssue({ code: 'custom', path: ['sizes'], message: 'A soma das quantidades da grade deve ser igual à quantidade do pedido' })
  }
}

function validatePaymentDate(input: { paymentStatus: string; paymentDate?: string | null }, context: z.RefinementCtx) {
  if (input.paymentStatus === 'paid' && !input.paymentDate) {
    context.addIssue({ code: 'custom', path: ['paymentDate'], message: 'Informe a data do pagamento para pedidos pagos' })
  }
}

export const orderSchema = orderBaseSchema.superRefine(validateGrade).superRefine(validatePaymentDate)
export const orderCreateSchema = orderBaseSchema.omit({ orderNumber: true }).superRefine(validateGrade).superRefine(validatePaymentDate)

function mapDateOnly(value: unknown): string | null {
  if (!value) return null
  const raw = value instanceof Date ? value.toISOString() : String(value)
  const isoDate = /^(\d{4}-\d{2}-\d{2})/.exec(raw)?.[1]
  if (isoDate) return isoDate
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

export function mapOrder(row: any) {
  return { id: row.id, orderNumber: row.orderNumber, customerId: row.customerId, customerName: row.customerName, serviceTypeId: row.serviceTypeId, orderType: row.orderType,
    productDescription: row.productDescription, material: row.material, color: row.color, orderDate: mapDateOnly(row.orderDate),
    dueDate: mapDateOnly(row.dueDate), paymentDate: mapDateOnly(row.paymentDate), quantity: Number(row.quantity), unitPrice: Number(row.unitPrice), total: Number(row.quantity) * Number(row.unitPrice),
    paidAmount: Number(row.paidAmount), paymentStatus: row.paymentStatus, status: row.status, sizes: row.sizes || [], withdrawalDate: mapDateOnly(row.withdrawalDate),
    withdrawnBy: row.withdrawnBy, notes: row.notes, createdAt: row.createdAt, updatedAt: row.updatedAt }
}
