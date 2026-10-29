# syntax=docker/dockerfile:1
# ============================================================
# api-gateway — multi-stage build (monorepo: pnpm + tsx runtime)
# Stage 1: base   → node + pnpm toolchain
# Stage 2: deps   → workspace dependencies (cached on lockfile)
# Stage 3: build  → full source (typechecked by tsx at runtime)
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
# Workspace packages are consumed as TS source (main: ./src/index.ts);
# there is no compile step — tsx runs the TypeScript directly at runtime.

# ---- Stage 4: runtime ----
FROM base AS runner
ENV NODE_ENV=production
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://lgtm:4318

COPY --from=build --chown=node:node /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/
COPY --from=build --chown=node:node /app/node_modules /app/node_modules
COPY --from=build --chown=node:node /app/apps/api-gateway /app/apps/api-gateway
COPY --from=build --chown=node:node /app/packages /app/packages

USER node
EXPOSE 8080
CMD ["pnpm", "--filter", "api-gateway", "start"]
