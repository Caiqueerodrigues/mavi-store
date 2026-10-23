import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  basePrice: z.coerce.number().nonnegative(),
  active: z.boolean(),
});

export default defineEventHandler(async (event) => {
  requirePermission(event, "costs:manage");
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isInteger(id) || id <= 0)
    throw createApiError({
      statusCode: 400,
      message: "Tipo de serviço inválido",
    });
  const input = await validatedBody(event, schema);
  try {
    const [row] =
      await db()`UPDATE service_types SET name=${input.name},base_price=${input.basePrice},active=${input.active},updated_at=NOW() WHERE id=${id} RETURNING id,name,base_price,active`;
    if (!row)
      throw createApiError({
        statusCode: 404,
        message: "Tipo de serviço não encontrado",
      });
    await audit(event, "SERVICE_TYPE_UPDATED", "service_type", id, {
      name: input.name,
      basePrice: input.basePrice,
      active: input.active,
    });
    return { ...row, basePrice: Number(row.basePrice) };
  } catch (error: any) {
    if (error?.code === "23505")
      throw createApiError({
        statusCode: 409,
        message: "Tipo de serviço já cadastrado",
      });
    throw error;
  }
});
