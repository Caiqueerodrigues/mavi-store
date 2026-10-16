import { z } from "zod";
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  basePrice: z.coerce.number().nonnegative(),
  active: z.boolean().default(true),
});
export default defineEventHandler(async (event) => {
  requirePermission(event, "costs:manage");
  const input = await validatedBody(event, schema);
  try {
    const [row] =
      await db()`INSERT INTO service_types(name,base_price,active) VALUES(${input.name},${input.basePrice},${input.active}) RETURNING id,name,base_price,active`;
    await audit(event, "SERVICE_TYPE_CREATED", "service_type", row!.id, {
      name: input.name,
      basePrice: input.basePrice,
    });
    return { ...row, basePrice: Number(row!.basePrice) };
  } catch (error: any) {
    if (error?.code === "23505")
      throw createError({
        statusCode: 409,
        statusMessage: "Tipo de serviço já cadastrado",
      });
    throw error;
  }
});
