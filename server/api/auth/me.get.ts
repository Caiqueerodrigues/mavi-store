export default defineEventHandler((event) => ({ user: requirePermission(event, 'dashboard:read') }))
