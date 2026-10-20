export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'access-control-expose-headers': 'X-Server-Time',
    // Nuxt serializes its import map, runtime config and hydration payload inline.
    'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
  })
  if (String(useRuntimeConfig().cookieSecure).toLowerCase() === 'true')
    setResponseHeader(event, 'strict-transport-security', 'max-age=31536000; includeSubDomains')
  if (event.path.startsWith('/api/')) setResponseHeader(event, 'cache-control', 'no-store')
})
