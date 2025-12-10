# syntax=docker/dockerfile:1.7

############################
# Base build image
############################
FROM oven/bun:slim AS build-base

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends netcat-traditional && \
    rm -rf /var/lib/apt/lists/*

############################
# Dependencies
############################
FROM build-base AS deps

COPY bun.lock* package.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/backend/package.json ./apps/backend/
COPY packages/evaluator/package.json ./packages/evaluator/
COPY packages/shared/package.json ./packages/shared/

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

############################
# Frontend build
############################
FROM build-base AS frontend-builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY package.json bun.lock* ./
copy apps/backend ./apps/backend
COPY apps/frontend ./apps/frontend
COPY packages/shared ./packages/shared

RUN bun frontend build

############################
# Backend build
############################
FROM build-base AS backend-builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY package.json bun.lock* ./
COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared

RUN bun backend build

############################
# Runtime image
############################
FROM gcr.io/distroless/cc:nonroot AS runtime

WORKDIR /app

COPY --from=build-base /bin/nc.traditional /usr/bin/nc
COPY --from=backend-builder /app/build/ .
COPY --from=frontend-builder /app/build/ .

EXPOSE 3000

ENTRYPOINT ["/app/vlab"]
