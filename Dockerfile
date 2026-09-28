# Production image (docs/DEPLOY.md). Targets:
#   app   – the Next.js standalone server (small, runs as the non-root "node" user)
#   tools – full dependencies + source: runs migrations and the admin CLI (pnpm admin:cli)

FROM node:22-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS tools
COPY . .
CMD ["pnpm", "db:migrate"]

FROM tools AS build
# Modules read these at import time; no connection is made during the build.
RUN DATABASE_URL=postgres://build:build@localhost:5432/build \
    BETTER_AUTH_SECRET=build-time-placeholder-not-used-at-runtime \
    pnpm build

FROM node:22-alpine AS app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 TZ=Europe/Istanbul
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/giris || exit 1
CMD ["node", "server.js"]
