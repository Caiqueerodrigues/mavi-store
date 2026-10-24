export function requirePositiveRouteId(event: any): number {
  const raw = getRouterParam(event, "id") || "";
  if (!/^\d+$/.test(raw)) {
    throw createApiError({ statusCode: 400, message: "Identificador inválido" });
  }
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createApiError({ statusCode: 400, message: "Identificador inválido" });
  }
  return id;
}
