# Analysis: Route Switching Latency

This document analyzes the ~1s latency/delay observed when switching between pages or routes in the Studio AI application.

## Root Cause Analysis

After analyzing the routing chain, three additive causes were identified that create a significant performance bottleneck during client-side navigation.

### 🔴 #1 — Blocking `getSessionFn()` in `beforeLoad` (Primary Bottleneck)

**File:** `src/routes/studio.tsx:7-21`

The `beforeLoad` hook for the `/studio` layout route executes on **every** navigation to any child route (e.g., switching between Gallery, Settings, and Trash).

```ts
beforeLoad: async () => {
  const session = await getSessionFn(); // ← blocking server function call
}
```

- **Issue**: `beforeLoad` is a blocking hook. The router will not render the target component until this resolves.
- **Latency**: `getSessionFn` is a TanStack server function that performs an HTTP request, validates the session via Better Auth, and queries the database. This adds 300ms–800ms of delay per click.
- **Redundancy**: This executes even if the session is already known to be valid from the previous route.

### 🟡 #2 — Immediate Preload Stale Time

**File:** `src/router.tsx:14`

The router is configured with `defaultPreload: "intent"` but `defaultPreloadStaleTime: 0`.

- **Issue**: Hovering over a link triggers a preload, but because the stale time is `0`, the data is considered stale immediately.
- **Result**: When the user actually clicks the link, the router ignores the preloaded result and re-executes `beforeLoad` from scratch, wasting the preload effort.

### 🟡 #3 — Missing Client-Side Data Caching (StaleTime)

**Files**: `src/routes/studio/gallery.tsx`, `src/routes/studio/settings.tsx`, etc.

The `useQuery` hooks in individual page components do not define a `staleTime`.

- **Issue**: Every time a user switches back to a tab (like Gallery), a new fetch request is made to the API.
- **Cumulative Effect**: Added to the `beforeLoad` delay, the user waits for both the layout auth check and the page-specific data fetch every single time they toggle views.

---

## Recommended Fixes

### 1. Optimize Session Validation
- **Path**: `src/routes/studio.tsx`
- **Action**: Modify `beforeLoad` to check if a session already exists in the router context before calling the server function.
- **Reference**: Use TanStack Router's `shouldReload` or context-based caching.

### 2. Update Global Preload Settings
- **Path**: `src/router.tsx`
- **Action**: Change `defaultPreloadStaleTime` to at least 30 seconds (`30_000`). This ensures that if a user hovers and then clicks within 30s, the preloaded session check is reused.

### 3. Implement TanStack Query `staleTime`
- **Path**: `src/integrations/tanstack-query/root-provider.tsx` (Global) or individual page routes.
- **Action**: Set a default `staleTime` (e.g., 1 minute) for queries so that UI data is instantly available when switching between recently visited tabs.

### 4. Component-Level Optimization
- Ensure that heavy layout components (like the sidebar or header) use the router context for session data rather than re-triggering hooks that might initiate new fetches.
