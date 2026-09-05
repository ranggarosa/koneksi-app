# PRD: Konfigurasi Awal MVP - Sistem Manajemen Surat Menyurat

## 1. Tujuan
Membangun Minimum Viable Product (MVP) untuk sistem otomatisasi pembuatan dan persetujuan surat resmi dengan siklus pengembangan yang cepat dan efisien.

## 2. Tech Stack (MVP Serverless)
- **Frontend:** React.js (Vite) + Tailwind CSS
- **Database:** Firebase Cloud Firestore (NoSQL)
- **Authentication:** Firebase Auth (Google Sign-In)
- **Storage:** Cloud Storage for Firebase (Arsip PDF & Gambar Tanda Tangan)
- **Hosting:** Firebase Hosting
- **PDF Engine:** Client-side rendering (seperti `html2pdf.js` atau `@react-pdf/renderer`)
- **Notifikasi:** Firebase Trigger Email Extension / EmailJS (Fokus pada notifikasi Email)

## 3. Fitur Utama
1. **Autentikasi & Role:** Login menggunakan akun Google. Role pengguna (Drafter, Reviewer, Approver) diatur secara sederhana melalui collection `users` di Firestore.
2. **Pembuatan Surat:** Antarmuka form dinamis bagi Drafter untuk membuat draft surat berdasarkan variabel/template.
3. **Penomoran Dinamis (Pencegahan Race Condition):** Menggunakan fitur *Firestore Transactions* yang menargetkan dokumen khusus `counters` untuk melakukan *auto-increment* penomoran surat yang aman.
4. **Workflow Persetujuan:** Status dokumen diperbarui secara berjenjang (`Draft` -> `In Review` -> `Approved` / `Rejected`).
5. **Injeksi Tanda Tangan & PDF Final:** Tanda tangan ditambahkan otomatis saat otorisasi akhir. Dokumen kemudian di-render menjadi PDF di browser (client-side) lalu diunggah ke Firebase Storage.

## 4. Struktur Database Skala MVP (Firestore Collections)
- `users`: Menyimpan profil, email, dan level peran (role) pengguna.
- `letters`: Menyimpan isi surat, array urutan persetujuan (reviewer/approver IDs), metadata, status saat ini, dan tautan PDF akhir.
- `counters`: Menyimpan angka urut terakhir per departemen/bulan/tahun.
