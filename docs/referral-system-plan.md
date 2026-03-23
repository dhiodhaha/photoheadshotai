# Referral System Implementation Plan

## Overview

Invitation-only signup through referral codes. Users can only register with a valid referral code. Each user gets 1 referral code. Bootstrap codes (max 5 uses) for initial launch. Referrers earn 10 credits per successful signup.

---

## Flow

```
Founder → uses BOOTSTRAP-001 (max 5 uses) → signs up
  ↓
Gets referral code: user_abc123
  ↓
Shares: yourapp.com/signup?code=user_abc123
  ↓
Friend signs up with code → founder gets +10 credits
  ↓
Friend gets own code → can invite others
```

## Rules

- **Bootstrap codes:** Max 5 redemptions each (for initial launch)
- **User referral codes:** 1 code per user, unlimited redemptions
- **Credit reward:** Referrer gets +10 credits when referred user verifies email
- **1 email = 1 registration** (enforced by unique email constraint)
- **No code = no signup** (referral code is required)

---

## Phase 1: Database Schema

### New Models

**File:** `prisma/schema.prisma`

```prisma
model BootstrapCode {
  id          String    @id @default(cuid())
  code        String    @unique
  maxRedeems  Int       @default(5) @map("max_redeems")
  redeemCount Int       @default(0) @map("redeem_count")
  createdAt   DateTime  @default(now()) @map("created_at")

  redemptions BootstrapRedemption[]

  @@map("bootstrap_codes")
}

model BootstrapRedemption {
  id              String   @id @default(cuid())
  bootstrapCodeId String   @map("bootstrap_code_id")
  userId          String   @unique @map("user_id")
  redeemedAt      DateTime @default(now()) @map("redeemed_at")

  bootstrapCode BootstrapCode @relation(fields: [bootstrapCodeId], references: [id], onDelete: Cascade)

  @@index([bootstrapCodeId])
  @@map("bootstrap_redemptions")
}

model ReferralReward {
  id         String   @id @default(cuid())
  referrerId String   @map("referrer_id")
  newUserId  String   @unique @map("new_user_id")
  amount     Int      @default(10)
  rewardedAt DateTime @default(now()) @map("rewarded_at")

  @@index([referrerId])
  @@map("referral_rewards")
}
```

### User Model Changes

Add to existing `User` model:

```prisma
model User {
  // ... existing fields

  // Referral system
  referralCode String  @unique @default(cuid()) @map("referral_code")
  referredBy   String? @map("referred_by")

  // No self-relation needed — just store referrer ID for credit lookup
}
```

### Migration

```bash
pnpm db:migrate --name add_referral_system
```

---

## Phase 2: DDD Module Structure

### New Module: `src/modules/referral/`

```
src/modules/referral/
├── domain/
│   └── referral.entity.ts          # Types: BootstrapCode, ReferralReward
├── application/
│   ├── referral.schema.ts          # Zod: validateReferralCode schema
│   └── referral.service.ts         # validateCode, rewardReferrer
├── infrastructure/
│   └── referral.repository.ts      # Prisma CRUD for bootstrap + rewards
└── index.ts                        # Barrel exports
```

---

## Phase 3: Domain Layer

**File:** `src/modules/referral/domain/referral.entity.ts`

```typescript
export type BootstrapCode = {
  id: string;
  code: string;
  maxRedeems: number;
  redeemCount: number;
  createdAt: Date;
};

export type ReferralReward = {
  id: string;
  referrerId: string;
  newUserId: string;
  amount: number;
  rewardedAt: Date;
};

export const REFERRAL_CREDIT_REWARD = 10;
```

---

## Phase 4: Infrastructure Layer

**File:** `src/modules/referral/infrastructure/referral.repository.ts`

