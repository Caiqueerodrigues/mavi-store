export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) return
  const publicRoutes = ['/api/health', '/api/auth/login', '/api/auth/refresh']
  if (publicRoutes.includes(event.path.split('?')[0]!)) return
  const user = await verifyAccess(event)
  if (!user) throw createApiError({ statusCode: 401, message: 'Não autenticado' })
  ;(event.context as any).user = user
  const passwordRoutes = ['/api/auth/me', '/api/auth/change-password', '/api/auth/logout']
  if (user.mustChangePassword && !passwordRoutes.includes(event.path.split('?')[0]!)) throw createApiError({ statusCode: 403, message: 'Troca de senha obrigatória' })
  if (!['GET', 'HEAD', 'OPTIONS'].includes(event.method)) assertCsrf(event)
})
