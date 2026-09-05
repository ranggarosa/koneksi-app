# Roadmap Pengembangan: MVP Menuju Enterprise Level

Dokumen ini memandu transisi dari arsitektur *serverless* 100% (MVP) menuju infrastruktur *enterprise-grade* dengan GCP dan Firebase.

## Fase 1: Migrasi Fondasi Data & API (Stabilitas & Integritas)
**Tujuan:** Beralih dari NoSQL ke RDBMS untuk integritas relasional dan penguncian transaksi tingkat lanjut.
- **Database:** Migrasi data dari Firestore ke **GCP Cloud SQL (PostgreSQL)**.
- **ORM:** Terapkan **Prisma ORM** atau **Drizzle ORM** untuk manajemen skema relasional (Tabel Pengguna, Surat, Log Persetujuan, dan Master Urutan).
- **Backend API:** Bangun *backend logic* terpisah menggunakan **Next.js Server Actions** atau **NestJS** (di-deploy ke Cloud Run).

## Fase 2: Modernisasi Frontend & Pengamanan Ekstra (Performa & Keamanan)
**Tujuan:** Meningkatkan performa aplikasi dan memperkuat lapis otorisasi.
- **Migrasi Frontend:** Beralih dari React/Vite (SPA) ke framework **Next.js 14/15 (App Router)** untuk *Server-Side Rendering* (SSR) dan manajemen state yang lebih baik.
- **Custom Claims:** Ganti pengecekan role manual di database dengan **Firebase Custom Claims** untuk keamanan otorisasi tingkat token (RBAC).
- **Deployment:** Alihkan *hosting* ke **Firebase App Hosting** yang lebih optimal untuk Next.js.

## Fase 3: Server-Side PDF & Integrasi Notifikasi Async (Skalabilitas)
**Tujuan:** Menghapus beban *client* dalam memproduksi dokumen dan mengatur notifikasi yang andal.
- **Server-Side PDF Render:** Pindahkan tugas pembuatan PDF dari browser (*client-side*) ke **Cloud Functions Gen 2** (menggunakan *Puppeteer/Headless Chrome*). Ini menjamin format presisi tanpa terpengaruh performa perangkat pengguna.
- **Task Queuing:** Implementasikan **GCP Cloud Tasks** untuk menangani antrean proses latar belakang tanpa batas waktu *(background worker)*.
- **Notifikasi Multi-Channel:** Integrasikan *webhook/API* **WhatsApp Gateway** ke dalam Cloud Tasks sebagai pelengkap notifikasi email.
