# Image Pipeline Optimization — Implementation Plan

> **Goal:** Eliminate fal.ai-hosted image loading latency from the gallery by persisting generated images to Cloudflare R2, creating compressed thumbnails for gallery display, upgrading to 2K resolution, and serving thumbnails via lazy loading.

## Current State & Problems

| Area | Current Behavior | Problem |
|------|-----------------|---------|
| **Storage** | Generated images are stored as **fal.ai URLs** in `GeneratedHeadshot.resultUrl` | fal.ai URLs are temporary CDN links, slow for users in Southeast Asia, and could expire |
| **Resolution** | 1024×1024 | Low quality for professional headshots intended for print/LinkedIn |
| **Thumbnails** | None — gallery loads full-resolution images directly | Heavy bandwidth, slow gallery rendering |
| **Lazy loading** | None — all images loaded eagerly | All gallery images fetched at once, blocking the viewport |

## Key Decision: Resolution Upgrade

Seedream v4.5 supports up to **2048×2048 (4MP)** at the same **$0.04/image** flat rate. No price increase for higher resolution.

> **Decision:** Upgrade from 1024×1024 → **2048×2048 (2K)**. True 4K (4096×4096) is not supported by this model.

---

## Proposed Changes

### 1. Schema Migration

#### [MODIFY] [schema.prisma](file:///Users/dhafin/photoheadshot/photoheadshot/prisma/schema.prisma)

Add `thumbnailUrl` and `r2Key` fields to `GeneratedHeadshot`:

```prisma
model GeneratedHeadshot {
  id              String   @id @default(cuid())
  generationJobId String   @map("generation_job_id")
  resultUrl       String   @map("result_url")        // R2 public URL (2K original)
  thumbnailUrl    String?  @map("thumbnail_url")      // R2 public URL (compressed WebP)
  r2Key           String?  @map("r2_key")             // R2 object key (for deletion)
  r2ThumbnailKey  String?  @map("r2_thumbnail_key")   // R2 thumbnail key (for deletion)
  isDeleted       Boolean  @default(false) @map("is_deleted")
  createdAt       DateTime @default(now()) @map("created_at")
  // ... relations unchanged
}
```

Run migration: `pnpm db:migrate`

---

### 2. Image Processing Service

#### [NEW] [image-processing.server.ts](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/studio/infrastructure/image-processing.server.ts)

Server-only module using **sharp** (already commonly available in Node) to:

1. **Fetch** the fal.ai generated image (full-res 2K PNG)
2. **Upload original** to R2 as `headshots/{userId}/{headshotId}.png`
3. **Compress thumbnail** → 400px wide WebP, quality 80 (~15-30KB vs 2-4MB original)
4. **Upload thumbnail** to R2 as `headshots/{userId}/{headshotId}_thumb.webp`
5. **Return** both R2 public URLs and keys

```ts
// Pseudocode
export async function persistGeneratedImage(
  falUrl: string,
  userId: string,
  headshotId: string,
): Promise<{ resultUrl: string; thumbnailUrl: string; r2Key: string; r2ThumbnailKey: string }> {
  const buffer = await fetch(falUrl).then(r => r.arrayBuffer());

  // Original (keep as PNG for quality)
  const originalKey = `headshots/${userId}/${headshotId}.png`;
  await uploadToR2(originalKey, Buffer.from(buffer), "image/png");

  // Thumbnail (compress to WebP, 400px width)
  const thumbBuffer = await sharp(Buffer.from(buffer))
    .resize(400)
    .webp({ quality: 80 })
    .toBuffer();
  const thumbKey = `headshots/${userId}/${headshotId}_thumb.webp`;
  await uploadToR2(thumbKey, thumbBuffer, "image/webp");

  return {
    resultUrl: getPublicUrl(originalKey),
    thumbnailUrl: getPublicUrl(thumbKey),
    r2Key: originalKey,
    r2ThumbnailKey: thumbKey,
  };
}
```

---

### 3. Generation Service Update

#### [MODIFY] [generation.service.ts](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/studio/application/generation.service.ts)

Two changes:

**a) Resolution upgrade** (line 91):
```diff
- image_size: { width: 1024, height: 1024 },
+ image_size: { width: 2048, height: 2048 },
```

**b) Post-generation persistence** — after receiving the fal.ai URL, call the new `persistGeneratedImage` function before storing:
```diff
  const imageUrl = result.data?.images?.[0]?.url;
  if (imageUrl) {
+   const persisted = await persistGeneratedImage(imageUrl, userId, jobId);
-   await completeGenerationJob(jobId, photoId, imageUrl);
+   await completeGenerationJob(jobId, photoId, persisted);
    return;
  }
```

---

### 4. Repository Update

#### [MODIFY] [generation.repository.ts](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/studio/infrastructure/generation.repository.ts)

Update `completeGenerationJob` to accept and store thumbnail + R2 key data:

