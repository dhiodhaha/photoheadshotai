# Generation Performance Analysis: Production vs Local

**Branch:** `analysis/generation-performance`
**Date:** 2026-03-29

---

## Summary

Production generation feels significantly slower than local. This is **not a single bug** — it is a combination of 4 compounding factors that stack on top of the baseline AI model time (~20–40s).

---

## Generation Pipeline (Full Flow)

```
startGeneration()
  ├── getPhotoByIdAndUser()         — DB read
  ├── deductUserCredits()           — DB write
  ├── createGenerationJob()         — DB write
  └── processGeneration() [fire and forget]
        ├── getPresignedUrl()       — R2 signed URL (crypto + HTTP)
        ├── fal.subscribe()         — AI model (20–40s)
        ├── persistImageToR2()
        │     ├── fetch(falUrl)     — download ~2MB PNG from fal.ai
        │     └── PutObject → R2   — upload ~2MB to Cloudflare R2
        └── completeGenerationJob() — DB transaction (3 writes)
```

Frontend polls `/api/studio/status/:jobId` every **3 seconds**, up to **60 polls (3 minutes max)**.

---

## Root Causes (Ranked by Impact)

### 1. `fal.config()` called on every generation — HIGH IMPACT

**File:** `src/modules/studio/application/generation.service.ts:81`

```typescript
// Called inside processGeneration() on every job
fal.config({ credentials: getFalKey() });
```

`fal.config()` is a global mutation that reconfigures the fal.ai SDK client on every generation call. In local dev with one user this is harmless. In production with concurrent users it creates a **race condition**: if two generations run simultaneously, the second `fal.config()` call overwrites the first mid-flight.

More critically, in production the SDK may re-initialize its internal HTTP client on each config call, adding connection setup overhead and potentially **bypassing connection keep-alive / HTTP/2 multiplexing** that the fal.ai client would otherwise reuse.

**Fix:** Move `fal.config()` to module initialization (called once at startup), not inside the per-job method.

---

### 2. New S3Client instantiated on every R2 operation — HIGH IMPACT

**File:** `src/modules/studio/infrastructure/r2.server.ts:10`

```typescript
export function getR2Client() {
  // Creates a brand-new S3Client on every call
  return new S3Client({ ... });
}
```

`getR2Client()` is called by `getPresignedUrl()`, `persistImageToR2()`, `uploadToR2()`, and `deleteFromR2()` — meaning **every R2 operation creates a new TCP connection to Cloudflare R2**. AWS SDK's `S3Client` manages an internal HTTP connection pool; creating a new instance destroys this pool.

In local dev, the round-trip to R2 is fast (nearby CDN edge). In production on a VPS in Indonesia/Asia, cold TCP connection to Cloudflare R2 adds **200–500ms per R2 call**. During generation:
- `getPresignedUrl()` → new S3Client
- `persistImageToR2()` → another new S3Client

That's **2 cold connections × ~300ms = ~600ms avoidable overhead per generation**.

**Fix:** Singleton `S3Client` module-level, reused across all calls.

---

### 3. `persistImageToR2` downloads a 2048×2048 PNG through the VPS — MEDIUM IMPACT

**File:** `src/modules/studio/infrastructure/photo.storage.ts:40`

```typescript
const res = await fetch(falUrl);         // Download PNG from fal.ai CDN → VPS
const buffer = Buffer.from(await res.arrayBuffer()); // Buffer entire image in memory
await client.send(new PutObjectCommand({ Body: buffer })); // Upload VPS → R2
```

The VPS acts as a **relay**: it downloads the ~2–4MB generated PNG from fal.ai's CDN, buffers it entirely in memory, then uploads it to Cloudflare R2. On a 2vCPU/4GB VPS with limited upload bandwidth, this adds:

- Download fal.ai → VPS: ~1–3s (fal.ai CDN may not be near the VPS)
- Upload VPS → R2: ~1–3s (depends on VPS bandwidth)
- Peak memory: ~4MB per job (multiplies with concurrency)

In local dev, your MacBook likely has faster internet, and the fal.ai URL is served from a CDN edge close to you.

