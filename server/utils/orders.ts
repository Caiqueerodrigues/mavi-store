import { z } from 'zod'

export const orderSchema = z.object({
  orderNumber: z.string().trim().min(1).max(40),
  customerId: z.coerce.number().int().positive(),
  customerName: z.string().trim().min(2).max(160),
  serviceTypeId: z.coerce.number().int().positive(),
  orderType: z.string().trim().min(2).max(40).default('CORTE'),
  productDescription: z.string().trim().min(2).max(300),
  material: z.string().trim().max(180).nullable().optional(),
  color: z.string().trim().max(120).nullable().optional(),
  orderDate: z.string().date(), dueDate: z.string().date().nullable().optional(),
  quantity: z.coerce.number().positive(), unitPrice: z.coerce.number().nonnegative(), paidAmount: z.coerce.number().nonnegative().default(0),
  paymentStatus: z.enum(['pending','partial','paid','refunded']).default('pending'),
  status: z.enum(['pending','in_production','ready','delivered','completed','cancelled']).default('pending'),
  sizes: z.array(z.object({ size: z.string().trim().min(1).max(20), quantity: z.coerce.number().positive() })).default([]),
  withdrawalDate: z.string().date().nullable().optional(), withdrawnBy: z.string().trim().max(160).nullable().optional(), notes: z.string().max(2000).nullable().optional()
})

export const orderCreateSchema = orderSchema.omit({ orderNumber: true })

export function mapOrder(row: any) {
  return { id: row.id, orderNumber: row.orderNumber, customerId: row.customerId, customerName: row.customerName, serviceTypeId: row.serviceTypeId, orderType: row.orderType,
    productDescription: row.productDescription, material: row.material, color: row.color, orderDate: row.orderDate,
    dueDate: row.dueDate, quantity: Number(row.quantity), unitPrice: Number(row.unitPrice), total: Number(row.quantity) * Number(row.unitPrice),
    paidAmount: Number(row.paidAmount), paymentStatus: row.paymentStatus, status: row.status, sizes: row.sizes || [], withdrawalDate: row.withdrawalDate,
    withdrawnBy: row.withdrawnBy, notes: row.notes, createdAt: row.createdAt, updatedAt: row.updatedAt }
}
