# R2 Storage Strategy

## Current State

- User uploads stored in R2 ✅
- Generated images from fal.ai stay on fal.ai servers (not stored in R2)
- Generated image URLs come directly from fal.ai CDN

---

## Decision: Store Generated Images in R2?

### Option A: Keep fal.ai URLs (Current)
**Store only the fal.ai URL in database**

| Aspect | Status |
|--------|--------|
| Cost | Free (fal.ai CDN) |
| Control | 🔴 None (dependent on fal.ai) |
| Speed | Fast (fal.ai CDN) |
| URLs | `fal.ai/files/...` |
| Data Ownership | 🔴 Questionable |
| Lifespan | Unclear (fal.ai policy) |

**Best for:** MVP, quick launch, minimal infrastructure

---

### Option B: Download from fal.ai + Upload to R2 (Recommended for Production)
**Download generated image, save to R2, store R2 URL in database**

| Aspect | Status |
|--------|--------|
| Cost | Pay R2 storage + egress (~$0.015/GB) |
| Control | 🟢 Full ownership |
| Speed | Faster (Cloudflare edge cache) |
| URLs | `your-domain.r2.dev/...` |
| Data Ownership | 🟢 Complete |
| Lifespan | Forever (until you delete) |

**Best for:** Production, long-term data retention, branded delivery

---

## 3 Folder Structure Options

### **Option 1: User-Centric (Recommended)**

```
/users/{userId}/
  /originals/
    photo_1a2b3c.jpg
    photo_9d8e7f.jpg
  /generated/
    job_xyz_executive.jpg
    job_abc_corporate.jpg
```

**Pros:**
- Clear user data isolation
- Easy to implement user data export (GDPR)
- Can delete all user files in one operation
- Perfect for per-user storage quotas

**Cons:**
- Requires user ID at upload time
- Directory cleanup needed for deleted users

**Implementation:**
```typescript
// Upload path
const uploadPath = `users/${userId}/originals/${photoId}.jpg`;

// Generate path (after fal.ai completes)
const generatedPath = `users/${userId}/generated/job_${jobId}_${styleId}.jpg`;
```

---

### **Option 2: Feature-Based (Good for Analytics)**

```
/uploads/{yyyy-mm}/
  photo_1a2b3c_userid.jpg
  photo_9d8e7f_userid.jpg

/headshots/{yyyy-mm}/
  job_xyz_userid_executive.jpg
  job_abc_userid_corporate.jpg
```

**Pros:**
- Easy to archive/delete old content by month
- Clear separation of uploads vs generated
- Great for understanding usage trends
- Simple quota management per month

**Cons:**
- Harder to find all files for one user
- More verbose paths
- Date metadata becomes part of path

**Implementation:**
```typescript
const month = new Date().toISOString().slice(0, 7); // "2026-03"
const uploadPath = `uploads/${month}/photo_${photoId}_${userId}.jpg`;
const generatedPath = `headshots/${month}/job_${jobId}_${userId}_${styleId}.jpg`;
```

---

### **Option 3: Simple Flat (Minimalist)**

```
/photos/
  photo_{randomId}.jpg

/headshots/
  headshot_{randomId}_{styleId}.jpg
```

**Pros:**
- Minimal, clean paths
- Simple to implement
- Scales well with Cloudflare CDN prefix cache
- Easy to generate short URLs

**Cons:**
- No user context (need DB lookup)
- No date/organization context
- Harder to manage/cleanup
- Poor for analytics

**Implementation:**
```typescript
const uploadPath = `photos/photo_${photoId}.jpg`;
const generatedPath = `headshots/headshot_${jobId}_${styleId}.jpg`;
```

---

## Recommendation Timeline

### **MVP (Now)**
- ✅ Use fal.ai URLs directly
- ✅ No R2 code changes needed
- ✅ Storage cost: $0

### **Phase 4 (Post-Launch)**
- Implement Option B (Download + Upload)
- Use **Option 1 (User-Centric)** folder structure
- Add generation.service.ts logic: download → upload to R2 → store R2 URL

### **Phase 5+ (Optional)**
- Add data export feature (GDPR compliance) using user-centric structure
- Implement storage quotas per user
- Archive old uploads after X months

---

## File Naming Convention

Consistent naming for all approaches:

```
photo_{8-char-random-id}.jpg          # User uploads
job_{8-char-random-id}_{styleId}.jpg  # Generated headshots
```

Why:
- Random IDs prevent URL guessing
- StyleId helps with analytics/organization
- 8 chars = ~17 billion unique IDs (enough for years)

---

## Storage Cost Estimate (Option B)

**Assumptions:**
- 1,000 users
- 5 uploads per user (5,000 total photos @ 2MB each = 10GB)
- 2 generated headshots per user (2,000 total @ 1MB each = 2GB)
- Total: ~12GB

**Monthly Cost (Cloudflare R2):**
- Storage: 12GB × $0.015/GB = $0.18
- Egress: 50% of files accessed = 6GB × $0.015/GB = $0.09
- **Total: ~$0.27/month**

R2 is significantly cheaper than AWS S3 (~90% savings).

---

## Next Steps

1. **MVP Phase:** Keep fal.ai URLs, skip R2 implementation
2. **Before Production:** Plan Option B + Option 1 structure
3. **Production Deploy:** Implement download → R2 upload in `generation.service.ts`
