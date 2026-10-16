FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN corepack enable && pnpm install --no-frozen-lockfile

FROM dependencies AS build
COPY . .
RUN pnpm build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
COPY --from=build /app/drizzle ./drizzle
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
