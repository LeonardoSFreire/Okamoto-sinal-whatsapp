FROM node:24-bookworm-slim AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm run build

FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

COPY --from=build /app /app

EXPOSE 8080

CMD ["sh", "-c", "pnpm --filter @workspace/scripts run migrate && pnpm start"]
