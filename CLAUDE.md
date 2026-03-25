# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product

**Professional AI Headshot Studio** — Users upload casual photos, the AI transforms them into professional studio headshots. Key features: OAuth auth, credit system, referral system, studio upload + generation, before/after comparison, history vault.

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

**TanStack Start** — SSR React framework with file-based routing. Uses Nitro (`nitro/vite` plugin) as the server runtime — this is intentional and recommended by TanStack. Routes live in `src/routes/`, the generated route tree is at `src/routeTree.gen.ts` (never edit manually).

**Routing**: File-based via TanStack Router. `__root.tsx` is the root layout. API routes use `src/routes/api/` — named files for specific endpoints (e.g. `upload.ts`), `$` catch-all for delegated handlers (e.g. auth). `defaultNotFoundComponent` is set at the router level in `src/router.tsx` — do not add `notFoundComponent` per-route.

**Data fetching**: TanStack Query for server state. QueryClient in `src/integrations/tanstack-query/root-provider.tsx`.

**Database**: PostgreSQL via Prisma + `@prisma/adapter-pg`. Client singleton at `src/lib/prisma.ts`. Schema at `prisma/schema.prisma`, generated to `src/generated/prisma/`. Pool `max: 5` (tuned for 2vCPU VPS).

**Auth**: Better Auth with Prisma adapter. Server config: `src/lib/auth.ts`, client: `src/lib/auth-client.ts`. API at `/api/auth/*`.

**Storage**: Cloudflare R2 via AWS S3 SDK. Config in `src/modules/studio/infrastructure/r2.server.ts`.

**UI**: shadcn in `src/components/ui/` (excluded from Biome). Use `cn()` from `src/lib/utils.ts`. Tailwind CSS v4.

## DDD Module Structure

Features live in `src/modules/<feature>/` following Domain-Driven Design:

```
src/modules/<feature>/
├── domain/           # Entities, value objects (pure types, no deps)
├── application/      # Services + Zod schemas (orchestrates domain + infra)
├── infrastructure/   # DB (Prisma), external APIs, server-only code
├── components/       # Feature-specific React components (optional)
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
├── components/
│   ├── auth-left-panel.tsx   # Shared cinematic left panel for auth pages
│   ├── sign-in-form.tsx      # Sign-in form with submission logic
│   └── sign-up-form.tsx      # Sign-up form with submission logic
├── infrastructure/
│   ├── auth.server.ts        # getServerSession(request) — server-only
│   └── auth.functions.ts     # getSessionFn — TanStack server function
└── index.ts
```

### Studio Module (`src/modules/studio/`)

Handles photo upload to R2, AI generation, gallery, and history.

```
studio/
├── domain/
│   └── photo.entity.ts        # Photo type, PhotoStatus enum
├── application/
│   ├── upload.schema.ts       # uploadFileSchema (Zod) — 10MB, JPEG/PNG/WebP
│   ├── upload.service.ts      # uploadPhoto, getUserPhotos, removePhoto
│   ├── generation.service.ts  # GenerationService class (AI headshot generation)
│   ├── gallery.service.ts     # getHeadshotGallery, deleteHeadshot
│   └── history.service.ts     # getGenerationHistory (paginated)
├── components/
│   ├── studio-sidebar.tsx     # Navigation sidebar with mobile support
│   ├── studio-header.tsx      # Top bar with credits badge
│   └── user-dropdown-menu.tsx # User avatar dropdown (settings, sign out)
├── infrastructure/
│   ├── r2.server.ts           # S3Client for Cloudflare R2
│   ├── photo.storage.ts       # uploadToR2, deleteFromR2
│   └── photo.repository.ts   # Prisma Photo CRUD
└── index.ts
```

### Credits Module (`src/modules/credits/`)

Handles credit balance, purchases, deductions, and refunds.

```
credits/
├── domain/
│   └── transaction.entity.ts  # TransactionType, CreditTransaction
├── application/
│   ├── credits.schema.ts      # purchaseSchema, deductSchema (Zod)
│   └── credits.service.ts     # purchaseCredits, deductUserCredits, refundCredits
├── infrastructure/
│   └── credit.repository.ts   # Prisma CRUD for credits + transactions
└── index.ts
```

### Referral Module (`src/modules/referral/`)

Handles bootstrap codes, user referral codes, and credit rewards.

```
referral/
├── domain/
│   └── referral.entity.ts     # BootstrapCode, ReferralReward types
├── application/
│   ├── referral.schema.ts     # referralCodeSchema (Zod)
│   └── referral.service.ts    # validateReferralCode, processSignupCode, rewardReferrerOnVerification
├── infrastructure/
│   └── referral.repository.ts # Prisma CRUD — atomic redeemBootstrapCode, awardReferralCredits
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
| GET | `/api/studio/gallery` | ✅ | All completed headshots |
| POST | `/api/studio/gallery` | ✅ | Soft-delete a headshot |
| GET | `/api/history` | ✅ | Paginated headshot history |
| POST | `/api/credits/purchase` | ✅ | Purchase credits |
| POST | `/api/credits/deduct` | ✅ | Deduct credits |

## Path Aliases

- `#/*` and `@/*` both resolve to `./src/*`
- `generated/*` resolves to `./src/generated/*`

## Code Rules

### Style
- Biome (tabs, double quotes). Excludes `src/components/ui/` and `*.gen.ts`.
- TypeScript strict mode. Never use `any` — use `unknown` with `instanceof` checks.
- Named exports only — no `export default`.
- File names: `kebab-case.ts` for all files.

