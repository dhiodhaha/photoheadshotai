# Implementation Plan: Webhook + Hybrid R2 + Frontend UX

**Branch:** `feat/generation-webhook-ux`
**Issues:** #3 (Webhook + Hybrid R2) + #5 (Frontend UX Perceived Performance)

---

## Issue 3 — Webhook + Hybrid R2

### Problem

`fal.subscribe()` holds the VPS connection open for 20–40s. With concurrent users this exhausts the Node.js thread pool and slows all other requests. Node's `UV_THREADPOOL_SIZE=4` means only 4 concurrent long-poll connections.

### Solution: fal.queue.submit() + Webhook + Hybrid URL

**Flow:**
```
User clicks Generate
  → POST /api/studio/generate
    → fal.queue.submit(webhookUrl)   ← returns in <500ms
    → createGenerationJob(status=pending)
    → deductCredits
    → return { job_id }
  ← HTTP 200 immediately

[20–40s later]
  ← POST /api/studio/webhook/fal  (fal.ai calls this)
    → verify WEBHOOK_SECRET
    → extract jobId, userId, photoId from query params
    → get imageUrl from payload
    → completeGenerationJob(jobId, photoId, { resultUrl: imageUrl, r2Key: null })
    → fire-and-forget: uploadToR2 → updateHeadshotResultUrl(headshotId, r2Url, r2Key)

User is polling /api/studio/status/:jobId every 3s
  → job becomes "completed" with fal.ai URL → frontend shows image immediately
  → (background) R2 upload finishes → URL silently updated in DB (no user impact)
```

### Webhook URL Format

```
https://standoutheadshot.com/api/studio/webhook/fal?jobId=xxx&userId=yyy&photoId=zzz&secret=WEBHOOK_SECRET
```

> **Security note:** `secret` in query params is fine for webhooks — fal.ai doesn't support custom headers. The secret prevents unauthorized POSTs from other sources.

---

### New Files

#### 1. `src/routes/api/studio/webhook/fal.ts`

```typescript
import { json } from "@tanstack/start/server";
import { createAPIFileRoute } from "@tanstack/start/api";
import { processWebhookResult } from "#/modules/studio/application/webhook.service";
import { falWebhookSchema } from "#/modules/studio/application/webhook.schema";

export const APIRoute = createAPIFileRoute("/api/studio/webhook/fal")({
  POST: async ({ request }) => {
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    const jobId = url.searchParams.get("jobId");
    const userId = url.searchParams.get("userId");
    const photoId = url.searchParams.get("photoId");

    if (secret !== process.env.WEBHOOK_SECRET) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!jobId || !userId || !photoId) {
      return json({ error: "Missing params" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = falWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Invalid payload" }, { status: 400 });
    }

    await processWebhookResult({ jobId, userId, photoId, payload: parsed.data });
    return json({ ok: true });
  },
});
```

#### 2. `src/modules/studio/application/webhook.schema.ts`

Zod schema for fal.ai webhook payload:

```typescript
import { z } from "zod";

export const falWebhookSchema = z.object({
  status: z.enum(["OK", "ERROR"]),
  error: z.string().optional(),
  payload: z
    .object({
      images: z.array(z.object({ url: z.string().url() })).optional(),
    })
    .optional(),
});

export type FalWebhookPayload = z.infer<typeof falWebhookSchema>;
```

#### 3. `src/modules/studio/application/webhook.service.ts`

