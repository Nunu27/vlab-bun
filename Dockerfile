# syntax=docker/dockerfile:1.4

# Dependencies stage
FROM oven/bun:1 AS deps

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        python3 \
        libpq-dev \
        netcat-traditional && \
    rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

RUN bun install --frozen-lockfile

# Builder stage
FROM deps AS builder

WORKDIR /app

COPY package.json bun.lock ./
COPY frontend ./frontend
COPY backend ./backend

COPY --from=deps /app/node_modules ./node_modules

RUN bun run build

# App production image
FROM gcr.io/distroless/base AS app

WORKDIR /app

COPY --from=deps /bin/nc.traditional /usr/bin/nc
COPY --from=builder /app/build /app

EXPOSE 3000

CMD ["/app/vlab"]