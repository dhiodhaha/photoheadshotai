# Feature Implementation Audit Report

Audit of 6 backend features requested for PhotoHeadshot (standoutheadshot.com).

---

## 1. Settings (User Profile Data)

| Aspect | Status |
|---|---|
| API Endpoint | ✅ `GET /api/user/profile` exists |
| Data returned | ⚠️ Partial — [id](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/referral/application/referral.service.ts#15-38), `email`, `name`, `image`, `currentCredits`, `createdAt` |
| Missing fields | ❌ `referralCode` not included in `select` |
| Settings Page | ❌ **Hardcoded defaults** — not fetching real user data |
| Save functionality | ❌ **Fake** — [handleSave](file:///Users/dhafin/photoheadshot/photoheadshot/src/routes/studio/settings.tsx#36-43) is a `setTimeout` with a toast, no API call |
| Update API | ❌ **Does not exist** — no `PUT/PATCH /api/user/profile` endpoint |

### What Needs to Be Built
- **`PUT /api/user/profile`** endpoint to update `name` (and optionally `image`)
- Add `referralCode` to the profile `select` query
- **Settings page** needs to fetch real data from the profile API and use controlled inputs instead of hardcoded `defaultValue="Valued Member"` / `defaultValue="user@example.com"`
- Wire the save button to call the update API
- Avatar upload needs to be connected to R2 storage

---

## 2. Favorite Tag (Bookmark/Favorite System)

| Aspect | Status |
|---|---|
| Database model | ❌ **Does not exist** |
| API endpoints | ❌ **Does not exist** |
| Frontend UI | ❌ **Does not exist** |

### What Needs to Be Built (if decided)
- New `FavoriteHeadshot` model in [schema.prisma](file:///Users/dhafin/photoheadshot/photoheadshot/prisma/schema.prisma):
  ```
  model FavoriteHeadshot {
    id         String   @id @default(cuid())
    userId     String   @map("user_id")
    headshotId String   @map("headshot_id")
    createdAt  DateTime @default(now()) @map("created_at")
    user       User     @relation(...)
    headshot   GeneratedHeadshot @relation(...)
    @@unique([userId, headshotId])
    @@map("favorite_headshots")
  }
  ```
- `POST /api/studio/gallery/favorite` — toggle favorite
- `GET /api/studio/gallery?favorites=true` — filter favorites
- Heart/star icon on gallery cards

---

## 3. Gallery Filter (Dynamic Categories)

| Aspect | Status |
|---|---|
| Gallery API | ✅ `GET /api/studio/gallery` exists |
| Filtering | ❌ **No filtering** — returns ALL non-deleted headshots |
| Style categories | ⚠️ Data exists (`stylePrompt` on each `GenerationJob`) but not exposed as filter |

### Current Behavior
[gallery.service.ts](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/studio/application/gallery.service.ts) returns all headshots with `isDeleted: false`. The response includes `style` (from `generationJob.stylePrompt`) but there is no endpoint to list distinct styles per user.

### What Needs to Be Built
- **`GET /api/studio/gallery/categories`** — query distinct `styleId` values from user's `GenerationJob` records, map them to human-readable labels from `HEADSHOT_STYLES`
- Add optional `?style=<styleId>` query param to `GET /api/studio/gallery`
- Frontend filter/tabs component using the categories endpoint

---

## 4. Coupon System

| Aspect | Status |
|---|---|
| Database model | ❌ **Does not exist** |
| API endpoints | ❌ **Does not exist** |
| Validation logic | ❌ **Does not exist** |

### What Needs to Be Built
- New `Coupon` model:
  ```
  model Coupon {
    id          String    @id @default(cuid())
    code        String    @unique
    creditAmount Int      @map("credit_amount")
    maxRedeems  Int       @default(1) @map("max_redeems")
    redeemCount Int       @default(0) @map("redeem_count")
    perUserLimit Int      @default(1) @map("per_user_limit")
    expiresAt   DateTime? @map("expires_at")
    createdAt   DateTime  @default(now()) @map("created_at")
    redemptions CouponRedemption[]
    @@map("coupons")
  }

  model CouponRedemption {
    id       String   @id @default(cuid())
    couponId String   @map("coupon_id")
    userId   String   @map("user_id")
    redeemedAt DateTime @default(now()) @map("redeemed_at")
    coupon   Coupon   @relation(...)
    @@unique([couponId, userId])  // prevents same user redeeming twice
    @@map("coupon_redemptions")
  }
  ```
- New `coupon` module following DDD structure
- **`POST /api/credits/redeem-coupon`** — validates code, checks expiry, checks per-user limit, atomically adds credits
- The existing [addCredits](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/credits/infrastructure/credit.repository.ts#12-28) in [credit.repository.ts](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/credits/infrastructure/credit.repository.ts) can be reused (needs new `TransactionType` enum value: `coupon_redemption`)

---

## 5. Referral System

| Aspect | Status |
|---|---|
| Database models | ✅ [ReferralReward](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/referral/infrastructure/referral.repository.ts#67-70), [BootstrapCode](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/referral/infrastructure/referral.repository.ts#4-10), `BootstrapRedemption` all exist |
| Referral code generation | ✅ Auto-generated `cuid()` on user signup (`referralCode` field on [User](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/credits/infrastructure/credit.repository.ts#4-11)) |
| Code validation | ✅ [referral.service.ts](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/referral/application/referral.service.ts) — validates bootstrap + referral codes |
| Credit distribution | ✅ [referral.repository.ts](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/referral/infrastructure/referral.repository.ts#L44-L65) — atomic `$transaction` awards credits to referrer |
| Double-reward prevention | ✅ [hasReferralReward()](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/referral/infrastructure/referral.repository.ts#67-70) check exists |
| Referral tracking | ✅ `referredBy` field on [User](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/credits/infrastructure/credit.repository.ts#4-11), [ReferralReward](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/referral/infrastructure/referral.repository.ts#67-70) tracks referrer→newUser |
| Referral UI | ✅ `ReferralCard` component displayed in settings |

### ⚠️ Issues Found
1. **Wrong `TransactionType`**: In [referral.repository.ts:58](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/referral/infrastructure/referral.repository.ts#L58), referral credit rewards use `TransactionType.purchase` instead of a dedicated `referral_reward` type. This makes it impossible to distinguish referral credits from actual purchases in the transaction history.
2. **New user doesn't get credits**: Only the referrer receives credits. The original requirement says both the referrer AND the new user should get credits.

---

## 6. Trash / Recycle Bin (Soft Delete)

| Aspect | Status |
|---|---|
| Soft delete field | ✅ `isDeleted Boolean @default(false)` on `GeneratedHeadshot` |
| Soft delete logic | ✅ [gallery.service.ts](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/studio/application/gallery.service.ts#L22-L38) — [deleteHeadshot](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/studio/application/gallery.service.ts#22-39) sets `isDeleted: true` |
| Gallery excludes deleted | ✅ `where: { isDeleted: false }` in [getHeadshotGallery](file:///Users/dhafin/photoheadshot/photoheadshot/src/modules/studio/application/gallery.service.ts#3-21) |
| Restore API | ❌ **Does not exist** |
| Trash view API | ❌ **Does not exist** |
| Auto-purge | ❌ **Does not exist** (permanently delete after 30 days) |

### What Needs to Be Built
- **`GET /api/studio/trash`** — returns headshots where `isDeleted: true`
- **`POST /api/studio/trash/restore`** — sets `isDeleted: false` for given headshot ID
- **`DELETE /api/studio/trash/:id`** — permanent hard-delete (also remove from R2)
- Optional: scheduled task/cron to auto-purge items older than 30 days
- Trash page UI in the studio sidebar

---

## Summary Matrix

| Feature | Schema | API | Service | Frontend | Overall |
|---|---|---|---|---|---|
| Settings (Profile Data) | ✅ | ⚠️ Read-only | ❌ No update | ❌ Hardcoded | 🔴 **Needs Work** |
| Favorite Tag | ❌ | ❌ | ❌ | ❌ | 🔴 **Not Started** |
| Gallery Filter | ✅ | ⚠️ No filter param | ❌ | ❌ | 🟡 **Partial** |
| Coupon System | ❌ | ❌ | ❌ | ❌ | 🔴 **Not Started** |
| Referral System | ✅ | ✅ | ⚠️ Minor bugs | ✅ | 🟢 **Mostly Done** |
| Trash / Recycle Bin | ✅ | ⚠️ Delete only | ⚠️ No restore | ❌ | 🟡 **Partial** |
