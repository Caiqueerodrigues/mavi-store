export default defineEventHandler(async (event) => {
  assertCsrf(event)
  const user = await rotateRefresh(event)
  ;(event.context as any).user = user
  await issueSession(event, user)
  await audit(event, 'AUTH_REFRESH', 'auth', user.id)
  return { user }
})
