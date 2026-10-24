export default defineEventHandler(async (event) => {
  requirePermission(event, "costs:manage");
  const id = requirePositiveRouteId(event);
  const [product] = await listProducts(id, null, undefined, true);
  if (!product) throw createApiError({ statusCode: 404, message: "Produto não encontrado" });
  return product;
});
