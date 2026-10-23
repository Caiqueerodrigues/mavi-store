export default defineEventHandler(async (event) => {
  const actor = requirePermission(event, 'users:manage'), id = Number(getRouterParam(event, 'id'))
  if (actor.id === id) throw createApiError({ statusCode: 422, message: 'Você não pode excluir seu próprio usuário' })
  const rows = await db()`UPDATE users SET active=FALSE, deleted_at=NOW(), updated_at=NOW() WHERE id=${id} AND deleted_at IS NULL RETURNING id`
  if (!rows.length) throw createApiError({ statusCode: 404, message: 'Usuário não encontrado' })
  await db()`UPDATE refresh_sessions SET revoked_at=NOW() WHERE user_id=${id} AND revoked_at IS NULL`
  await audit(event, 'USER_DELETED', 'user', id)
  setResponseStatus(event, 204)
})
