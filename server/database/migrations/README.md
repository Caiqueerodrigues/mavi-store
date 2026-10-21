# Database migrations

Todas as alterações de schema e dados de referência devem ser feitas por migrations do Drizzle, armazenadas em `drizzle/`.

Comandos:

- `npm run db:generate`: gera uma nova migration a partir de `server/database/schema.ts`.
- `pnpm db:migrate`: inicializa o schema necessário e aplica as migrations pendentes. O workflow de deploy executa esse comando antes de trocar a aplicação em produção.

Nunca altere uma migration que já tenha sido aplicada em ambientes compartilhados. Atualize o schema do Drizzle, gere uma nova migration e revise o SQL antes de aplicá-la.

O usuário administrador é criado no primeiro startup com senha temporária e troca obrigatória.
