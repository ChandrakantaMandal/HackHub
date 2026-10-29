# syntax=docker/dockerfile:1
# ============================================================
# chat-service — multi-stage build (monorepo: pnpm + tsx runtime)
# Stage 1: base   → node + pnpm toolchain
# Stage 2: deps   → workspace dependencies (cached on lockfile)
# Stage 3: build  → full source + `prisma generate` (needs env)
# Stage 4: runner → lean runtime image, runs via tsx
# ============================================================

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/usr/local
RUN npm i -g pnpm@10.33.4
WORKDIR /app

# ---- Stage 2: dependencies ----
FROM base AS deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy only manifests first so this layer is cached on lockfile changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/admin/package.json apps/admin/package.json
COPY apps/admin-service/package.json apps/admin-service/package.json
COPY apps/api-gateway/package.json apps/api-gateway/package.json
COPY apps/auth-service/package.json apps/auth-service/package.json
COPY apps/chat-service/package.json apps/chat-service/package.json
COPY apps/judge/package.json apps/judge/package.json
COPY apps/judge-service/package.json apps/judge-service/package.json
COPY apps/project-service/package.json apps/project-service/package.json
COPY apps/showcase-service/package.json apps/showcase-service/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/error-handler/package.json packages/error-handler/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/imagekit/package.json packages/imagekit/package.json
COPY packages/logger/package.json packages/logger/package.json
COPY packages/redis/package.json packages/redis/package.json
COPY packages/telemetry/package.json packages/telemetry/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/utils/package.json packages/utils/package.json

# husky's prepare script needs .git, which is not in the build context
RUN pnpm pkg delete scripts.prepare \
    && pnpm install --frozen-lockfile

# ---- Stage 3: build (source + prisma generate) ----
FROM deps AS build
COPY . .

# prisma.config.ts validates the full env schema at import time,
# so placeholder values are required just to run `prisma generate`.
ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/hackhub \
    ACCESS_SECRET=build-time-placeholder \
    REFRESH_SECRET=build-time-placeholder \
    REDIS_URL=redis://redis:6379 \
    GMAIL_USER=build@example.com \
    GMAIL_APP_PASSWORD=build-time-placeholder
RUN pnpm --filter @workspace/database db:generate

# ---- Stage 4: runtime ----
FROM base AS runner
# openssl: Prisma probes the OpenSSL CLI to pick its engine; bookworm-slim only
# ships libssl3, so without this you get "prisma:warn ... failed to detect the
# libssl/openssl version ... Defaulting to openssl-1.1.x".
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://lgtm:4318

COPY --from=build --chown=node:node /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/
COPY --from=build --chown=node:node /app/node_modules /app/node_modules
COPY --from=build --chown=node:node /app/apps/chat-service /app/apps/chat-service
COPY --from=build --chown=node:node /app/packages /app/packages

USER node
EXPOSE 5005
CMD ["pnpm", "--filter", "chat-service", "start"]