```typescript
import { completeGenerationJob, failGenerationJob } from "../infrastructure/generation.repository";
import { persistImageToR2 } from "../infrastructure/photo.storage";
import { updateHeadshotResultUrl } from "../infrastructure/gallery.repository";
import { refundCredits } from "#/modules/credits";
import type { FalWebhookPayload } from "./webhook.schema";

const GENERATION_CREDIT_COST = 10;

interface WebhookResultInput {
  jobId: string;
  userId: string;
  photoId: string;
  payload: FalWebhookPayload;
}

export async function processWebhookResult({ jobId, userId, photoId, payload }: WebhookResultInput) {
  if (payload.status === "ERROR" || !payload.payload?.images?.[0]?.url) {
    await failGenerationJob(jobId);
    await refundCredits(userId, GENERATION_CREDIT_COST);
    return;
  }

  const imageUrl = payload.payload.images[0].url;

  // Complete immediately with fal.ai URL — user sees image fast
  const result = await completeGenerationJob(jobId, photoId, {
    resultUrl: imageUrl,
    thumbnailUrl: null,
    r2Key: null,
    r2ThumbnailKey: null,
  });

  // Fire-and-forget: upload to R2, silently update URL
  persistAndUpdateR2(result.headshotId, imageUrl, userId, jobId).catch((err: unknown) => {
    console.warn("Background R2 upload failed:", err instanceof Error ? err.message : String(err));
  });
}

async function persistAndUpdateR2(headshotId: string, imageUrl: string, userId: string, jobId: string) {
  const persisted = await persistImageToR2(imageUrl, userId, jobId);
  await updateHeadshotResultUrl(headshotId, persisted.resultUrl, persisted.r2Key);
}
```

---

### Modified Files

#### 4. `src/modules/studio/application/generation.service.ts`

Replace `fal.subscribe()` with `fal.queue.submit()`:

```typescript
const result = await fal.queue.submit(SEEDREAM_MODEL, {
  input: { prompt, image_urls: [photoUrl], image_size: { width: 2048, height: 2048 }, num_images: 1, enable_safety_checker: true },
  webhookUrl: buildWebhookUrl(jobId, userId, photoId),
});
// result.request_id is logged for debugging; job completes via webhook
console.log(`Job ${jobId} submitted to fal.ai, request_id: ${result.request_id}`);
```

New helper:

```typescript
function buildWebhookUrl(jobId: string, userId: string, photoId: string): string {
  const base = requireEnv("BETTER_AUTH_URL"); // e.g. https://standoutheadshot.com
  const secret = requireEnv("WEBHOOK_SECRET");
  return `${base}/api/studio/webhook/fal?jobId=${jobId}&userId=${userId}&photoId=${photoId}&secret=${secret}`;
}
```

`processGeneration()` becomes much simpler — just `fal.queue.submit()` + log. No `try/catch` for result processing (that moves to `webhook.service.ts`).

#### 5. `src/modules/studio/infrastructure/generation.repository.ts`

