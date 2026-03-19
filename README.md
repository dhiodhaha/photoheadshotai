# Professional AI Headshot Studio

Transform casual photos into professional studio-quality headshots using AI. Upload a selfie, select a style, and get a polished headshot ready for LinkedIn, CVs, or company websites.

## Tech Stack

- **Framework** — TanStack Start (SSR React)
- **Styling** — Tailwind CSS v4 + shadcn/ui
- **Auth** — Better Auth (email/password, OAuth)
- **Database** — PostgreSQL + Prisma ORM
- **Storage** — Cloudflare R2
- **Validation** — Zod

## Prerequisites

- Node.js 24+
- pnpm
- Docker (for local PostgreSQL)

## Local Development

**1. Start the database**

```bash
docker-compose -f docker-compose.dev.yml up -d
```

**2. Set up environment variables**

Copy `.env.local` and fill in your values:

```bash
# Database
DATABASE_URL="postgresql://photoheadshot:photoheadshot@localhost:5433/photoheadshotdb"

# Better Auth
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=   # generate with: pnpm dlx @better-auth/cli secret

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

**3. Install dependencies and run migrations**

```bash
pnpm install
pnpm db:migrate
pnpm db:generate
```

**4. Start the dev server**

```bash
pnpm dev
```

App runs at `http://localhost:3000`.

## Scripts

```bash
pnpm dev          # Dev server on port 3000
pnpm build        # Production build
pnpm test         # Run tests (Vitest)
pnpm lint         # Biome linter
pnpm format       # Biome formatter

pnpm db:migrate   # Run Prisma migrations
pnpm db:generate  # Regenerate Prisma client
pnpm db:studio    # Open Prisma Studio
pnpm db:seed      # Seed database
```

## Docker (Production)

```bash
docker build -t photoheadshot .
docker run -p 3000:3000 --env-file .env photoheadshot
```

The container automatically runs database migrations on startup.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/*` | — | Auth handler (sign-up, sign-in, sign-out) |
| GET | `/api/user/profile` | ✅ | User profile + credit balance |
| POST | `/api/studio/upload` | ✅ | Upload reference photo (`multipart/form-data`) |
| POST | `/api/studio/generate` | ✅ | Start AI generation job |
| GET | `/api/studio/status/:taskId` | ✅ | Poll AI job status |
| GET | `/api/history` | ✅ | Paginated headshot history |
| POST | `/api/credits/deduct` | ✅ | Deduct user credits |

## Project Structure

```
src/
├── modules/              # DDD feature modules
│   ├── auth/             # Auth domain (entities, service, server session)
│   └── studio/           # Studio domain (photo upload, generation)
├── routes/               # File-based routes (pages + API)
│   └── api/              # API route handlers
├── components/ui/        # shadcn components
├── lib/                  # Shared singletons (auth, prisma)
└── generated/prisma/     # Auto-generated Prisma client (do not edit)

prisma/
└── schema.prisma         # Database schema (source of truth)
```

## Database Schema

| Table | Description |
|-------|-------------|
| `users` | User accounts with credit balance |
| `sessions` | Auth sessions (Better Auth) |
| `accounts` | OAuth provider accounts (Better Auth) |
| `verifications` | Email verification tokens (Better Auth) |
| `photos` | Uploaded reference photos (R2) |
| `generation_jobs` | AI generation jobs with style + status |
| `generated_headshots` | AI result images per job |
| `credit_transactions` | Full audit log of credit top-ups and deductions |
