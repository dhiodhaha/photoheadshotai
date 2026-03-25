# Project Report — StandoutHeadshot.com

**Date:** 2026-03-25
**Stack:** TanStack Start (React SSR) + Nitro + PostgreSQL + Prisma + Better Auth + Cloudflare R2 + fal.ai
**Infrastructure:** Jetorbit VPS (2vCPU, 4GB RAM) + Cloudflare + Docker + GitHub Actions

---

## Wins

1. **Full DDD architecture** — Clean separation into domain/application/infrastructure layers across all modules (auth, studio, credits, referral). Routes are thin HTTP adapters with zero business logic.

2. **Production deployed** — App is live at standoutheadshot.com behind Cloudflare with HTTPS, Nginx reverse proxy, Docker Compose, and automated CI/CD via GitHub Actions + Tailscale.

3. **AI generation pipeline** — Full upload → generate → poll → display flow using Bytedance Seedream v4.5 on fal.ai at $0.04/image.

4. **Invitation-only referral system** — Bootstrap codes for early access + user referral codes with credit rewards on email verification.

5. **Performance optimizations** — Nginx proxy cache, SSR with TanStack Start + Nitro, lazy-loaded decorative images, `fetchPriority="high"` on LCP image, DB pool tuned to VPS specs, Docker resource limits.

6. **Atomic credit operations** — Credit deduction wrapped in a single `$transaction` preventing TOCTOU race conditions under concurrent requests.

7. **0 lint violations** — Full Biome compliance with pre-commit hooks enforcing it on every commit.

---

## Challenges & How They Were Solved

### 1. Blank/White Page on Production
**Error:** App loaded but showed a completely blank page.

**Root cause:** `ClientOnly` was wrapping `ThemeProvider` and all `{children}` in `__root.tsx`. On SSR, the server sent an empty HTML shell. On the client, React hydrated an empty tree — so users saw nothing until full client-side render completed (or never, if JS failed).

**Fix:** Removed `ClientOnly` wrapper. `ThemeProvider` from next-themes is SSR-safe and requires only `suppressHydrationWarning` on the `<html>` tag (already present).

---

### 2. `pnpm: executable file not found` in CI/CD
**Error:**
```
OCI runtime exec failed: exec failed: unable to start container process:
exec: "pnpm": executable file not found in $PATH
```

**Root cause:** The deploy workflow ran `docker exec app pnpm dotenv ... prisma migrate deploy` and `docker exec app pnpm db:seed` — but the production Docker image never installed pnpm (it was removed to keep the image lean).

**Fix:** Removed both `docker exec pnpm` commands from the deploy script. Migrations now run automatically via `docker-entrypoint.sh` on container start using `node_modules/.bin/prisma migrate deploy`.

---

### 3. `Cannot find module 'prisma/config'` in Production Container
**Error:**
```
Failed to load config file "/app/prisma.config.ts" as a TypeScript/JavaScript module.
Error: Cannot find module 'prisma/config'
```

**Root cause:** The production Dockerfile used `RUN npm install -g prisma@latest` (global install). The global `prisma` CLI cannot resolve `prisma/config` because that module lives in local `node_modules` — which was not copied into the runner stage.

**Fix:** Replaced global install with copying `node_modules` from the `deps` build stage into the runner. Entrypoint now calls `node_modules/.bin/prisma migrate deploy` directly.

---

### 4. `UniqueConstraintViolation` on `referral_code` — Signup Broken After First User
**Error:**
```
PrismaClientKnownRequestError: Unique constraint failed on the fields: (`referral_code`)
code: 'P2002'
```

**Root cause:** `referralCode` served two conflicting purposes — the code a user enters during signup (for redemption) AND their own unique shareable code (stored in DB). Better Auth's `additionalFields` declared it as `input: true` with `defaultValue: ""`, causing Better Auth to explicitly send `""` to the DB for every user. Since `referral_code` has a `@unique` constraint, only one user could have `""` — every signup after the first failed.

**Fix:**
- In the `before` hook: save the entered code to a module-level `_pendingRedemptions` Map (keyed by email), then replace `user.referralCode` with a newly generated unique 8-char hex code before DB insert.
- In the `after` hook: read the entered code from the Map (where `user.id` is available), process the redemption, delete the Map entry.

---

### 5. SSR Hydration Mismatch — Full Client Re-render on Every Page Load
**Error:** No visible error, but `BackgroundGrid` on the studio page caused a full React hydration mismatch and re-render.

**Root cause:** `Math.random()` was called inside the render function of `BackgroundGrid` to generate `top` offsets. The server rendered different values than the client, causing a hydration mismatch — React discarded the server HTML and re-rendered the entire tree from scratch on every page load.

**Fix:** Replaced `Math.random()` with a static `GRID_OFFSETS` constant defined at module level. Added `loading="lazy"` to all 12 decorative background images to prevent them from blocking initial render.

---

### 6. TOCTOU Race Condition in Credit Deduction
**Issue:** Two concurrent generation requests could both pass the "has enough credits" check and together deduct more than the user's balance, resulting in negative credits.

