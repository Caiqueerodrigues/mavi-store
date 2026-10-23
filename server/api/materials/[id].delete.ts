export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const id = Number(getRouterParam(event, 'id'))
  try {
    const rows = await db()`DELETE FROM materials WHERE id=${id} RETURNING id`
    if (!rows.length) throw createApiError({ statusCode: 404, message: 'Insumo não encontrado' })
    await audit(event, 'MATERIAL_DELETED', 'material', id)
    setResponseStatus(event, 204)
  } catch (error: any) {
    if (error?.code === '23503') throw createApiError({ statusCode: 409, message: 'Este insumo faz parte de uma ficha técnica' })
    throw error
  }
})