`completeGenerationJob` needs to return the `headshotId` (the created headshot record's ID) so `webhook.service.ts` can pass it to `updateHeadshotResultUrl`. Currently it may return `void`. Change to return `{ headshotId: string }`.

#### 6. `src/modules/studio/infrastructure/gallery.repository.ts`

New function:

```typescript
export async function updateHeadshotResultUrl(
  headshotId: string,
  resultUrl: string,
  r2Key: string | null,
) {
  await prisma.headshot.update({
    where: { id: headshotId },
    data: { resultUrl, r2Key },
  });
}
```

---

### Environment

Add to `.env.example` and VPS `.env.production`:

```bash
# Webhook auth secret — generate with: openssl rand -hex 32
WEBHOOK_SECRET=your_random_secret_here
```

### Mock Mode (MOCK_AI_GENERATION=true)

`processGeneration()` mock branch is unchanged — still uses `setTimeout(2000)` + `completeGenerationJob` directly. Webhook route is never called in mock mode.

### Local Development

fal.ai cannot reach `localhost`. Options:
1. Use `ngrok` to expose local port: `ngrok http 3000` → set `BETTER_AUTH_URL=https://xxx.ngrok.io`
2. Use `MOCK_AI_GENERATION=true` (easiest — bypasses webhook entirely)

---

## Issue 5 — Frontend UX Perceived Performance

### Problem

Users wait 20–40s with a static animation and no sense of progress. This feels longer than it is.

### Solution: Stage Labels + Fake Progress Bar

**Design:**
- Stage labels cycle automatically with realistic timing
- Fake progress bar: fast 0→60%, slow 60→90%, holds at 90% until complete, then instant 100%
- On completion: brief 100% hold, then crossfade to result image (already exists via `onGeneratedImage`)

**Stage timing (total budget ~35s):**

| Stage | Label | Duration |
|-------|-------|----------|
| 0 | "Analyzing your photo..." | 0–5s |
| 1 | "Applying professional style..." | 5–15s |
| 2 | "Generating your headshot..." | 15–28s |
| 3 | "Adding final touches..." | 28s+ (holds until complete) |

**Progress bar timing:**
- 0→60% over 10s (linear, fast — feels responsive)
- 60→90% over 25s (eased, slow — realistic for AI work)
- Holds at 90% until `onCompleted` fires
- Instant jump to 100%

---

### New Component

#### `src/modules/studio/components/generation-progress.tsx`

Extracted from the step 3 section of `routes/studio/index.tsx` (SRP). Receives:

```typescript
interface GenerationProgressProps {
  sourcePhotoUrl: string | null;
  styleLabel: string;
  isComplete: boolean; // triggers jump to 100%
}
```

Internally manages:
- `stageIndex` state + `useEffect` timer to advance stages
- `progress` state + `useEffect` RAF loop for progress bar animation
- Renders: source photo card + style name + stage label + progress bar

#### Progress bar animation logic (inside component):

```typescript
useEffect(() => {
  if (isComplete) {
    setProgress(100);
    return;
  }
  // Animate: 0→60 in 10s, 60→90 in 25s, hold at 90
  const startTime = Date.now();
  const tick = () => {
    const elapsed = (Date.now() - startTime) / 1000; // seconds
    let p: number;
    if (elapsed < 10) {
      p = (elapsed / 10) * 60;
    } else if (elapsed < 35) {
      p = 60 + ((elapsed - 10) / 25) * 30;
    } else {
      p = 90;
    }
    setProgress(Math.min(90, p));
    if (p < 90) raf = requestAnimationFrame(tick);
  };
  let raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}, [isComplete]);
```

---

### Modified Files

#### `src/routes/studio/index.tsx`

Replace the step 3 `<div>` block (current "Neural Synthesis" animation) with:

```tsx
{step === 3 && (
  <GenerationProgress
    sourcePhotoUrl={uploadedPhotoUrl}
    styleLabel={selectedStyle?.label ?? ""}
    isComplete={generatedImageUrl !== null}
  />
)}
```

The existing photo display, spinning ring, and shimmer elements move into `GenerationProgress` and are enhanced with the stage label + progress bar overlay.

---

## File Change Summary

| File | Action |
|------|--------|
| `src/routes/api/studio/webhook/fal.ts` | NEW |
| `src/modules/studio/application/webhook.schema.ts` | NEW |
| `src/modules/studio/application/webhook.service.ts` | NEW |
| `src/modules/studio/components/generation-progress.tsx` | NEW |
| `src/modules/studio/application/generation.service.ts` | MODIFY — swap subscribe→submit, add buildWebhookUrl |
| `src/modules/studio/infrastructure/generation.repository.ts` | MODIFY — return headshotId from completeGenerationJob |
| `src/modules/studio/infrastructure/gallery.repository.ts` | MODIFY — add updateHeadshotResultUrl |
| `src/modules/studio/index.ts` | MODIFY — export GenerationProgress if needed |
| `src/routes/studio/index.tsx` | MODIFY — replace step 3 block with GenerationProgress |
| `.env.example` | MODIFY — add WEBHOOK_SECRET |

---

## Rollout Notes

1. Add `WEBHOOK_SECRET` to VPS `.env.production` before deploying
2. fal.ai webhook delivery is best-effort — if webhook fails, job stays `pending` forever. Consider a cron cleanup job later (post-MVP) to fail stale jobs after 10 minutes.
3. The `r2Key` null → R2 URL silent update happens in the background. If R2 is unavailable, the fal.ai URL is used permanently (URL expires after ~1h). Acceptable for MVP.
4. For local testing of webhook flow: use `MOCK_AI_GENERATION=true` or ngrok.