**Ideal fix (long-term):** Use fal.ai webhooks + Cloudflare R2 presigned upload URLs so fal.ai uploads directly to R2 without routing through the VPS.
**Short-term fix:** Stream instead of buffering (`res.body` as stream → R2 via `Body: stream`), reducing peak memory and time-to-first-byte.

---

### 4. `fal.subscribe()` polls fal.ai internally — MEDIUM IMPACT

**File:** `src/modules/studio/application/generation.service.ts:83`

```typescript
const result = await fal.subscribe(SEEDREAM_MODEL, { input: { ... } });
```

`fal.subscribe()` is a long-polling wrapper that opens a connection and waits for the result. The fal.ai Seedream v4.5 model runs for **20–40 seconds**. During this time, the `processGeneration()` promise holds a Node.js async context open.

On the 2vCPU/1.5 CPU-limit VPS, this is fine for a small number of concurrent jobs, but if multiple users generate simultaneously, the event loop may be under pressure from the `UV_THREADPOOL_SIZE=4` thread pool and the `pg.Pool` (max: 5 connections). There is no queue, backpressure, or concurrency limit — jobs pile up.

This is not fixable without a proper job queue (Bull/BullMQ), which is already listed as a post-MVP item in CLAUDE.md.

---

### 5. Polling starts immediately, before the job could possibly complete — LOW IMPACT

**File:** `src/modules/studio/components/use-generation-polling.ts:9`

```typescript
const POLL_INTERVAL_MS = 3000; // starts polling immediately
const MAX_POLL_COUNT = 60;     // 3 minutes max
```

The frontend starts polling 3 seconds after `startGeneration()` returns, but the AI model takes 20–40s minimum. This means:
- ~6–12 polls hit the DB before there's ever a result
- Each poll is a `generationJob.findUnique` + session auth check
- At 3s intervals × N concurrent users = unnecessary DB load

**Fix:** Add an initial delay before first poll (e.g. 10s), then poll every 3s.

---

## Environment Differences: Local vs Production

| Factor | Local Dev | Production VPS |
|--------|-----------|----------------|
| `fal.config()` race | 1 user, no race | Multiple concurrent users |
| S3Client cold connect | Fast ISP near CDN | ~300ms per new client |
| fal.ai → VPS download | Fast broadband | Limited VPS bandwidth |
| VPS → R2 upload | Fast broadband | Limited VPS bandwidth |
| DB pool contention | Idle pool | Pool shared with auth, gallery, etc. |
| CPU throttle | Full MacBook CPU | 1.5 CPU limit |

---

## Recommended Fixes (Prioritized)

### Quick wins (1–2 hours)

**Fix 1 — Singleton S3Client**
Move `S3Client` instantiation out of `getR2Client()` to module-level. Reuse across all calls.
**Estimated savings: 400–800ms per generation.**

**Fix 2 — Move `fal.config()` to module init**
Call once at module load, not inside `processGeneration()`.
**Eliminates race condition + possible SDK re-init overhead.**

**Fix 3 — Initial poll delay**
Add 10s initial delay before first status poll.
**Reduces ~10 wasted DB queries per generation.**

### Medium effort (half day)

**Fix 4 — Stream R2 upload instead of buffering**
Pipe `res.body` (ReadableStream) directly to S3 `PutObjectCommand` instead of loading entire PNG into memory.
**Reduces memory usage and may improve upload start time.**

### Long-term (post-MVP)

**Fix 5 — fal.ai webhook + direct R2 upload**
Configure fal.ai to POST to a webhook on completion and upload directly to R2 using a presigned URL, eliminating VPS as image relay entirely.

**Fix 6 — Job queue (BullMQ)**
Already in CLAUDE.md post-MVP list. Adds concurrency limits, retries, backpressure.

---

## Files to Change for Quick Wins

| File | Change |
|------|--------|
| `src/modules/studio/infrastructure/r2.server.ts` | Singleton S3Client |
| `src/modules/studio/application/generation.service.ts` | `fal.config()` at module init |
| `src/modules/studio/components/use-generation-polling.ts` | 10s initial poll delay |
