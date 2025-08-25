# Rangkuman Serah Terima Proyek: ScentPOS

Dokumen ini menyediakan ringkasan komprehensif tentang status proyek ScentPOS saat ini, arsitektur yang diimplementasikan, dan prompt detail agar developer AI baru dapat melanjutkan pekerjaan dengan lancar.

---

## Bagian 1: Ringkasan & Kemajuan Proyek

Proyek ini telah bertransformasi dari aplikasi Next.js statis menjadi aplikasi web multi-tenant yang berfungsi penuh dengan backend **Firebase**. Tujuannya adalah menjadi sistem Point of Sale (POS) yang komprehensif untuk bisnis parfum.

**Pencapaian Utama:**

1.  **Migrasi Backend ke Firebase:**
    *   Seluruh backend telah dimigrasi dari Supabase ke Firebase.
    *   **Firestore** digunakan sebagai database utama, menggantikan PostgreSQL.
    *   **Firebase Authentication** mengelola semua alur otentikasi pengguna.
    *   **Cloud Functions for Firebase** (ditulis dalam TypeScript) menangani semua logika sisi server yang aman, seperti pembuatan/penghapusan pengguna dan kalkulasi analitik.

2.  **Arsitektur Multi-Tenancy Fungsional:**
    *   Struktur data di Firestore mendukung banyak organisasi (toko) dan outlet.
    *   Setiap dokumen data (produk, pelanggan, dll.) memiliki `organization_id` untuk memastikan isolasi data.

3.  **Fondasi Backend (Cloud Functions):**
    *   Serangkaian Cloud Functions yang aman telah dibuat untuk menangani logika bisnis:
        *   Pendaftaran pemilik toko (`createOwner`) yang secara otomatis membuat pengguna di Auth, dan dokumen profil & organisasi di Firestore.
        *   Manajemen pengguna (`createUser`, `deleteUser`) yang terintegrasi dengan Firebase Auth.
        *   Fungsi untuk mengambil data analitik dasbor (`getDashboardAnalytics`).
        *   Fungsi untuk melakukan setup data awal (`setupInitialData`) untuk organisasi baru.

4.  **Integrasi Frontend & Manajemen State:**
    *   `AuthContext` menjadi sumber kebenaran tunggal (single source of truth) untuk sesi pengguna, profil, dan outlet yang dipilih, didukung oleh Firebase Auth.
    *   Halaman UI fungsional untuk **Manajemen Pengguna** dan semua modul data lainnya (Produk, Inventaris, Anggota) telah berhasil diintegrasikan dengan Firestore.
    *   Menu navigasi di dasbor bersifat dinamis berdasarkan peran pengguna (`owner`, `admin`, `cashier`).
    *   Kemampuan untuk beralih antar outlet berfungsi dengan baik.

**Status Proyek Saat Ini:** Aplikasi ini adalah aplikasi web multi-tenant yang stabil dengan fondasi backend Firebase yang kuat. Alur otentikasi, manajemen data, dan fungsionalitas inti lainnya sudah berfungsi.

---

## Bagian 2: Struktur Database di Firestore (Koleksi Utama)

-   **`organizations`**: `{ name, owner_id, is_setup_complete, created_at, updated_at }`
-   **`profiles`**: (ID Dokumen sama dengan UID Firebase Auth) `{ email, full_name, organization_id, role }`
-   **`products`**: `{ organization_id, name, description, price, stock, image_url }`
-   **`raw_materials`**: `{ organization_id, name, brand, quantity, unit, category, purchase_price }`
-   **`customers`**: `{ organization_id, name, email, phone, loyalty_points, transaction_count }`
-   **`transactions`**: `{ organization_id, cashier_id, customer_id, total_amount, payment_method, status }`
-   **`grades`**: `{ organization_id, name, price_multiplier, extra_essence_price }`

---

## Bagian 3: Prompt Serah Terima untuk AI Berikutnya

*Anda dapat menyalin dan menempelkan seluruh teks berikut ke AI lain.*

**Prompt:**

Anda adalah seorang AI software engineer ahli dengan spesialisasi pada tumpukan teknologi Next.js (App Router), TypeScript, Firebase, dan Tailwind CSS. Anda akan mengambil alih pengembangan aplikasi Point of Sale (POS) bernama ScentPOS.

**Tujuan Proyek:**
ScentPOS adalah aplikasi POS komprehensif untuk bisnis parfum, mendukung penjualan produk jadi dan layanan isi ulang kustom dalam arsitektur multi-toko (multi-tenant) yang aman menggunakan Firebase sebagai backend.

**Konteks & Arsitektur Saat Ini:**
Proyek ini telah stabil setelah migrasi penuh ke Firebase. Backend menggunakan Firestore sebagai database, Firebase Authentication untuk otentikasi, dan Cloud Functions untuk logika sisi server.

**Koleksi Database Utama di Firestore:**
- `organizations`: Menyimpan data toko.
- `profiles`: Menyimpan data pengguna, terhubung ke Firebase Auth.
- `products`, `raw_materials`, `customers`, `transactions`, `grades`.

**Cloud Functions yang Ada:**
- `createOwner`: Untuk pendaftaran pemilik baru.
- `createUser`, `deleteUser`: Untuk manajemen staf.
- `setupInitialData`: Untuk mengisi data awal organisasi.
- `getDashboardAnalytics`: Untuk mengambil data KPI dasbor.

**Tugas Selanjutnya yang Disarankan:**
1.  **Implementasi Halaman Laporan**: Bangun halaman `/dashboard/reports` agar menjadi dinamis sepenuhnya, mengambil data dari koleksi `transactions` dan `expenses` di Firestore.
2.  **Fungsionalisasikan Halaman POS**: Halaman `/dashboard/pos` saat ini masih menggunakan data statis untuk checkout. Implementasikan fungsi untuk:
    - Menyimpan transaksi ke Firestore.
    - Mengurangi stok dari `products` dan `raw_materials` setelah transaksi berhasil. Ini idealnya dilakukan melalui Cloud Function untuk memastikan atomisitas.
3.  **Polesan UI/UX**: Lakukan perbaikan antarmuka dan pengalaman pengguna secara umum, seperti menambahkan notifikasi yang lebih baik, state loading yang konsisten, dan pagination untuk tabel data.

**Teknologi Stack:**
- Frontend: Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Firebase (Firestore, Firebase Auth, Cloud Functions)
- State Management: React Context (AuthContext)