### DDD Discipline
- **Routes are thin HTTP adapters.** No Prisma calls, no Zod schemas, no business logic in route files. Routes import from modules only.
- **Zod schemas live in `application/` layer** (e.g. `credits.schema.ts`), never inline in routes.
- **Services orchestrate**, repositories handle DB. Services should not call `prisma` directly — use repository functions.
- **Barrel exports (`index.ts`)** are the public API. Import from `#/modules/<feature>`, not internal paths (exception: components and infrastructure used only by routes).
- **Domain layer is pure** — no imports from infrastructure or application.

### SRP (Single Responsibility)
- Route components should compose extracted components, not contain 200+ lines of JSX.
- Split large components into: container (state/logic) + presentational (rendering).
- Extract shared UI patterns (e.g. `AuthLeftPanel`) into module `components/` folder.
- Event handlers: `handle<Event>` internally, `on<Event>` for props.
- Use `React.SubmitEvent<HTMLFormElement>` for form submit handlers — `React.FormEvent` is deprecated since React 19.

### Prisma
- Schema uses enums (`PhotoStatus`, `GenerationJobStatus`, `TransactionType`) — not raw strings. Import from `#/generated/prisma/enums.js`.
- All fields use `@map("snake_case")`, tables use `@@map("plural_snake")`.
- Every foreign key has `@@index`. Never add `@@index` on a field that is already `@unique`.
- Use atomic operations (`{ increment }`, `{ decrement }`) — never read-then-write for counters.
- Use `$transaction` for related writes that must succeed together.
- Credit deduction is atomic (check + deduct inside single transaction) — prevents TOCTOU race.
- Use `Promise.all` for independent reads.

### Auth (Better Auth)
- `referralCode` additionalField: the `before` hook replaces the entered value with a generated unique code. The entered code is bridged to `after` via `_pendingRedemptions` Map in `src/lib/auth.ts`.
- Never set `defaultValue: ""` on a field with `@unique` in the schema — Better Auth will explicitly send the empty string, violating the constraint for the 2nd user.
- Studio routes use `beforeLoad: getSessionFn()` for auth guard. Child components should use `useRouteContext({ from: '/studio' })` for session — not `authClient.useSession()` (except when `refetch` is needed after mutations).
- Hooks must be called at the top of the component function — never inline in JSX.

### Error Handling
- Catch blocks: `catch (error: unknown)` with `error instanceof Error ? error.message : "fallback"`.
- Services throw typed errors; routes catch and return appropriate HTTP status codes.

## Infrastructure

### VPS (Jetorbit)
- **Specs:** 2vCPU, 4GB RAM, 80GB SSD
- **Stack:** Docker Compose + Nginx reverse proxy + Cloudflare proxy
- **Domain:** standoutheadshot.com
- **Nginx config:** `nginx/photoheadshot.conf` — deployed via CI/CD on every push to `main`
- **SSL:** Cloudflare Origin Certificate at `/etc/ssl/cloudflare/origin.pem`
- **Cloudflare SSL mode:** Full (not Flexible, not Full Strict)
- **Cache:** Nginx proxy cache at `/var/cache/nginx` — check with `X-Cache-Status` response header

### Docker
- Production compose: `docker-compose.prod.yml`
- App resource limits: 1.5 CPU, 1536MB memory
- `UV_THREADPOOL_SIZE=4` set in container env
- Migrations run automatically on container start via `docker-entrypoint.sh` using `node_modules/.bin/prisma migrate deploy`
- `node_modules` copied from `deps` stage into runner so `prisma/config` resolves correctly

### CI/CD (GitHub Actions)
- Deploy workflow: `.github/workflows/deploy.yml`
- Triggers on push to `main` only
- Steps: build + push to GHCR → copy nginx config via scp → deploy on VPS via Tailscale SSH
- `pnpm` is NOT available in the production container — never add `docker exec ... pnpm` to deploy scripts

### Nginx
- Config lives at `nginx/photoheadshot.conf` in repo — CI/CD copies to `/etc/nginx/sites-enabled/standoutheadshot.conf`
- Static assets served directly by Nginx (bypasses Node)
- `/studio`, `/api`, `/auth` routes: `Cache-Control: private, no-store`
- `/` and public routes: Nginx proxy cache, 10 min TTL

## Environment

- `.env.local` is the primary env file — loaded by all `pnpm db:*` scripts via `dotenv -e .env.local`
- Never run `pnpm prisma <cmd>` directly — use `pnpm db:<cmd>` or `dotenv -e .env.local -- prisma <cmd>`
- `DATABASE_URL` → local Docker PostgreSQL on port `5433`
- R2 vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- FAL.AI vars: `FAL_KEY` (API key), `MOCK_AI_GENERATION` (true for dev, false for production)
- See `.env.example` for complete documentation

## AI Generation (Seedream v4.5)

**Model:** `fal-ai/bytedance/seedream/v4.5/edit`
**Cost:** $0.04/image
**Location:** `src/modules/studio/application/generation.service.ts`

**API Contract:**
```typescript
const result = await fal.subscribe(SEEDREAM_MODEL, {
  input: {
    prompt: string,
    image_urls: string[],
    image_size: { width: number, height: number }, // 1024x1024
    num_images: 1,
    enable_safety_checker: true,
  },
});

result.data?.images?.[0]?.url  // Generated image URL
```

**Prompts:** Stored in `src/modules/studio/domain/styles.ts` as `HEADSHOT_STYLES` array. Each style has `id`, `label`, `prompt`. Single source of truth — frontend imports directly from domain.

## Status

**Current state:** Production deployed at standoutheadshot.com
**Infrastructure:** Live on Jetorbit VPS behind Cloudflare

**Post-MVP improvements:**
- Async job queue (Bull) for long-running generations
- Webhook support for fal.ai completion notifications
- Generation retry logic with exponential backoff
- Preview deployments per branch
- Error tracking (Sentry)
