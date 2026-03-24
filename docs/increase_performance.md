# 🚀 Performance Optimization Plan — Studio AI (PhotoHeadshot)

> **Goal:** Membuat aplikasi TanStack Start + Nitro yang sudah di-deploy di VPS Jetorbit menjadi **jauh lebih cepat** (TTFB rendah, asset loading kilat, database query efisien).

---

## Ringkasan Temuan (Audit)

| Area | Masalah | Dampak |
|---|---|---|
| **Database** | `src/db.ts` membuat `PrismaPg` tanpa `pg.Pool` — tidak ada connection pooling | Setiap query bisa membuat koneksi baru ke Postgres → **query lambat** |
| **Nginx** | `nginx/photoheadshot.conf` mem-proxy **semua request** ke Node.js, termasuk file statis (.js, .css, gambar) | Node.js jadi sibuk melayani file statis yang seharusnya tidak perlu SSR → **beban CPU tinggi** |
| **Docker Image** | `Dockerfile` meng-copy **seluruh `node_modules`** ke runner stage | Image size membengkak → deploy & restart lebih lambat (OOM risk di 4GB RAM) |
| **Fonts** | Google Fonts dimuat via `<link>` stylesheet di `__root.tsx` (render-blocking) | Browser harus download font sebelum render apapun → **First Contentful Paint lambat** |
| **Bundle Size** | Devtools (`@tanstack/react-devtools`, `react-router-devtools`, `react-query-devtools`) tampak dimuat di production | Bundle JS membesar → **load time lebih panjang untuk user** |
| **Duplikat Prisma** | Ada 2 file inisialisasi Prisma (`src/db.ts` & `src/lib/prisma.ts`) yang keduanya membuat instance terpisah | Potensi koneksi ganda ke database → **resource terbuang** |

---

## Proposed Changes

### 1. Fix Database Connection Pooling ⚡

#### [MODIFY] `src/db.ts`

Ganti inisialisasi `PrismaPg` agar menggunakan `pg.Pool` untuk connection pooling yang efisien:

```diff
+import { Pool } from "pg";
 import { PrismaPg } from "@prisma/adapter-pg";
 import { PrismaClient } from "./generated/prisma/client.js";
 import { requireEnv } from "./lib/env.js";

-const adapter = new PrismaPg({
-  connectionString: requireEnv("DATABASE_URL"),
+const pool = new Pool({
+  connectionString: requireEnv("DATABASE_URL"),
+  max: 10,           // max concurrent connections ke Postgres
+  idleTimeoutMillis: 30000,
+  connectionTimeoutMillis: 5000,
 });
+
+const adapter = new PrismaPg(pool);

 declare global {
   var __prisma: PrismaClient | undefined;
 }

 export const prisma = globalThis.__prisma || new PrismaClient({ adapter });

 if (process.env.NODE_ENV !== "production") {
   globalThis.__prisma = prisma;
 }
```

#### [DELETE or DEPRECATE] `src/lib/prisma.ts`

File ini menduplikasi inisialisasi Prisma tanpa pooling dan tanpa global cache. Semua import harus diarahkan ke `src/db.ts`.

---

### 2. Optimize Nginx — Serve Static Assets Langsung 🏎️

#### [MODIFY] `nginx/photoheadshot.conf`

Tambahkan `location` block khusus untuk file statis agar Nginx melayaninya langsung (bypass Node.js) dengan caching header:

```diff
 server {
     listen 80;
     listen 443 ssl http2;
     server_name yourdomain.com;

     ssl_certificate /etc/ssl/cloudflare/origin.pem;
     ssl_certificate_key /etc/ssl/cloudflare/origin-key.pem;

+    # Gzip compression
+    gzip on;
+    gzip_types text/plain text/css application/json application/javascript text/xml image/svg+xml;
+    gzip_min_length 1000;
+    gzip_vary on;
+
+    # Static assets — served langsung oleh Nginx, bukan Node.js
+    location /assets/ {
+        alias /app/.output/public/assets/;
+        expires 1y;
+        add_header Cache-Control "public, immutable";
+        access_log off;
+    }
+
+    # Favicon dan file publik statis lainnya  
+    location ~* \.(png|jpg|jpeg|gif|ico|svg|webp|woff2?|ttf|eot)$ {
+        root /app/.output/public;
+        expires 30d;
+        add_header Cache-Control "public, no-transform";
+        access_log off;
+    }
+
     location / {
         proxy_pass http://127.0.0.1:3000;
         proxy_http_version 1.1;
         proxy_set_header Upgrade $http_upgrade;
         proxy_set_header Connection 'upgrade';
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         proxy_set_header X-Forwarded-Proto $scheme;
         proxy_cache_bypass $http_upgrade;
     }
 }
```

> [!IMPORTANT]
> Untuk ini, Nginx harus bisa mengakses folder `.output/public` dari container app. Opsi: mount volume yang sama di `docker-compose.prod.yml`, atau jalankan Nginx di host langsung.

