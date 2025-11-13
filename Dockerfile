# syntax=docker/dockerfile:1.4

# Base stage with common dependencies
FROM node:20-slim AS base

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        unzip \
        netcat-traditional && \
    rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun

# Dependencies stage
FROM base AS deps

COPY package.json bun.lock ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# Frontend builder
FROM base AS frontend-builder

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY frontend ./frontend
COPY backend ./backend

RUN cd frontend && npx --yes rsbuild build

# Backend builder
FROM base AS backend-builder

COPY --from=deps /app/node_modules ./node_modules
COPY backend ./backend

RUN cd backend && \
    bun build src/index.ts \
      --compile \
      --minify \
      --sourcemap \
      --target=bun \
      --outfile ../vlab && \
    mkdir -p ../build && \
    mv ../vlab ../build/ && \
    cp -r migrations ../build/

# Final production image
FROM gcr.io/distroless/base-debian12:nonroot

WORKDIR /app

COPY --from=base /bin/nc.traditional /usr/bin/nc
COPY --from=backend-builder /app/build/vlab /app/
COPY --from=backend-builder /app/build/migrations /app/migrations
COPY --from=frontend-builder /app/build/public /app/public

EXPOSE 3000

CMD ["/app/vlab"]
