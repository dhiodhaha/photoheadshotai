# Implementation Plan: Email Verification, Async Generation, and Polar.sh Payments

## Context

The app is a Professional AI Headshot Studio. Three gaps need to be filled before production:
1. **No email verification** — users sign up and access everything immediately with unverified emails
2. **Synchronous generation** — the API route blocks for 15-30s waiting for fal.ai, and there's no email notification on completion
3. **Mock payments** — the purchase endpoint adds credits without any real payment verification

This plan adds Resend-powered email verification, converts generation to fire-and-forget with polling + email notifications, and integrates **Polar.sh** (Merchant of Record) for real payments.

---

## Phase 1: Shared Email Infrastructure (Resend)

### Install
```bash
pnpm add resend
```

### Env Vars (add to `.env.example` and `.env.local`)
```
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=Studio AI <noreply@yourdomain.com>
```

### New File: `src/modules/auth/infrastructure/email.server.ts`

Resend client singleton — shared by all features (verification, generation notifications, payment receipts).

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "Studio AI <noreply@studio.ai>";

  const { error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("Failed to send email:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }
}
```

### New File: `src/modules/auth/infrastructure/email-templates.ts`

HTML email template builders — dark-themed to match the app's premium aesthetic.

```typescript
export function buildVerificationEmailHtml(userName: string, verificationUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:480px;margin:0 auto;padding:48px 24px;">
        <div style="text-align:center;margin-bottom:32px;">
          <h1 style="color:#fff;font-size:24px;margin:0;">Studio AI</h1>
        </div>
        <div style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:32px;text-align:center;">
          <h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Verify your email</h2>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Hey ${userName}, click the button below to verify your email and unlock your studio.
          </p>
          <a href="${verificationUrl}"
             style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Verify Email
          </a>
          <p style="color:#71717a;font-size:12px;margin-top:24px;">
            If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
```

---

## Phase 2: Email Verification on Registration

### Modify: `src/lib/auth.ts`

Add `emailVerification` config block and `requireEmailVerification` to the Better Auth config.

**New code:**
```typescript
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { sendEmail } = await import("#/modules/auth/infrastructure/email.server");
      const { buildVerificationEmailHtml } = await import("#/modules/auth/infrastructure/email-templates");
      await sendEmail(
        user.email,
        "Verify your email — Studio AI",
        buildVerificationEmailHtml(user.name, url),
      );
    },
  },
  user: { additionalFields: { currentCredits: { type: "number", defaultValue: 0 } } },
  plugins: [tanstackStartCookies()],
});
```

### New File: `src/modules/auth/components/verify-email-prompt.tsx`

SRP component with 60s resend cooldown using `authClient.sendVerificationEmail()`.

### New File: `src/routes/auth/verify-email.tsx`

Route page at `/auth/verify-email` with search param `?email=`.

### Modify: `src/modules/auth/components/sign-up-form.tsx`

Redirect to `/auth/verify-email?email=<email>` after sign-up.

### Modify: `src/routes/studio.tsx` (beforeLoad)

Add `emailVerified` check — redirect to verify-email if not verified.

---

## Phase 3: Async Generation + Client Polling

### Modify: `src/modules/studio/application/generation.service.ts`

Change `startGeneration` to fire-and-forget (don't await `processGeneration`).

### Modify: `src/routes/api/studio/generate.ts`

Return `202 Accepted` with `{ job_id }` only.

### Modify: `src/routes/studio/index.tsx`

Add polling with `setInterval` every 3s, max 60 polls (3 min timeout).

---

## Phase 4: Generation Email Notifications

### New Files:
- `src/modules/studio/infrastructure/notification-templates.ts` — HTML templates for complete/failed
- `src/modules/studio/infrastructure/notification.server.ts` — sends emails via shared Resend client

### Modify: `src/modules/studio/application/generation.service.ts`

Add email notifications after success/failure in `processGeneration`.

---

## Phase 5: Polar.sh Payment Integration

### Install
```bash
pnpm add @polar-sh/sdk
```

### Env Vars
```
POLAR_ACCESS_TOKEN=polar_oat_xxxxx
POLAR_WEBHOOK_SECRET=polar_whsec_xxxxx
POLAR_PRODUCT_STARTER_ID=prod_xxxxx
POLAR_PRODUCT_PRO_ID=prod_xxxxx
POLAR_PRODUCT_AGENCY_ID=prod_xxxxx
```

### Database Migration

Add `PaymentStatus` enum and `Payment` model to `prisma/schema.prisma`.

### New Files:
- `src/modules/credits/domain/payment.entity.ts` — Payment types + PRICING_PLANS
- `src/modules/credits/infrastructure/polar.server.ts` — Polar SDK singleton
- `src/modules/credits/infrastructure/payment.repository.ts` — Payment CRUD
- `src/modules/credits/application/checkout.service.ts` — Checkout + webhook handler
- `src/modules/credits/application/checkout.schema.ts` — Zod validation
- `src/routes/api/credits/checkout.ts` — POST endpoint
- `src/routes/api/credits/webhook.ts` — Polar webhook (validates signature, handles `order.paid`)
- `src/routes/studio/checkout-success.tsx` — Success page

### Modify:
- `src/routes/studio/billing.tsx` — Import PRICING_PLANS from domain, redirect to Polar checkout
- `src/modules/credits/index.ts` — Export new types and services

---

## Payment Options Analysis

| | **Polar.sh** (Chosen) | **Stripe** | **Xendit** | **Lemon Squeezy** |
|---|---|---|---|---|
| **MoR** | Yes | No | No | Yes |
| **Fees** | 4% + $0.40 | 2.9% + $0.30 | ~2.5-3% | 5% + $0.50 |
| **Tax** | Automatic | Manual | Manual | Automatic |
| **DX** | Great SDK, Better Auth plugin | Excellent | Good | Simple |

---

## Implementation Order

```
Phase 1: Shared Email (Resend)            ← Foundation
  └─ Phase 2: Email Verification          ← Depends on Phase 1
  └─ Phase 3: Async Generation + Polling  ← Independent
     └─ Phase 4: Generation Emails        ← Depends on Phase 1 + 3
  └─ Phase 5: Polar.sh Payments           ← Independent
```

## Dependencies
```bash
pnpm add resend @polar-sh/sdk
```

## Env Vars (7 new)
```
RESEND_API_KEY=
RESEND_FROM_EMAIL=
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=
POLAR_PRODUCT_STARTER_ID=
POLAR_PRODUCT_PRO_ID=
POLAR_PRODUCT_AGENCY_ID=
```
