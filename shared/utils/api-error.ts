import { createError, type H3Error } from 'h3'

type ApiErrorOptions = Omit<Partial<H3Error>, 'statusMessage'> & {
  statusCode: number
  message: string
  statusMessage?: never
}

export function createApiError(options: ApiErrorOptions): H3Error {
  return createError(options)
}