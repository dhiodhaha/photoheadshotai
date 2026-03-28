# Implementation Plan: Generation Performance Fixes

**Branch:** `fix/generation-performance`
**Based on:** `analysis/generation-performance`
**Date:** 2026-03-29

---

## Scope

| Issue | Chosen Option | Effort |
|-------|--------------|--------|
| 1 — `fal.config()` on every job | A — move to module init | ~5 min |
| 2 — New `S3Client` on every R2 call | A — module-level singleton | ~5 min |
| 3 — VPS relays PNG through memory | B — webhook + skip relay | ~3–4 hrs |
| 4 — Polling starts before AI finishes | A — 10s initial delay | ~5 min |

---

## Issues 1, 2, 4 — Quick Wins

### 1. `fal.config()` → module init

**File:** `src/modules/studio/application/generation.service.ts`

Move `fal.config({ credentials: getFalKey() })` from inside `processGeneration()` to module-level, executed once when the module loads.

```diff
// TOP OF FILE — after imports
+fal.config({ credentials: getFalKey() });

 export class GenerationService {
   private async processGeneration(...) {
-    fal.config({ credentials: getFalKey() });
     const result = await fal.subscribe(SEEDREAM_MODEL, { ... });
```

**Why it's safe:** `getFalKey()` throws if `FAL_KEY` is missing — catches misconfiguration at startup rather than per-job.

---

### 2. Singleton `S3Client`

**File:** `src/modules/studio/infrastructure/r2.server.ts`

Replace the `getR2Client()` factory (new instance on every call) with a module-level lazy singleton.

```diff
-export function getR2Client() {
-  if (requireEnv("R2_ACCOUNT_ID") === "placeholder_account_id") {
-    return null;
-  }
-  return new S3Client({ ... });
-}
+let _r2Client: S3Client | null = null;
+
+export function getR2Client(): S3Client | null {
+  if (requireEnv("R2_ACCOUNT_ID") === "placeholder_account_id") {
+    return null;
+  }
+  if (!_r2Client) {
+    _r2Client = new S3Client({
+      region: "auto",
+      endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
+      credentials: {
+        accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
+        secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
+      },
+    });
+  }
+  return _r2Client;
+}
```

No callers change — same signature, same null return in mock mode.

---

### 4. 10s initial poll delay

**File:** `src/modules/studio/components/use-generation-polling.ts`

Add a `setTimeout` of 10 000ms before the first `setInterval` tick.

```diff
 const startPolling = (jobId: string) => {
   stopPolling();
+  // AI model takes 20–40s minimum — skip first ~3 wasteful polls
+  const initialDelay = setTimeout(() => {
     pollInterval.current = setInterval(async () => {
       // ... existing poll logic
-    }, POLL_INTERVAL_MS);
+    }, POLL_INTERVAL_MS);
+  }, 10_000);
+  // Store so stopPolling can clear it too
+  initialDelayRef.current = initialDelay;
 };
```

Also update `stopPolling` to `clearTimeout(initialDelayRef.current)`.

---

## Issue 3 — fal.ai Webhook (No VPS Relay)

### What changes

**Current flow:**
```
VPS: fal.subscribe() ──── holds open 20–40s ──────► fal.ai completes
VPS: fetch(imageUrl) ──── downloads 2–4MB PNG ─────► VPS memory
VPS: PutObject ────────── uploads 2–4MB PNG ────────► R2
```

**New flow:**
```
VPS: fal.queue.submit(webhookUrl) ─► returns immediately (< 1s)
                                              ↓ fal.ai processes 20–40s
fal.ai: POST /api/studio/webhook/fal ─────────► VPS webhook handler
VPS: fetch(imageUrl) ─────────────────────────► VPS memory (still needed)
VPS: PutObject ────────────────────────────────► R2
```

**What this gains:**
- VPS no longer holds an open async connection for 20–40 seconds per job
- `startGeneration()` returns in < 1s (just a queue submit)
- Multiple concurrent users don't stack open connections
- Download+upload still happens on VPS but is now genuinely async

> Note: To fully eliminate VPS from the image relay would require a Cloudflare Worker triggered by the webhook. That's post-MVP scope.

---

### New files

#### `src/routes/api/studio/webhook/fal.ts`

New API route — receives POST from fal.ai when generation completes.

**Security:** fal.ai does not sign webhook payloads. We pass a `secret` token in the webhook URL query string. The route validates it against `WEBHOOK_SECRET` env var before processing.

