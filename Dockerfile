# syntax=docker/dockerfile:1.7-labs

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

COPY --parents **/package.json **/bun.lock* ./

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

############################
# Frontend build
############################
FROM build-base AS frontend-builder

COPY --from=deps /app ./
COPY . .

RUN bun frontend build

############################
# Backend build
############################
FROM build-base AS backend-builder

COPY --from=deps /app ./
COPY --parents apps/backend packages/shared packages/monitor ./

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