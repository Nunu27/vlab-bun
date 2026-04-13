# syntax=docker/dockerfile:1.7-labs

# --- Base ---
FROM oven/bun:1 AS base
WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# --- Dependencies ---
FROM base AS deps
COPY --parents package.json bun.lock tsconfig.json apps/*/package.json packages/*/*/package.json ./
RUN SKIP_INSTALL_SIMPLE_GIT_HOOKS=true bun install --frozen-lockfile

# --- API Builder ---
FROM deps AS api-builder
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN cd apps/api && bun run build

# --- Web Builder ---
FROM deps AS web-builder
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
RUN cd apps/web && bun run build

# --- Runner ---
FROM gcr.io/distroless/cc
WORKDIR /app
ENV NODE_ENV=production

COPY --from=api-builder /app/out/app /app/app
COPY --from=api-builder /app/out/migrations /app/migrations
COPY --from=web-builder /app/out/public /app/public

ENTRYPOINT ["/app/app"]