```
POST /api/studio/webhook/fal?secret=<WEBHOOK_SECRET>&jobId=<jobId>&userId=<userId>&photoId=<photoId>
```

The `jobId`, `userId`, and `photoId` are embedded in the webhook URL at submit time — no schema changes needed.

**Payload shape from fal.ai:**
```typescript
{
  request_id: string,
  status: "OK" | "ERROR",
  payload: {
    images: [{ url: string, ... }]
  },
  error?: string
}
```

**Handler logic:**
1. Validate `secret` query param against `process.env.WEBHOOK_SECRET`
2. Parse `jobId`, `userId`, `photoId` from query params
3. If `status === "ERROR"` → `failGenerationJob` + `refundCredits`
4. If `status === "OK"` → `persistImageToR2` → `completeGenerationJob`
5. Return `200 OK` immediately (fal.ai retries on non-2xx)

---

#### `src/modules/studio/application/webhook.schema.ts` (new)

Zod schema for the fal.ai webhook payload — lives in application layer per DDD rules.

```typescript
export const falWebhookPayloadSchema = z.object({
  request_id: z.string(),
  status: z.enum(["OK", "ERROR"]),
  payload: z.object({
    images: z.array(z.object({ url: z.string() })),
  }).optional(),
  error: z.string().optional(),
});
```

---

### Modified files

#### `src/modules/studio/application/generation.service.ts`

Replace `fal.subscribe()` with `fal.queue.submit()`. Store nothing extra — `jobId`/`userId`/`photoId` travel via the webhook URL.

```diff
-const result = await fal.subscribe(SEEDREAM_MODEL, {
-  input: { prompt, image_urls: [photoUrl], ... },
-});
-// ... download + upload + completeGenerationJob
+await fal.queue.submit(SEEDREAM_MODEL, {
+  input: { prompt, image_urls: [photoUrl], ... },
+  webhookUrl: buildWebhookUrl(jobId, userId, photoId),
+});
+// Job is now handled by the webhook — nothing more to do here
```

The private `processGeneration()` method becomes much shorter — it only submits to the queue and returns.

A new private helper `buildWebhookUrl(jobId, userId, photoId)` constructs the full webhook URL using `BETTER_AUTH_URL` + `WEBHOOK_SECRET`.

---

### Environment changes

**`.env.example`** — add:
```
# Webhook secret for fal.ai webhook verification (generate: openssl rand -hex 32)
WEBHOOK_SECRET=
```

**`.env.local`** — same, needs a value for local testing (use `ngrok` or skip webhook locally with `MOCK_AI_GENERATION=true`).

---

### No schema/migration changes

Job correlation is handled entirely through the webhook URL query params. No new columns on `GenerationJob`.

---

## Execution Order

1. **New branch** from `main`: `fix/generation-performance`
2. **Fix 2** — singleton S3Client in `r2.server.ts`
3. **Fix 1** — move `fal.config()` to module init in `generation.service.ts`
4. **Fix 4** — 10s initial delay in `use-generation-polling.ts`
5. **Fix 3 step 1** — add `WEBHOOK_SECRET` to `.env.example`
6. **Fix 3 step 2** — create `webhook.schema.ts`
7. **Fix 3 step 3** — modify `generation.service.ts` (submit + webhook URL builder)
8. **Fix 3 step 4** — create `src/routes/api/studio/webhook/fal.ts`
9. `pnpm build` — verify no type errors
10. `npx biome check` — lint
11. Commit + push + PR

---

## Risk Assessment

| Change | Risk | Notes |
|--------|------|-------|
| Singleton S3Client | Low | Same interface, lazy init |
| `fal.config()` at module init | Low | Fails fast on missing env |
| 10s poll delay | Low | UX unchanged (spinner either way) |
| Webhook route | Medium | New endpoint; needs `WEBHOOK_SECRET` set in prod before deploy |

**Rollback:** If webhook is broken, set `MOCK_AI_GENERATION=true` in prod env temporarily while fixing.

---

## Open Questions for Review

1. **Webhook URL base:** Using `BETTER_AUTH_URL` as the base URL for the webhook. Is this correct for prod? (Should be `https://standoutheadshot.com`)
2. **Local testing of webhook:** `MOCK_AI_GENERATION=true` skips the webhook path entirely, so local dev is unaffected. Webhook can be tested with `ngrok` if needed.
3. **fal.ai retry behavior:** fal.ai retries webhook delivery on non-2xx. The handler must be **idempotent** — calling `completeGenerationJob` twice on the same job should be safe (Prisma update is idempotent by jobId).