---

### 3. Slim Down Docker Image 🐳

#### [MODIFY] `Dockerfile`

Saat ini, **seluruh `node_modules`** (~ratusan MB) dicopy ke runner stage. Nitro seharusnya sudah membundle semua dependency yang dibutuhkan ke dalam `.output`. Yang perlu di-copy hanya module untuk Prisma migrate:

```diff
 # ─── Stage 3: runner ──────────────────────────────────────────────────
 FROM node:24-alpine AS runner

-RUN corepack enable && corepack prepare pnpm@latest --activate
-
 WORKDIR /app

 ENV NODE_ENV=production

 COPY --from=builder /app/.output ./.output
 COPY --from=builder /app/prisma ./prisma
 COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
-COPY --from=deps /app/node_modules ./node_modules
-COPY package.json pnpm-lock.yaml ./
+
+# Hanya install Prisma CLI untuk migrasi (production-minimal)
+RUN npm install -g prisma@latest

 COPY docker-entrypoint.sh ./
 RUN chmod +x docker-entrypoint.sh
```

Dan update `docker-entrypoint.sh`:

```diff
 #!/bin/sh
 set -e

 echo "Running database migrations..."
-pnpm prisma migrate deploy
+prisma migrate deploy

 echo "Starting server..."
 exec node .output/server/index.mjs
```

> [!WARNING]
> Perlu ditest apakah `prisma migrate deploy` bisa jalan tanpa `node_modules` penuh. Jika tidak, kita bisa install hanya `prisma` dan `@prisma/client` secara minimal saat build.

---

### 4. Optimize Font Loading (Render-Blocking Fix) ⚡

#### [MODIFY] `src/routes/__root.tsx`

Ubah Google Fonts dari render-blocking `stylesheet` ke `preload` + swap:

```diff
 {
   rel: "preconnect",
   href: "https://fonts.googleapis.com",
 },
 {
   rel: "preconnect",
   href: "https://fonts.gstatic.com",
   crossOrigin: "anonymous",
 },
 {
-  rel: "stylesheet",
-  href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap",
+  rel: "preload",
+  as: "style",
+  href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap",
+},
+{
+  rel: "stylesheet",
+  href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap",
+  media: "print",
+  // @ts-ignore — onLoad swap trick
+  onLoad: "this.media='all'",
 },
```

> [!NOTE]
> Untuk font loading yang optimal di TanStack Start, kamu juga bisa pertimbangkan untuk **self-host fonts** menggunakan `@fontsource` di masa depan, sehingga tidak ada external request sama sekali.

---

### 5. Remove DevTools dari Production Bundle 🗑️

#### [MODIFY] `src/routes/__root.tsx`

Wrap devtools di environment check agar distrip saat build production:

```diff
-<TanStackDevtools
-  config={{ position: "bottom-right" }}
-  plugins={[
-    { name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> },
-    TanStackQueryDevtools,
-  ]}
-/>
+{process.env.NODE_ENV !== "production" && (
+  <TanStackDevtools
+    config={{ position: "bottom-right" }}
+    plugins={[
+      { name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> },
+      TanStackQueryDevtools,
+    ]}
+  />
+)}
```

> [!NOTE]
> TanStack devtools mungkin sudah di-tree-shake saat production, tapi lebih baik eksplisit di-exclude untuk memastikan bundle size minimal.

---

### 6. SSR Caching — ISR & Streaming SSR 🧊

> Berdasarkan best practices dari **`tanstack-start-best-practices`** skill rules: `ssr-prerender` dan `ssr-streaming`.

#### 6a. ISR (Incremental Static Regeneration) via `setHeaders`

Untuk halaman yang kontennya jarang berubah (landing page `/`), tambahkan `Cache-Control` headers agar response HTML di-cache oleh CDN/Nginx dan tidak perlu di-SSR ulang setiap request.

##### [MODIFY] `src/routes/index.tsx`

```diff
+import { setHeaders } from "@tanstack/react-start/server";
 import { createFileRoute, Link } from "@tanstack/react-router";

-export const Route = createFileRoute("/")({ component: App });
+export const Route = createFileRoute("/")({
+  loader: async () => {
+    // Cache landing page selama 1 jam, serve stale sambil revalidate 6 jam
+    setHeaders({
+      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=21600",
+    });
+  },
+  component: App,
+});
```

**Bagaimana ini bekerja:**
```
Request 1  → SSR penuh (render HTML, simpan di cache)
Request 2-N (dalam 1 jam) → Langsung serve dari cache (INSTANT!)
Setelah 1 jam → Serve stale HTML, render baru di background
Setelah 6 jam → SSR penuh lagi
```

##### [MODIFY] `src/routes/studio.tsx` — Explicit NO-CACHE

Halaman studio bersifat user-specific, jadi **harus** eksplisit di-mark sebagai `private`:

