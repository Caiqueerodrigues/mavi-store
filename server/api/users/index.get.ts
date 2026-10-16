export default defineEventHandler(async (event) => {
  requirePermission(event, 'users:manage')
  return db()`SELECT id, name, email, role, active, must_change_password, last_login_at, created_at
    FROM users WHERE deleted_at IS NULL ORDER BY name`
})
