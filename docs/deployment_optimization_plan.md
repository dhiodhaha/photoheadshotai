# Deployment Optimization Plan

## Latar Belakang
Saat ini deployment mengonsumsi bandwidth inbound yang sangat besar (bisa lebih dari 8GB setiap kali deploy) di VPS. Hal ini disebabkan oleh Docker image yang menyertakan folder `node_modules` (termasuk dev dependencies yang berat) secara utuh pada image produksi, sehingga setiap kali ada perubahan kode, VPS harus men-download ulang layer ratusan MB (bahkan lebih) dari GitHub Container Registry (GHCR).

## Objektif
Mencapai "Incremental Deployment" di mana VPS hanya men-download *delta* atau perubahan kode aplikasinya saja (khususnya untuk aplikasi berbasis Nitro/TanStack Start), menghemat penggunaan inbound traffic VPS secara drastis (hingga 90%+ penghematan bandwidth).

## Strategi: Optimized Docker + Build Cache

Kombinasi ini dipilih karena mempertahankan reliabilitas existing infrastructure (Docker Compose) tanpa perlu rombak environment VPS (seperti install PM2 secara manual), namun bisa mencapai efisiensi pengiriman data yang sama dengan `rsync`.

### Fase 1: Optimasi `Dockerfile` (Multi-stage Build yang Benar)
Mengubah struktur Dockerfile menjadi beberapa stage yang terisolasi dengan baik:
1.  **Deps Stage**: Install semua package (termasuk dev dependencies) untuk keperluan build aplikasi.
2.  **Prod-Deps Stage**: Install *hanya* production dependencies yang benar-benar dipakai di runtime. Menggunakan cache untuk layer ini.
3.  **Builder Stage**: Mem-build aplikasi (menghasilkan folder `.output` dari Nitro).
4.  **Runner Stage (Final Image)**: Membawa OS Alpine dasar, *hanya* production dependencies (dari stage 2), dan kode hasil build (`.output` dari stage 3). Khusus Nitro Prisma, binary database engine juga dicopy ke sini.

### Fase 2: Implementasi Docker Registry Cache di GitHub Actions
Menambahkan `cache-from` dan `cache-to` pada file `.github/workflows/deploy.yml`. 
Ini memastikan layer Node.js dan `node_modules` di-cache di GHCR. Jika ada deployment baru yang cuma merubah kode Frontend/Backend, GitHub Actions hanya akan build layer `.output`-nya saja. Dan VPS cuma akan nge-pull layer `.output` itu (ukuran cuma sekitar 5-15MB).

---

## Downsides & Pitfalls
- **Kompleksitas**: Dockerfile multi-stage sedikit lebih sulit dibaca dan di-debug jika aplikasi gagal berjalan.
- **Initial Build**: Build pertama kali di CI akan memakan waktu lebih lama untuk membuat dan mengunggah cache registry.
- **Konfigurasi Prisma**: Nitro + Prisma itu sedikit unik. File binary/engine untuk query database harus secara spesifik disalin ke stage final `runner`, kalau tidak aplikasi akan error saat coba terhubung ke database.

## Skenario Kesuksesan dan Kegagalan

### ✅ Skenario Berhasil (Incremental)
- **Kondisi**: Anda melakukan modifikasi pada satu komponen frontend, misalnya `LandingPage.tsx`. Tidak ada library baru di package.json.
- **CI Build**: Menggunakan cache untuk OS dan `node_modules`. CI hanya merakit folder `.output` (sangat cepat).
- **VPS Pull**: `docker compose pull` melihat sebagian besar layer sudah ada di server. Docker hanya mendownload spesifik layer (layer `.output` sekitar 5-10MB).
- **Hasil**: Pengurangan inbound traffic ekstrim (menjadi beberapa MB saja).

### ❌ Skenario Gagal 1: Common Cache Busting
- **Kondisi**: Instruksi `COPY . .` diletakkan di bagian atas Dockerfile, sebelum baris eksekusi `pnpm install`.
- **Hasil**: Karena kodenya berubah, Docker menganggap seluruh cache setelahnya hangus. CI akan meng-install seluruh dependencies dari nol, dan image menjadi berbeda dari atas sampai bawah. VPS akan men-download layer `node_modules` yang besar lagi tiap kali ada push.

### ❌ Skenario Gagal 2: Fatal Prisma Error
- **Kondisi**: Berhasil memisahkan production dependencies, namun lupa bahwa Prisma butuh engine. Lupa menyalin generated prisma client atau engine binary ke stage runner.
- **Hasil**: Image berhasil di-build, deploy cepat, tapi aplikasi container langsung crash atau error *Internal Server Error 500* karena "PrismaClient initialization error".

---

## Verifikasi dan Metrik Keberhasilan
-  Lihat log di Github Action, pastikan ada tulisan indikasi bahwa Docker menggunakan layer caching.
-  Gunakan perintah `docker image inspect ghcr.io/<repo>/<image>:latest` di VPS untuk cek ukurannya (seharusnya jauh lebih kecil).
-  Pantau bandwidth control panel VPS setelah deployment dilakukan, memastikan lonjakan inbound traffic benar-benar hilang saat melakukan *hotfix* / perubahan kode kecil.
