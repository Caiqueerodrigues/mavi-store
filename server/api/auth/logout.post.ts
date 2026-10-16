export default defineEventHandler(async (event) => {
  const user = requirePermission(event, 'dashboard:read')
  await revokeSession(event)
  await audit(event, 'AUTH_LOGOUT', 'auth', user.id)
  setResponseStatus(event, 204)
})