```typescript
import { prisma } from "#/lib/prisma";

export async function findBootstrapCode(code: string) {
  return prisma.bootstrapCode.findUnique({ where: { code } });
}

export async function redeemBootstrapCode(codeId: string, userId: string) {
  return prisma.$transaction([
    prisma.bootstrapCode.update({
      where: { id: codeId },
      data: { redeemCount: { increment: 1 } },
    }),
    prisma.bootstrapRedemption.create({
      data: { bootstrapCodeId: codeId, userId },
    }),
  ]);
}

export async function findUserByReferralCode(referralCode: string) {
  return prisma.user.findUnique({
    where: { referralCode },
    select: { id: true, referralCode: true },
  });
}

export async function awardReferralCredits(
  referrerId: string,
  newUserId: string,
  amount: number,
) {
  return prisma.$transaction([
    prisma.user.update({
      where: { id: referrerId },
      data: { creditBalance: { increment: amount } },
    }),
    prisma.referralReward.create({
      data: { referrerId, newUserId, amount },
    }),
  ]);
}

export async function hasReferralReward(newUserId: string) {
  return prisma.referralReward.findUnique({ where: { newUserId } });
}
```

---

## Phase 5: Application Layer

**File:** `src/modules/referral/application/referral.schema.ts`

```typescript
import { z } from "zod/v4";

export const referralCodeSchema = z.object({
  referralCode: z.string().min(1, "Referral code is required"),
});
```

**File:** `src/modules/referral/application/referral.service.ts`

```typescript
import { REFERRAL_CREDIT_REWARD } from "../domain/referral.entity";
import {
  findBootstrapCode,
  redeemBootstrapCode,
  findUserByReferralCode,
  awardReferralCredits,
  hasReferralReward,
} from "../infrastructure/referral.repository";

type ValidationResult =
  | { valid: true; type: "bootstrap"; bootstrapCodeId: string }
  | { valid: true; type: "referral"; referrerId: string }
  | { valid: false; reason: string };

export async function validateReferralCode(
  code: string,
): Promise<ValidationResult> {
  // 1. Check bootstrap codes first
  const bootstrap = await findBootstrapCode(code);
  if (bootstrap) {
    if (bootstrap.redeemCount >= bootstrap.maxRedeems) {
      return {
        valid: false,
        reason: `This code has reached its limit (${bootstrap.maxRedeems} signups)`,
      };
    }
    return { valid: true, type: "bootstrap", bootstrapCodeId: bootstrap.id };
  }

  // 2. Check user referral codes
  const referrer = await findUserByReferralCode(code);
  if (referrer) {
    return { valid: true, type: "referral", referrerId: referrer.id };
  }

  return { valid: false, reason: "Invalid referral code" };
}

export async function processSignupReferral(
  code: string,
  newUserId: string,
  result: ValidationResult,
) {
  if (!result.valid) return;

  if (result.type === "bootstrap") {
    await redeemBootstrapCode(result.bootstrapCodeId, newUserId);
  }
  // Referral credit reward happens on email verification (not signup)
}

export async function rewardReferrerOnVerification(
  referrerId: string,
  newUserId: string,
) {
  // Prevent double rewards
  const existing = await hasReferralReward(newUserId);
  if (existing) return;

  await awardReferralCredits(referrerId, newUserId, REFERRAL_CREDIT_REWARD);
}
```

---

## Phase 6: Auth Hook Integration

**File:** `src/lib/auth.ts` (modify existing)

```typescript
import { validateReferralCode, processSignupReferral } from "#/modules/referral";

// Inside Better Auth config:
databaseHooks: {
  user: {
    create: {
      before: async (user) => {
        // Block disposable emails (existing)
        const { isDisposableEmail } = await import(
          "#/modules/auth/infrastructure/disposable-email"
        );
        if (isDisposableEmail(user.email)) {
          throw new APIError("BAD_REQUEST", {
            message: "Disposable email addresses are not allowed",
          });
        }

        // Validate referral code (NEW)
        const code = user.referralCode;
        if (!code) {
          throw new APIError("BAD_REQUEST", {
            message: "Referral code is required to sign up",
          });
        }

        const result = await validateReferralCode(code);
        if (!result.valid) {
          throw new APIError("BAD_REQUEST", { message: result.reason });
        }

        // Store validation result for after hook
        // Set referredBy if it's a user referral
        if (result.type === "referral") {
          user.referredBy = result.referrerId;
        }
      },
      after: async (user) => {
        // Process bootstrap redemption or referral tracking
        const code = user.referralCode;
        if (code) {
          const result = await validateReferralCode(code);
          await processSignupReferral(code, user.id, result);
        }
      },
    },
  },
}
```

