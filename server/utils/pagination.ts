export function getPagination(event: any) {
  const query = getQuery(event)
  const requested = Number(query.limit)
  if (!Number.isFinite(requested) || requested < 1) return null
  return {
    limit: Math.min(100, Math.floor(requested)),
    offset: Math.max(0, Math.floor(Number(query.offset) || 0)),
  }
}
