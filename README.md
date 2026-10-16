# Mavi

Sistema integrado de custos, pedidos, relatórios PDF, usuários e auditoria, inspirado na planilha de controle existente. O frontend Vue, as APIs Nitro do Nuxt e o PostgreSQL podem rodar juntos via Docker ou com o Nuxt localmente.

## Executar

```bash
docker compose up --build
```

Acesse <http://localhost:3001>. O banco é criado e recebe dados iniciais automaticamente na primeira execução. Para usar outra porta, defina `APP_PORT` no arquivo `.env`.

## Desenvolvimento local

```bash
corepack pnpm install
docker compose up -d db
npm run dev
```

No desenvolvimento, somente o PostgreSQL roda em Docker na porta `5433`; o Nuxt roda localmente. Para parar o banco: `docker compose down`. O volume `postgres_data` preserva os dados.

## Primeiro acesso

- E-mail: `admin@mavicustos.local`
- Senha temporária: valor de `ADMIN_INITIAL_PASSWORD` no `.env`
- O sistema exige a troca da senha no primeiro login.

Em produção, substitua os segredos JWT, a senha do PostgreSQL e a senha inicial, ative `COOKIE_SECURE=true` e publique exclusivamente atrás de HTTPS.

## Segurança e permissões

Access token de 15 minutos e refresh token rotativo de 1 dia ficam em cookies `HttpOnly` e `SameSite=Strict`. Em respostas `401/403`, o cliente tenta uma única renovação e repete a chamada; se falhar, encerra a sessão local e volta ao login. Sessões são revogáveis, requisições mutáveis exigem CSRF, logins têm limitação de tentativas e as senhas usam bcrypt. Os perfis são Administrador, Gestor, Operador e Consulta.

## Dados migrados da planilha

O seed inclui modelos das abas `Tiras`, `Cabedal` e `Tenis`, com suas composições e custos. A planilha original é apenas consultada e nunca alterada.

O contrato da API está em `openapi.yaml`. A planilha original não é lida nem alterada pela aplicação.
