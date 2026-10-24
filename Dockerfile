FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN node -e "const fs = require('node:fs'); const path = require('node:path'); const journal = JSON.parse(fs.readFileSync('drizzle/meta/_journal.json', 'utf8')); const required = '0015_order_completed_status'; if (!journal.entries.some(entry => entry.tag === required) || !fs.existsSync(path.join('drizzle', required + '.sql'))) { throw new Error('Migration obrigatória ausente no contexto da imagem: ' + required); } const latest = journal.entries.at(-1); if (!latest || !fs.existsSync(path.join('drizzle', latest.tag + '.sql'))) { throw new Error('A última migration do journal não está presente no contexto da imagem'); }"
RUN pnpm build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/.output ./.output
COPY --from=build --chown=node:node /app/drizzle ./drizzle
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
