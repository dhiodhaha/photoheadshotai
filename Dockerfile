# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:24-alpine AS deps

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN pnpm install --frozen-lockfile


# ─── Stage 2: build ───────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN NODE_OPTIONS="--max-old-space-size=4096" node_modules/.bin/vite build


# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:24-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