**Root cause:** `deductUserCredits` in the service called `getUserCredits()` (read) then `deductCredits()` (write) as two separate database operations outside any transaction. Between those two calls, another request could change the balance.

**Fix:** Merged the read + check + decrement into a single `prisma.$transaction(async (tx) => {...})` in the repository. PostgreSQL's transaction isolation guarantees the check and deduct are atomic.

---

### 7. Bootstrap Code Over-Redemption Race
**Issue:** Two concurrent signups with the same bootstrap code could both pass the `maxRedeems` validation at the service layer and both redeem, exceeding the limit.

**Root cause:** The `maxRedeems` check happened in the service before calling `redeemBootstrapCode`, leaving a window between check and increment.

**Fix:** Moved the `redeemCount < maxRedeems` check inside a `$transaction` in `redeemBootstrapCode` repository function. The check and increment are now atomic.

---

### 8. Prisma Raw Strings Instead of Enums
**Issue:** `generation.repository.ts` used raw strings `"processing"`, `"completed"`, `"failed"` for status fields. `referral.repository.ts` used `"purchase"` for transaction type.

**Root cause:** Enums were defined in the schema and generated to `src/generated/prisma/enums.js` but not imported in the repositories.

**Fix:** Imported `GenerationJobStatus`, `PhotoStatus`, `TransactionType` from `#/generated/prisma/enums.js` and replaced all raw strings with enum references.

---

### 9. Redundant Database Index
**Issue:** `Session` model had both `token String @unique` and `@@index([token])`. A `@unique` constraint automatically creates a B-tree index in PostgreSQL — the explicit `@@index` created a duplicate index, wasting storage and adding overhead to every write.

**Fix:** Removed the redundant `@@index([token])` from the Session model.

---

### 10. React Hook Called Inline in JSX
**Error:** React Rules of Hooks violation — `authClient.useSession()` was called inline inside JSX:
```tsx
{authClient.useSession().data?.user?.currentCredits ?? 0}
```

**Fix:** Moved the hook call to the top of the `StudioHeader` component function:
```tsx
const credits = authClient.useSession().data?.user?.currentCredits ?? 0;
```

---

### 11. Invalid `onLoad` String on Font Link Element
**Error:**
```
Expected listener to be a function, instead got a value of string type. onLoad string
```

**Root cause:** The non-blocking font loading trick `onLoad="this.media='all'"` is a raw HTML pattern — React expects event handlers to be functions, not strings.

**Fix:** Removed the `media="print"` + `onLoad` trick. The font was already declared with `rel="preload"` which handles non-blocking loading correctly in React/SSR context.

---

### 12. 404 Not Found with Generic `<p>Not Found</p>`
**Warning:**
```
A notFoundError was encountered on the route with ID "__root__" / "/studio",
but a notFoundComponent was not configured
```

**Fix:** Created `src/components/not-found.tsx` with a styled 404 page. Registered it as `defaultNotFoundComponent` on the router in `src/router.tsx` — one config covers all routes automatically.

---

### 13. Cloudflare 522 Error — Connection Timeout
**Error:** Cloudflare returned 522 (Connection Timed Out) — site unreachable via domain, but accessible via direct VPS IP.

**Root cause (multi-layered):**
1. **Nginx config never deployed** — `nginx/photoheadshot.conf` existed in the repo but CI/CD never copied it to the server. Nginx was running with only the default config, which doesn't know about the domain or SSL.
2. **`server_name` placeholder** — The nginx config had `server_name yourdomain.com` (never updated to `standoutheadshot.com`).
3. **Stale DNS records** — Cloudflare DNS had 3 A records: the correct VPS IP (`103.74.5.127`) plus two old Squarespace IPs (`54.149.79.189`, `34.216.117.25`) from a previous setup. Cloudflare was round-robin load balancing across all three — sometimes hitting the VPS (works), sometimes hitting Squarespace (522 or parked domain page).

**Fix:**
1. Added nginx config deploy step to CI/CD — `scp` copies the config on every deploy, then `nginx -t && systemctl reload nginx`.
2. Fixed `server_name` to `standoutheadshot.com` in the config.
3. Deleted the two Squarespace A records from Cloudflare DNS, keeping only `103.74.5.127`.

---

## Key Lessons

| Lesson | Context |
|---|---|
| Never use `Math.random()` in render functions | Causes SSR hydration mismatch |
| Never set `defaultValue: ""` on a `@unique` field in Better Auth | Better Auth sends the default explicitly, violating the constraint |
| Credit operations must be atomic | Read-then-write outside a transaction = race condition |
| CI/CD must own all server config files | Manually placed configs get wiped on server reset |
| Multiple DNS A records = intermittent failures | Old provider records must be cleaned up before going live |
| `pnpm` doesn't exist in production Docker images | Never call `docker exec app pnpm` in deploy scripts |
| `ClientOnly` wrapping all children = blank SSR page | Only wrap truly client-only components, not the entire app |
