# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:24-slim AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN pnpm install --frozen-lockfile


# ─── Stage 2: build ───────────────────────────────────────────────────────────
FROM node:24-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm build


# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Install Prisma locally so prisma/config resolves correctly for migrations
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
