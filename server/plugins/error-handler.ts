export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', async (error: any, context: any) => {
    const event = context?.event
    if (!event || !event.path?.startsWith('/api/')) return
    const databaseMessages: Record<string, string> = {
      '23505': 'Já existe um registro com esses dados.',
      '23503': 'O registro está relacionado a outros dados e não pode ser alterado dessa forma.',
      '23502': 'Um campo obrigatório não foi informado.',
      '22P02': 'Um dos valores informados é inválido.',
    }
    if (databaseMessages[error?.code]) {
      error.statusCode = error.code === '23505' ? 409 : 422
      error.statusMessage = databaseMessages[error.code]
    } else if (!error.statusCode || error.statusCode >= 500) {
      error.statusCode = 500
      error.statusMessage = 'Não foi possível concluir a solicitação. Tente novamente ou procure um administrador.'
    }
    try {
      await audit(event, 'REQUEST_ERROR', 'request', undefined, {
        method: event.method,
        path: event.path,
        statusCode: error.statusCode,
        message: error.message,
        code: error.code,
        data: error.data,
        stack: error.statusCode >= 500 ? error.stack : undefined,
      })
    } catch (auditError) {
      console.error('Falha ao registrar erro na auditoria', auditError)
    }
  })
})
