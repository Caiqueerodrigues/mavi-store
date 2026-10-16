export default defineEventHandler(async (event) => {
  requirePermission(event, 'costs:manage')
  const id = Number(getRouterParam(event, 'id'))
  try {
    const rows = await db()`DELETE FROM materials WHERE id=${id} RETURNING id`
    if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'Insumo não encontrado' })
    await audit(event, 'MATERIAL_DELETED', 'material', id)
    setResponseStatus(event, 204)
  } catch (error: any) {
    if (error?.code === '23503') throw createError({ statusCode: 409, statusMessage: 'Este insumo faz parte de uma ficha técnica' })
    throw error
  }
})