```diff
 export const Route = createFileRoute("/studio")({
   beforeLoad: async () => {
+    setHeaders({
+      "Cache-Control": "private, no-store",
+    });
     const session = await getSessionFn();
     // ... existing auth logic
   },
 });
```

#### 6b. Streaming SSR dengan Suspense (untuk halaman Studio)

Jika halaman `/studio/*` memiliki banyak data (list headshots, stats, dsb), gunakan **Streaming SSR** agar user cepat melihat UI shell sementara data masih loading:

**Prinsip:**
- **`await`** hanya data yang **wajib** tampil di atas layar (above-the-fold / critical)
- **`prefetchQuery`** (tanpa await) untuk data sekunder → akan di-stream via `<Suspense>`

```tsx
// Contoh pattern di route loader:
export const Route = createFileRoute("/studio/")({
  loader: async ({ context: { queryClient } }) => {
    // Critical — harus siap sebelum HTML dikirim
    await queryClient.ensureQueryData(userQueries.profile());

    // Non-critical — mulai fetch, tapi jangan tunggu
    queryClient.prefetchQuery(headshottQueries.list());
    queryClient.prefetchQuery(statsQueries.usage());

    // TTFB: hanya secepat profile query (~100ms)
    // bukan menunggu semua query selesai (~500ms+)
  },
  component: StudioDashboard,
});

// Component:
function StudioDashboard() {
  const { data: user } = useSuspenseQuery(userQueries.profile());

  return (
    <div>
      <Header user={user} /> {/* Muncul langsung */}

      <Suspense fallback={<HeadshotGridSkeleton />}>
        <HeadshotGrid />  {/* Di-stream saat ready */}
      </Suspense>

      <Suspense fallback={<UsageStatsSkeleton />}>
        <UsageStats />    {/* Di-stream saat ready */}
      </Suspense>
    </div>
  );
}
```

#### 6c. Nginx Proxy Cache untuk SSR HTML

Tambahkan caching di level Nginx sehingga HTML yang sudah di-render bisa di-serve tanpa mengenai Node.js sama sekali:

##### [MODIFY] `nginx/photoheadshot.conf`

```diff
+# Di luar block server {}
+proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=ssr_cache:10m max_size=100m inactive=60m;
+
 server {
     # ... existing config ...

     location / {
+        proxy_cache ssr_cache;
+        proxy_cache_valid 200 10m;
+        proxy_cache_use_stale error timeout updating;
+        add_header X-Cache-Status $upstream_cache_status;
+
         proxy_pass http://127.0.0.1:3000;
         # ... existing proxy headers ...
     }
 }
```

> [!NOTE]
> Nginx proxy cache akan menghormati `Cache-Control` header dari Node.js. Jadi halaman `/studio/*` yang di-set `private, no-store` tidak akan di-cache oleh Nginx, sementara landing page `/` yang di-set `s-maxage=3600` akan otomatis di-cache.

---

## Prioritas Implementasi

| Prioritas | Perubahan | Effort | Impact |
|---|---|---|---|
| 🔴 P0 | Fix `pg.Pool` di `db.ts` | 5 menit | **Sangat tinggi** — database jauh lebih responsif |
| 🔴 P0 | Nginx static assets + proxy cache | 10 menit | **Sangat tinggi** — Node.js hanya handle SSR miss |
| 🔴 P0 | ISR `Cache-Control` di landing page | 5 menit | **Sangat tinggi** — landing page instan dari cache |
| 🟡 P1 | Slim down Docker image | 15 menit | **Tinggi** — deploy lebih cepat, RAM lebih hemat |
| 🟡 P1 | Font loading optimization | 5 menit | **Medium** — FCP lebih cepat |
| 🟡 P1 | Streaming SSR di studio routes | 15 menit | **Tinggi** — TTFB studio route jauh lebih cepat |
| 🟢 P2 | Hapus devtools dari production | 5 menit | **Medium** — bundle JS lebih kecil |
| 🟢 P2 | Konsolidasi file Prisma duplikat | 5 menit | **Low** — prevent koneksi ganda |

---

## Verification Plan

### Automated / Semi-Automated
1. **Build test**: Jalankan `pnpm build` setelah perubahan untuk memastikan tidak ada error
2. **Docker build test**: `docker build -t photoheadshot-test .` → pastikan image berhasil built dan ukurannya lebih kecil

### Manual Verification (oleh User)
1. **Deploy ke VPS** → akses website → bandingkan kecepatan sebelum dan sesudah
2. **Cek Nginx**: `curl -I https://yourdomain.com/assets/client.js` → pastikan header `Cache-Control: public, immutable` dan `Content-Encoding: gzip` muncul
3. **Cek bundle size**: Di browser DevTools (Network tab), bandingkan total JS yang didownload sebelum/sesudah
4. **Lighthouse test**: Run Lighthouse audit di Chrome DevTools → target skor Performance > 80
