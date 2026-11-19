import { z } from 'zod'

export const payableServiceSchema = z.object({
  orderDate: z.string().date(),
  deliveryDate: z.string().date().nullable().optional(),
  agreedAmount: z.coerce.number().nonnegative(),
  quantity: z.coerce.number().int().positive(),
  serviceTypeName: z.string().trim().min(1, 'Informe o tipo de serviço').max(100),
  recipientName: z.string().trim().min(1, 'Informe o nome do recebedor').max(160),
  paymentDate: z.string().date().nullable().optional(),
  paymentStatus: z.enum(['pending', 'paid', 'cancelled']).default('pending'),
}).superRefine((input, context) => {
  if (input.paymentStatus === 'paid' && !input.paymentDate) {
    context.addIssue({ code: 'custom', path: ['paymentDate'], message: 'Informe a data do pagamento para contas pagas' })
  }
})

function mapDateOnly(value: unknown): string | null {
  if (!value) return null
  const raw = value instanceof Date ? value.toISOString() : String(value)
  return /^(\d{4}-\d{2}-\d{2})/.exec(raw)?.[1] || null
}

export function mapPayableService(row: any) {
  return {
    id: row.id,
    orderDate: mapDateOnly(row.orderDate),
    deliveryDate: mapDateOnly(row.deliveryDate),
    agreedAmount: Number(row.agreedAmount),
    quantity: Number(row.quantity),
    serviceTypeId: row.serviceTypeId,
    serviceTypeName: row.serviceTypeName,
    recipientName: row.recipientName,
    totalAmount: Number(row.totalAmount),
    paymentDate: mapDateOnly(row.paymentDate),
    paymentStatus: row.paymentStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