```ts
export async function completeGenerationJob(
  jobId: string,
  photoId: string,
  imageData: {
    resultUrl: string;
    thumbnailUrl: string;
    r2Key: string;
    r2ThumbnailKey: string;
  },
) {
  await prisma.$transaction([
    prisma.generationJob.update({ ... }),
    prisma.photo.update({ ... }),
    prisma.generatedHeadshot.create({
      data: {
        generationJobId: jobId,
        resultUrl: imageData.resultUrl,
        thumbnailUrl: imageData.thumbnailUrl,
        r2Key: imageData.r2Key,
        r2ThumbnailKey: imageData.r2ThumbnailKey,
      },
    }),
  ]);
}
```

---

### 5. Gallery API — Serve Thumbnails

#### [MODIFY] [gallery.service.ts](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/studio/application/gallery.service.ts)

Return `thumbnailUrl` alongside `src` (original URL) in gallery response:

```ts
const completedItems = headshots.map((h) => ({
  id: h.id,
  src: h.resultUrl,               // full-res for download
  thumbnail: h.thumbnailUrl ?? h.resultUrl,  // fallback for legacy items
  // ... rest unchanged
}));
```

#### [MODIFY] [gallery.repository.ts](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/studio/infrastructure/gallery.repository.ts)

Update the `select`/`include` to also fetch `thumbnailUrl`.

---

### 6. Frontend — Lazy Loading & Thumbnail Display

#### [MODIFY] [gallery-card.tsx](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/studio/components/gallery-card.tsx)

- Use `item.thumbnail` for the `<img>` `src` in the gallery grid
- Add `loading="lazy"` attribute for native browser lazy loading
- User's "Download" action resolves `item.src` (the original 2K image)

```tsx
<img
  src={item.thumbnail}          // compressed WebP thumbnail
  alt=""
  loading="lazy"                // native lazy loading
  className="w-full h-full object-cover ..."
/>
```

#### [MODIFY] [studio/gallery.tsx](file:///Users/dhafin/photoheadshot/photoheadshot/src/routes/studio/gallery.tsx)

Same pattern — use `thumbnail` for grid display, `src` for downloads.

#### [MODIFY] [studio/index.tsx](file:///Users/dhafin/photoheadshot/photoheadshot/src/routes/studio/index.tsx)

Same pattern for the studio home gallery grid.

---

### 7. Deletion Cleanup

#### [MODIFY] [gallery.service.ts](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/studio/application/gallery.service.ts)

When permanently deleting a headshot, also delete the R2 objects:

```ts
if (headshot.r2Key) await deleteFromR2(headshot.r2Key);
if (headshot.r2ThumbnailKey) await deleteFromR2(headshot.r2ThumbnailKey);
```

---

### 8. Dependency: sharp

#### [MODIFY] [package.json](file:///Users/dhafin/photoheadshot/photoheadshot/package.json)

Add `sharp` as a production dependency:

```bash
pnpm add sharp
pnpm add -D @types/sharp
```

> **Note:** `sharp` uses native bindings. The Dockerfile may need `--platform=linux/amd64` for the `deps` stage. Verify the Docker build works after adding it.

---

## Backward Compatibility

Existing headshot records have `thumbnailUrl: null` and `r2Key: null`. The gallery service gracefully falls back:

```ts
thumbnail: h.thumbnailUrl ?? h.resultUrl  // old records use fal.ai URL
```

Optionally, a one-time backfill script can be written to migrate existing fal.ai URLs to R2.

---

## Performance Impact Estimate

| Metric | Before | After |
|--------|--------|-------|
| Gallery card image size | ~1-4 MB (1024px PNG from fal.ai) | ~15-30 KB (400px WebP from R2) |
| Gallery load time (10 images) | ~5-15s on slow connections | ~0.3-1s |
| Download image quality | 1024×1024 | 2048×2048 (2K) |
| Image persistence | Temporary fal.ai CDN | Permanent Cloudflare R2 |
| Cost per generation | $0.04 | $0.04 (unchanged) |
| R2 storage cost | $0 | ~$0.015/GB/month (negligible) |

---

## Verification Plan

### Automated Tests

- **Command:** `pnpm test`
- Update the existing test in `src/modules/studio/application/generation.test.ts` to mock the new `persistGeneratedImage` function and verify `completeGenerationJob` receives the R2 URLs instead of fal.ai URLs.
- Add a unit test for `persistGeneratedImage` that mocks `fetch`, `sharp`, and `uploadToR2` to verify the correct keys and content types are generated.

### Manual Verification

1. **Run the migration:** `pnpm db:migrate` — confirm it succeeds and adds the new columns.
2. **Generate a headshot in dev mode (`MOCK_AI_GENERATION=true`):** Verify the mock flow still works (skip R2 upload in mock mode).
3. **Generate a real headshot (if possible):** Verify:
   - The R2 bucket contains both `{id}.png` and `{id}_thumb.webp`
   - The gallery loads the thumbnail (inspect network tab — images should be ~20KB WebP)
   - The download button fetches the full 2K original (~2-4MB)
4. **Check backward compatibility:** Old headshots (with `thumbnailUrl: null`) should still display using the original `resultUrl`.
5. **Docker build:** Run `docker build` to confirm `sharp` native bindings compile correctly in the production image.
