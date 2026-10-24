export default defineEventHandler(async (event) => {
  requirePermission(event, "users:manage");
  const id = requirePositiveRouteId(event);
  const [row] = await db()`SELECT id, name, email, role, active, must_change_password,
    last_login_at, created_at, updated_at FROM users WHERE id=${id} AND deleted_at IS NULL`;
  if (!row) throw createApiError({ statusCode: 404, message: "Usuário não encontrado" });
  return row;
});
