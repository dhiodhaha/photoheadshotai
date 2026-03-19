# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product

**Professional AI Headshot Studio** — Users upload casual photos, the AI transforms them into professional studio headshots. Key features: OAuth auth, credit system, studio upload + generation, before/after comparison, history vault.

## Commands

```bash
pnpm dev          # Start dev server on port 3000
pnpm build        # Production build
pnpm test         # Run tests with Vitest
pnpm lint         # Biome linter
pnpm format       # Biome formatter

# Database
pnpm db:migrate   # Run Prisma migrations
pnpm db:seed      # Seed database
pnpm db:studio    # Open Prisma Studio
pnpm db:generate  # Regenerate Prisma client

# Docker
docker-compose -f docker-compose.dev.yml up -d   # Start PostgreSQL

# Add shadcn components
pnpm dlx shadcn@latest add <component>
```

## Architecture

**TanStack Start** — SSR React framework with file-based routing. Routes live in `src/routes/`, the generated route tree is at `src/routeTree.gen.ts` (never edit manually).

**Routing**: File-based via TanStack Router. `__root.tsx` is the root layout. API routes use `src/routes/api/` — named files for specific endpoints (e.g. `upload.ts`), `$` catch-all for delegated handlers (e.g. auth).

**Data fetching**: TanStack Query for server state. QueryClient in `src/integrations/tanstack-query/root-provider.tsx`.

**Database**: PostgreSQL via Prisma + `@prisma/adapter-pg`. Client singleton at `src/lib/prisma.ts`. Schema at `prisma/schema.prisma`, generated to `src/generated/prisma/`.

**Auth**: Better Auth with Prisma adapter. Server config: `src/lib/auth.ts`, client: `src/lib/auth-client.ts`. API at `/api/auth/*`.

**Storage**: Cloudflare R2 via AWS S3 SDK. Config in `src/modules/studio/infrastructure/r2.client.ts`.

**UI**: shadcn in `src/components/ui/` (excluded from Biome). Use `cn()` from `src/lib/utils.ts`. Tailwind CSS v4.

## DDD Module Structure

Features live in `src/modules/<feature>/` following Domain-Driven Design:

```
src/modules/<feature>/
├── domain/           # Entities, value objects (pure types, no deps)
├── application/      # Services + Zod schemas (orchestrates domain + infra)
├── infrastructure/   # DB (Prisma), external APIs, server-only code
└── index.ts          # Public barrel — only export what consumers need
```

### Auth Module (`src/modules/auth/`)

```
auth/
├── domain/
│   ├── user.entity.ts
│   └── session.entity.ts
├── application/
│   ├── auth.schema.ts       # signUpSchema, signInSchema (Zod)
│   └── auth.service.ts      # signUp, signIn, signOut, getSession (client)
├── infrastructure/
│   └── auth.server.ts       # getServerSession(request) — server-only
└── index.ts
```

### Studio Module (`src/modules/studio/`)

Handles photo upload to R2 and (future) AI generation.

```
studio/
├── domain/
│   └── photo.entity.ts      # Photo type, PhotoStatus enum
├── application/
│   ├── upload.schema.ts     # uploadFileSchema (Zod) — 10MB, JPEG/PNG/WebP
│   └── upload.service.ts    # uploadPhoto, getUserPhotos, removePhoto
├── infrastructure/
│   ├── r2.client.ts         # S3Client for Cloudflare R2
│   ├── photo.storage.ts     # uploadToR2, deleteFromR2
│   └── photo.repository.ts  # Prisma Photo CRUD
└── index.ts
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/*` | — | Better Auth handler |
| GET | `/api/user/profile` | ✅ | User profile + credit balance |
| POST | `/api/studio/upload` | ✅ | Upload reference photo (`multipart/form-data`, field: `file`) → `{ file_url, image_id }` |
| POST | `/api/studio/generate` | ✅ | Start AI generation → `{ task_id, cost_credits }` |
| GET | `/api/studio/status/:taskId` | ✅ | Poll AI job status → `{ status, results }` |
| GET | `/api/history` | ✅ | Paginated headshot history |
| POST | `/api/credits/deduct` | ✅ | Internal credit deduction |

## Path Aliases

- `#/*` and `@/*` both resolve to `./src/*`
- `generated/*` resolves to `./src/generated/*`

## Code Style

Biome (tabs, double quotes). Excludes `src/components/ui/` and `*.gen.ts`. TypeScript strict mode. Always use Zod for input validation in application layer.

## Environment

- `.env.local` is the primary env file — loaded by all `pnpm db:*` scripts via `dotenv -e .env.local`
- Never run `pnpm prisma <cmd>` directly — use `pnpm db:<cmd>` or `dotenv -e .env.local -- prisma <cmd>`
- `DATABASE_URL` → local Docker PostgreSQL on port `5433`
- R2 vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
