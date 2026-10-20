export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/icon'],
  css: ['~/assets/css/theme.css', '~/assets/css/main.css'],
  runtimeConfig: {
    databaseUrl: 'postgres://calcados:calcados@localhost:5432/calcados',
    databaseAdminUrl: '',
    jwtAccessSecret: 'development-access-secret-change-me-32chars',
    jwtRefreshSecret: 'development-refresh-secret-change-me-32chars',
    adminInitialPassword: '',
    cookieSecure: false,
    appTimeZone: 'America/Sao_Paulo'
  },
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Mavi - Gestão de Custos e Precificação de Calçados',
      link: [{ rel: 'icon', type: 'image/png', href: '/assets/logo-mavi.png' }],
      meta: [
        { name: 'description', content: 'Gestão de custos e precificação de calçados' },
        { name: 'theme-color', content: '#172a24' }
      ]
    }
  },
  nitro: { preset: 'node-server' }
})
