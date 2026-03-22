# Fix: Photo Generation "Invalid Entity" Error

## Root Cause

The generation flow had multiple status value mismatches that caused database-level validation failures:

1. **`generation.service.ts:123`** — Set photo status to `"active"`, which is NOT a valid `PhotoStatus` value (fixed: now `"completed"`)
2. **`generation.service.ts:46,119,143`** — Used UPPERCASE statuses (`"PROCESSING"`, `"COMPLETED"`, `"FAILED"`) for GenerationJob, but Prisma default was lowercase `"pending"` (fixed: now all lowercase)
3. **`generation.service.ts:36`, `purchase.ts:37`, `deduct.ts:45`, `seed.ts`** — Used UPPERCASE transaction types (`"PURCHASE"`, `"GENERATION_DEDUCTION"`, `"GENERATION_REFUND"`) (fixed: now lowercase matching enums)

These are now fixed by introducing Prisma enums (`PhotoStatus`, `GenerationJobStatus`, `TransactionType`) which enforce valid values at the database level.

## Architecture Decision

The current setup (TanStack Start API routes + in-process generation) is fine. The service already handles failures by refunding credits and marking jobs as failed. No need for Hono, job queues, or extra infrastructure right now. Revisit if timeout/reliability issues appear in production.

## Remaining Steps (requires `.env.local` with DATABASE_URL)

### Step 1: Generate a migration for the enum changes

```bash
dotenv -e .env.local -- pnpm prisma migrate dev --name add_enum_types
```

This will:
- Create PostgreSQL enum types
- ALTER columns from `text` → enum type
- Fail if existing data contains values not in the enum (e.g. `"PROCESSING"`, `"active"`)

### Step 2: Handle existing data (if migration fails)

If the migration fails due to existing rows with old UPPERCASE values, create a manual migration:

```bash
dotenv -e .env.local -- pnpm prisma migrate dev --create-only --name add_enum_types
```

Then edit the generated SQL file to add data migration BEFORE the ALTER:

```sql
-- Normalize existing data before enum conversion
UPDATE photos SET status = LOWER(status);
UPDATE generation_jobs SET status = LOWER(status);
UPDATE credit_transactions SET transaction_type = LOWER(transaction_type);

-- Fix the invalid "active" status
UPDATE photos SET status = 'completed' WHERE status = 'active';

-- Then the generated ALTER statements...
```

Then apply:

```bash
dotenv -e .env.local -- pnpm prisma migrate dev
```

### Step 3: Regenerate Prisma client

```bash
pnpm db:generate
```

### Step 4: Verify end-to-end

1. Start dev server: `pnpm dev`
2. Upload a photo via `/api/studio/upload`
3. Trigger generation via `/api/studio/generate`
4. Poll status via `/api/studio/status/:taskId`
5. Confirm photo status transitions: `pending` → `completed`
6. Confirm generation job status: `pending` → `processing` → `completed`
7. Confirm credits deducted with `transaction_type = 'generation_deduction'`

## Files Changed (already done)

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `PhotoStatus`, `GenerationJobStatus`, `TransactionType` enums; updated fields to use them |
| `src/modules/studio/application/generation.service.ts` | Fixed `"active"` → `"completed"`, all statuses to lowercase |
| `src/routes/api/credits/purchase.ts` | `"PURCHASE"` → `"purchase"` |
| `src/routes/api/credits/deduct.ts` | `"GENERATION_DEDUCTION"` → `"generation_deduction"` |
| `prisma/seed.ts` | All transaction types to lowercase |
| `src/components/mode-toogle.tsx` | Renamed to `mode-toggle.tsx` |

## Follow-up: DDD Refactoring

The following routes have business logic and Zod schemas inline instead of in proper DDD modules. Not blocking, but should be cleaned up for consistency with the existing auth/studio patterns.

### Priority 1: Create `credits` module

```
src/modules/credits/
├── application/
│   ├── credits.schema.ts    ← move purchaseSchema, deductSchema from routes
│   └── credits.service.ts   ← deductCredits, purchaseCredits, refundCredits
├── domain/
│   └── transaction.entity.ts
├── infrastructure/
│   └── credit.repository.ts ← Prisma CRUD for CreditTransaction + User credits
└── index.ts
```

**Routes affected:** `/api/credits/purchase`, `/api/credits/deduct`

### Priority 2: Extract gallery/history to studio services

| Route | Extract to |
|---|---|
| `/api/studio/gallery` (GET) | `studio/application/gallery.service.ts` → `getHeadshotGallery()` |
| `/api/studio/gallery` (POST) | `studio/application/gallery.service.ts` → `deleteHeadshot()` |
| `/api/history` | `studio/application/history.service.ts` → `getGenerationHistory()` |

### Priority 3: Clean up generation service

- Use `photo.repository.ts` instead of direct Prisma calls in `generation.service.ts`
- Export `generationService` via studio `index.ts` barrel
- Add `generation.schema.ts` for input validation

### Priority 4: User profile

- `/api/user/profile` has direct Prisma query — extract to auth module or create user module
