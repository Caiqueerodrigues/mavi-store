import type { H3Event } from 'h3'

const buckets = new Map<string, { count: number, resetAt: number }>()
const maxBuckets = 10_000

export function assertRateLimit(event: H3Event, scope: string, identity: string, limit: number, windowMs: number) {
  const now = Date.now()
  if (buckets.size >= maxBuckets) {
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key)
  }
  const key = `${scope}:${identity}`
  if (buckets.size >= maxBuckets && !buckets.has(key))
    throw createApiError({ statusCode: 429, message: 'Muitas solicitações. Tente novamente mais tarde.' })

  let bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs }
    buckets.set(key, bucket)
  }
  const remaining = Math.max(0, limit - bucket.count - 1)
  setResponseHeader(event, 'x-ratelimit-limit', String(limit))
  setResponseHeader(event, 'x-ratelimit-remaining', String(remaining))
  setResponseHeader(event, 'x-ratelimit-reset', String(Math.ceil(bucket.resetAt / 1000)))
  if (bucket.count >= limit) {
    setResponseHeader(event, 'retry-after', Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)))
    throw createApiError({ statusCode: 429, message: 'Muitas solicitações. Tente novamente mais tarde.' })
  }
  bucket.count++
}