---

## Phase 7: Email Verification → Credit Reward

**File:** `src/lib/auth.ts` or email verification handler

When email is verified, check if user has a referrer and award credits:

```typescript
// On email verification callback
import { rewardReferrerOnVerification } from "#/modules/referral";

async function onEmailVerified(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referredBy: true },
  });

  if (user?.referredBy) {
    await rewardReferrerOnVerification(user.referredBy, userId);
  }
}
```

---

## Phase 8: Frontend Changes

### 8a. Signup Form

**File:** `src/modules/auth/components/sign-up-form.tsx`

Add referral code input (required):

```typescript
// Read code from URL: /auth/signup?code=abc123
const code = searchParams.code || "";

<input
  name="referralCode"
  defaultValue={code}
  placeholder="Enter referral code"
  required
/>
<p className="text-sm text-muted-foreground">
  Ask the person who invited you for their referral code
</p>
```

### 8b. Signup Route

**File:** `src/routes/auth/signup.tsx`

Add `code` search param:

```typescript
export const Route = createFileRoute("/auth/signup")({
  validateSearch: z.object({
    code: z.string().optional(),
  }),
});
```

### 8c. Dashboard Referral Section

**File:** `src/modules/studio/components/referral-card.tsx` (NEW)

```typescript
export function ReferralCard({ referralCode }: { referralCode: string }) {
  const referralUrl = `${window.location.origin}/auth/signup?code=${referralCode}`;

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold">Invite Friends</h3>
      <p className="text-sm text-muted-foreground">
        Share your code and earn 10 credits per signup
      </p>

      <div className="mt-3 flex items-center gap-2">
        <input
          readOnly
          value={referralUrl}
          className="flex-1 rounded border bg-muted px-3 py-2 text-sm"
          onClick={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(referralUrl)}
        >
          Copy
        </button>
      </div>
    </div>
  );
}
```

---

## Phase 9: Seed Bootstrap Codes

**File:** `prisma/seed.ts`

```typescript
async function main() {
  const codes = ["LAUNCH-001", "LAUNCH-002", "LAUNCH-003"];

  for (const code of codes) {
    await prisma.bootstrapCode.upsert({
      where: { code },
      update: {},
      create: { code, maxRedeems: 5 },
    });
  }

  console.log("Bootstrap codes created (5 uses each):");
  codes.forEach((c) => console.log(`  ${c}`));
}
```

---

## Implementation Order

| Step | Task | Files | Depends On |
|------|------|-------|------------|
| 1 | Add Prisma schema + migrate | `prisma/schema.prisma` | — |
| 2 | Create domain entities | `referral/domain/referral.entity.ts` | — |
| 3 | Create repository | `referral/infrastructure/referral.repository.ts` | Step 1 |
| 4 | Create Zod schema | `referral/application/referral.schema.ts` | — |
| 5 | Create service | `referral/application/referral.service.ts` | Steps 2, 3 |
| 6 | Create barrel export | `referral/index.ts` | Steps 2-5 |
| 7 | Update auth hooks | `src/lib/auth.ts` | Step 6 |
| 8 | Wire email verification → reward | `src/lib/auth.ts` | Step 6 |
| 9 | Update signup form + route | `sign-up-form.tsx`, `signup.tsx` | Step 7 |
| 10 | Create referral card | `referral-card.tsx` | — |
| 11 | Seed bootstrap codes | `prisma/seed.ts` | Step 1 |
| 12 | Test full flow | — | All |

---

## Test Scenarios

1. **No code → rejected:** Try signup without code → "Referral code is required"
2. **Invalid code → rejected:** Try signup with random code → "Invalid referral code"
3. **Bootstrap code → accepted:** Signup with LAUNCH-001 → success
4. **Bootstrap exhausted → rejected:** Use LAUNCH-001 six times → "limit reached" on 6th
5. **User referral → accepted:** Use existing user's code → signup success
6. **Referrer gets credits:** After referred user verifies email → referrer +10 credits
7. **No double reward:** Verify email twice → only 1 reward
8. **Duplicate email → rejected:** Same email tries signup again → "email already exists"
