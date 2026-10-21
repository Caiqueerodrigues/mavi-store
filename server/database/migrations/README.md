# Database migrations

Todas as alterações de schema e dados de referência devem ser feitas por migrations do Drizzle, armazenadas em `drizzle/`.

Comandos:

- `npm run db:generate`: gera uma nova migration a partir de `server/database/schema.ts`.
- `npm run db:migrate`: aplica as migrations pendentes.

Nunca altere uma migration que já tenha sido aplicada em ambientes compartilhados. Atualize o schema do Drizzle, gere uma nova migration e revise o SQL antes de aplicá-la.

O usuário administrador é criado no primeiro startup com senha temporária e troca obrigatória.
