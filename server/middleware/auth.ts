export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) return
  const publicRoutes = ['/api/health', '/api/auth/login', '/api/auth/refresh']
  if (publicRoutes.includes(event.path.split('?')[0]!)) return
  const user = await verifyAccess(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Não autenticado' })
  ;(event.context as any).user = user
  const passwordRoutes = ['/api/auth/me', '/api/auth/change-password', '/api/auth/logout']
  if (user.mustChangePassword && !passwordRoutes.includes(event.path.split('?')[0]!)) throw createError({ statusCode: 403, statusMessage: 'Troca de senha obrigatória' })
  if (!['GET', 'HEAD', 'OPTIONS'].includes(event.method)) assertCsrf(event)
})
