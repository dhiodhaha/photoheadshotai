# Implementation Plan

Refactoring and cleanup tasks for the photoheadshot codebase, organized by priority.

---

## Priority 1: DDD Module Extraction

### 1.1 Create `credits` module

The credit logic is scattered across API routes with inline Zod schemas and direct Prisma calls. Extract to a proper DDD module.

```
src/modules/credits/
├── application/
│   ├── credits.schema.ts    ← purchaseSchema, deductSchema (from routes)
│   └── credits.service.ts   ← deductCredits, purchaseCredits, refundCredits
├── domain/
│   └── transaction.entity.ts
├── infrastructure/
│   └── credit.repository.ts ← Prisma CRUD for CreditTransaction + User credits
└── index.ts
```

**Routes affected:**
- `src/routes/api/credits/purchase.ts` → thin handler, delegates to `credits.service`
- `src/routes/api/credits/deduct.ts` → thin handler, delegates to `credits.service`
- `src/modules/studio/application/generation.service.ts` → uses `credits.service` instead of direct Prisma

### 1.2 Extract gallery/history to studio services

| Route | Extract to |
|---|---|
| `src/routes/api/studio/gallery.ts` (GET) | `studio/application/gallery.service.ts` → `getHeadshotGallery()` |
| `src/routes/api/studio/gallery.ts` (POST) | `studio/application/gallery.service.ts` → `deleteHeadshot()` |
| `src/routes/api/history.ts` | `studio/application/history.service.ts` → `getGenerationHistory()` |

### 1.3 Clean up generation service

- Use `photo.repository.ts` instead of direct Prisma calls in `generation.service.ts`
- Export `generationService` via studio `index.ts` barrel
- Add `generation.schema.ts` for input validation

### 1.4 User profile

- `src/routes/api/user/profile.ts` has direct Prisma query — extract to auth module or create user module

---

## Priority 2: SRP Refactoring (Single Responsibility Principle)

### 2.1 `src/routes/studio.tsx` (240 lines) — HIGH

`StudioLayout` handles sidebar state, navigation, auth sign-out, credits badge, dropdown menu, and mobile backdrop all in one component.

**Split into:**
- `src/modules/studio/components/studio-sidebar.tsx` — sidebar nav items + mobile backdrop
- `src/modules/studio/components/studio-header.tsx` — top bar with credits badge
- `src/modules/studio/components/user-dropdown-menu.tsx` — user avatar + dropdown
- `src/routes/studio.tsx` — layout shell, composes the above

### 2.2 `src/routes/auth/signin.tsx` (209 lines) + `signup.tsx` (222 lines) — HIGH

Both pages are nearly identical (copy-paste). Each handles form state, API calls, toast, navigation, left panel image, AND form rendering.

**Split into:**
- `src/modules/auth/components/auth-left-panel.tsx` — shared cinematic image + quote + back button
- `src/modules/auth/components/sign-in-form.tsx` — email/password form + submission logic
- `src/modules/auth/components/sign-up-form.tsx` — name/email/password form + submission logic
- `src/routes/auth/signin.tsx` — composes `AuthLeftPanel` + `SignInForm`
- `src/routes/auth/signup.tsx` — composes `AuthLeftPanel` + `SignUpForm`

### 2.3 `src/modules/studio/application/generation.service.ts` (181 lines) — HIGH

Multiple concerns: validation, credits, prompt engineering, mock/real AI paths, error recovery.

**Split into:**
- Extract prompt string to `src/modules/studio/domain/prompts.ts` as a constant or builder
- Extract mock generation logic to a separate branch (or environment-aware adapter)
- Keep `GenerationService` as orchestrator, delegate credit operations to `credits.service` (from Priority 1.1)

### 2.4 `src/routes/index.tsx` (227 lines) — MEDIUM

Landing page with header, hero section, and experience grid all in one component.

**Split into:**
- `src/components/landing/hero-section.tsx`
- `src/components/landing/experience-grid.tsx`
- `src/components/landing/process-step.tsx` (already a sub-component, just extract to file)
- `src/routes/index.tsx` — composes the above

### 2.5 `src/routes/api/studio/gallery.ts` — MEDIUM

Mixed GET (fetch headshots) and POST (soft delete) in same handler with direct Prisma calls.

**Fix:** Move business logic to `gallery.service.ts` (from Priority 1.2). Route becomes a thin HTTP adapter.

---

## Priority 3: Type Safety

### 3.1 Use Prisma enums instead of string literals

After running `pnpm db:generate`, replace raw strings with generated enum imports:

```typescript
// Before
transactionType: "generation_deduction"

// After
import { TransactionType } from "generated/prisma/enums";
transactionType: TransactionType.generation_deduction
```

**Files affected:**
- `src/modules/studio/application/generation.service.ts`
- `src/routes/api/credits/purchase.ts`
- `src/routes/api/credits/deduct.ts`

### 3.2 Fix `as any` on Better Auth session

`src/routes/studio.tsx:178` casts `user as any` to access `currentCredits`. Fix by extending Better Auth's session type to include the custom field.

### 3.3 `@tanstack/ai-fal` types

`src/modules/studio/application/generation.service.ts:84,95` has `as any` casts for the AI adapter. Remove when `@tanstack/ai-fal` ships stable types (marked with TODO).

---

## Priority 4: Auth Guard DRY

Every API route repeats:

```typescript
const session = await getServerSession(request);
if (!session || !session.user) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Fix:** Extract to `src/modules/auth/infrastructure/require-auth.ts`:

```typescript
export async function requireAuth(request: Request) {
  const session = await getServerSession(request);
  if (!session || !session.user) {
    throw new AuthError("Unauthorized");
  }
  return session;
}
```

**Routes affected:** All 8+ API routes in `src/routes/api/`

---

## Completed

- [x] Prisma enums added to schema (`PhotoStatus`, `GenerationJobStatus`, `TransactionType`)
- [x] Fixed `status: "active"` → `"completed"` in generation service
- [x] Fixed all UPPERCASE status/transaction values → lowercase
- [x] Renamed `mode-toogle.tsx` → `mode-toggle.tsx`
- [x] Fixed race condition: manual subtraction → atomic `{ decrement }`
- [x] Merged credit deduction + job creation into single transaction
- [x] Parallel `Promise.all` for user/photo fetch
- [x] Extracted `GENERATION_CREDIT_COST` constant
- [x] All `error: any` → `error: unknown` with `instanceof Error` checks
- [x] Bounded `generatedHeadshots` query with `take: 1`
- [x] Fixed `auth.server.ts` indentation (spaces → tabs)
- [x] Created `credits` module (domain, application, infrastructure, barrel)
- [x] Refactored `purchase.ts` and `deduct.ts` to use `credits` module
- [x] Extracted `gallery.service.ts` and `history.service.ts` from routes
- [x] Refactored `generation.service.ts` to use `credits` module (deduct/refund)
- [x] Extracted prompt template to `HEADSHOT_PROMPT_TEMPLATE` constant
- [x] Updated studio `index.ts` barrel with all exports
- [x] Split `studio.tsx` → `StudioSidebar`, `StudioHeader`, `UserDropdownMenu`
- [x] Split `signin.tsx` / `signup.tsx` → `AuthLeftPanel`, `SignInForm`, `SignUpForm`
- [x] Updated auth `index.ts` barrel with component exports
