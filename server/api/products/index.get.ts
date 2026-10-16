export default defineEventHandler((event) => { requirePermission(event, 'costs:manage'); return listProducts() })
