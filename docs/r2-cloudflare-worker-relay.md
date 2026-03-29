# Future: Cloudflare Worker as R2 Upload Relay

**Status:** Not implemented — deferred post-MVP
**Priority:** Low (VPS relay works fine for current scale)

---

## Problem

Current R2 upload flow routes image data through the VPS:

```
fal.ai → VPS (buffer in RAM, ~2–5MB) → R2
```

This consumes VPS bandwidth and RAM per generation. On a 2vCPU/4GB VPS with `UV_THREADPOOL_SIZE=4`, heavy concurrent generation could cause memory pressure.

## Proposed Solution: Cloudflare Worker Relay

Workers have native R2 binding — they can stream from a URL directly into R2 without going through the VPS at all:

```
fal.ai → Cloudflare Worker (stream) → R2
VPS just fires a fetch() to the Worker with the fal URL + target key — no image data touches VPS
```

### How it would work

**1. Deploy a Worker** (`workers/r2-relay/index.ts`):

```typescript
export default {
  async fetch(request: Request, env: Env) {
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    // Verify secret header to prevent unauthorized calls
    if (request.headers.get("X-Relay-Secret") !== env.RELAY_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { falUrl, key } = await request.json<{ falUrl: string; key: string }>();

    const image = await fetch(falUrl);
    if (!image.ok || !image.body) {
      return new Response("Failed to fetch from fal.ai", { status: 502 });
    }

    await env.R2_BUCKET.put(key, image.body, {
      httpMetadata: { contentType: "image/png" },
    });

    return Response.json({ ok: true, key });
  },
};

interface Env {
  R2_BUCKET: R2Bucket;
  RELAY_SECRET: string;
}
```

**2. VPS calls the Worker** (replaces `persistImageToR2`):

```typescript
// Instead of fetch(falUrl) + buffer + PutObjectCommand:
const res = await fetch("https://r2-relay.your-workers.dev", {
  method: "POST",
  headers: { "X-Relay-Secret": process.env.RELAY_SECRET, "Content-Type": "application/json" },
  body: JSON.stringify({ falUrl, key: `headshots/${userId}/${jobId}.png` }),
});
```

### Benefits

- **Zero VPS bandwidth** for image data — entire transfer happens at Cloudflare edge
- **Faster** — Cloudflare edge → R2 is same-network (sub-100ms for large images)
- **Scales independently** of VPS

### Tradeoffs

- Additional deployment artifact (Worker) to maintain and deploy in CI/CD
- Wrangler config + secrets management
- Extra monthly cost (Workers free tier: 100k req/day — likely fine)
- Adds complexity to local dev (need to mock or skip Worker calls)

## When to Revisit

- VPS RAM consistently above 80% during peak usage
- R2 upload latency becoming noticeable in logs
- Scaling beyond current single VPS
