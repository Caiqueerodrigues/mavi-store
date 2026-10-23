export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', async (error: any, context: any) => {
    const event = context?.event
    if (!event || !event.path?.startsWith('/api/')) return
    const requestLog = (event.context as any).requestLog
    const databaseMessages: Record<string, string> = {
      '23505': 'Já existe um registro com esses dados.',
      '23503': 'O registro está relacionado a outros dados e não pode ser alterado dessa forma.',
      '23502': 'Um campo obrigatório não foi informado.',
      '22P02': 'Um dos valores informados é inválido.',
    }
    if (databaseMessages[error?.code]) {
      error.statusCode = error.code === '23505' ? 409 : 422
      error.message = databaseMessages[error.code]
    } else if (!error.statusCode || error.statusCode >= 500) {
      error.statusCode = 500
      error.message = 'Não foi possível concluir a solicitação. Tente novamente ou procure um administrador.'
    }
    const statusCode = Number(error.statusCode || 500)
    const user = (event.context as any).user
    process.stderr.write(`${JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      event: 'http_error',
      requestId: requestLog?.requestId || null,
      method: event.method,
      path: getRequestURL(event).pathname,
      status: statusCode,
      code: error.code || null,
      message: String(error.message || error.statusMessage || 'Erro desconhecido').slice(0, 2000),
      userId: user?.id || null,
      role: user?.role || null,
      stack: statusCode >= 500 ? String(error.stack || '').slice(0, 16_000) : undefined,
    })}\n`)
    try {
      await audit(event, 'REQUEST_ERROR', 'request', undefined, {
        method: event.method,
        path: event.path,
        statusCode: error.statusCode,
        message: String(error.message || error.statusMessage || '').slice(0, 2000),
        code: error.code,
        data: error.data,
        stack: error.statusCode >= 500 ? String(error.stack || '').slice(0, 16_000) : undefined,
      })
    } catch (auditError) {
      console.error('Falha ao registrar erro na auditoria', auditError)
    }
  })
})
