# Mavi

Sistema integrado de custos, pedidos, relatórios PDF, usuários e auditoria. O frontend Vue e as APIs Nitro do Nuxt rodam via Docker e usam um servidor PostgreSQL externo já existente.

## Executar

Configure no `.env` as conexões com o PostgreSQL existente:

```dotenv
NUXT_DATABASE_URL=postgres://usuario_app:senha@servidor:5432/calcados?sslmode=require
NUXT_DATABASE_ADMIN_URL=postgres://usuario_admin:senha@servidor:5432/postgres?sslmode=require
APP_ORIGIN=https://mavi.seu-dominio.com.br
COOKIE_SECURE=true
TRUST_PROXY=true
```

`NUXT_DATABASE_ADMIN_URL` deve apontar para um banco que já exista no mesmo servidor, normalmente `postgres`, usando uma role com permissão `CREATEDB`. `NUXT_DATABASE_URL` aponta para o banco exclusivo da aplicação.

`APP_ORIGIN` deve conter a origem HTTPS pública exata. Ative `TRUST_PROXY=true` somente quando todas as requisições chegarem por um proxy reverso confiável; isso permite usar `X-Forwarded-For` no controle de tentativas de login e na auditoria.

```bash
docker compose up --build
```

Acesse <http://localhost:3001>. O Compose sobe somente a aplicação; ele não cria outro container PostgreSQL. Na primeira execução, a aplicação cria o banco informado em `NUXT_DATABASE_URL`, caso necessário, e aplica as migrações e os dados iniciais.

Para usar outra porta HTTP, defina `APP_PORT` no `.env`.

## Deploy pelo Gitea Actions

O workflow `.gitea/workflows/deploy.yml` cria a imagem Docker e atualiza o
container em todo push para a branch `main`. O runner precisa estar instalado
na mesma maquina do deploy, com acesso aos comandos `docker`, `docker compose`
e `curl`.

Cadastre em **Settings > Actions > Secrets**:

- `NUXT_DATABASE_URL`: URL completa do banco PostgreSQL especifico da aplicacao;
- `NUXT_DATABASE_ADMIN_URL`: URL administrativa opcional, usada somente para
  criar o banco quando ele ainda nao existe;
- `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET`: chaves aleatorias distintas.

Cadastre em **Settings > Actions > Variables**:

- `APP_ORIGIN`: origem publica exata, por exemplo `https://mavi.exemplo.com`;
- `APP_PORT`: porta publicada no host (opcional, padrao `3001`);
- `COOKIE_SECURE` e `TRUST_PROXY` (opcionais, padrao `true` no CI).

A URL do banco e injetada somente quando o container inicia; ela nao e gravada
na imagem. Se o banco especifico ja existir e a role da aplicacao puder aplicar
as migracoes, `NUXT_DATABASE_ADMIN_URL` pode ficar vazio.

## Desenvolvimento local

```bash
corepack pnpm install
npm run dev
```

O Nuxt acessa o mesmo PostgreSQL externo configurado no `.env`.

## Primeiro acesso

- E-mail: `caiquerodriguesalmeida@gmail.com`
- Nome: `Caique Rodrigues Almeida`
- Senha temporária: `Teste@123`
- O sistema exige a troca da senha no primeiro login.

Em produção, substitua os segredos JWT, ative `COOKIE_SECURE=true`, exija TLS na conexão PostgreSQL e publique exclusivamente atrás de HTTPS. A conexão normal da aplicação deve usar uma role sem permissão para criar bancos.

## Segurança e permissões

Access token de 15 minutos e refresh token rotativo de 1 dia ficam em cookies `HttpOnly` e `SameSite=Strict`. Em respostas `401/403`, o cliente tenta uma única renovação e repete a chamada; se falhar, encerra a sessão local e volta ao login. Sessões são revogáveis, requisições mutáveis exigem CSRF, logins têm limitação de tentativas e as senhas usam bcrypt. Os perfis são Administrador, Gestor, Operador e Consulta.

## Dados migrados da planilha

O seed inclui modelos das abas `Tiras`, `Cabedal` e `Tenis`, com suas composições e custos. A planilha original é apenas consultada e nunca alterada.

O contrato da API está em `openapi.yaml`.
