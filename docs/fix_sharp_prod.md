# Fix: sharp fails to load in production

## Root Cause

Nitro (via Rollup/Vite) is **bundling `sharp` into the output** at `app/.output/server/chunks/build/index-*.mjs`. `sharp` is a native Node.js addon — it loads `.node` binary files at runtime using dynamic `require()`. When Rollup bundles it, the dynamic `require()` paths break and the `.node` binary files are not copied to the output.

This is the same class of problem that `pg` had before (fixed in PR #6 with `ssr.external`).

## Fix — 1 line change

Add `sharp` (and its platform packages) to `ssr.external` in `vite.config.ts` so Nitro treats it as an external dependency and doesn't bundle it:

```ts
// vite.config.ts
ssr: {
  external: ["pg", "@prisma/adapter-pg", "@prisma/client", "sharp"],
},
```

`sharp` will then be loaded from `node_modules` at runtime instead of being bundled, and its `.node` binary resolves correctly.

## Steps

1. Edit `vite.config.ts` — add `"sharp"` to `ssr.external` array
2. Commit and push to `main`
3. CI/CD rebuilds and deploys — no DB changes needed

## Why the Dockerfile change didn't help

The Dockerfile base image fix (`alpine` → `slim`) is still correct and needed for cache hits. The sharp error is a **bundling** problem, not a platform/libc problem. The `.node` binary exists in `node_modules` but Rollup can't include it in the bundle — it must be left external.

## OpenSSL warning (secondary)

The `prisma:warn` about OpenSSL is harmless (migrations still applied successfully) but can be silenced by adding to the runner stage in `Dockerfile`:

```dockerfile
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
```
