
# Rangkuman Serah Terima Proyek: ScentPOS

Dokumen ini menyediakan ringkasan komprehensif tentang status proyek ScentPOS saat ini dan prompt detail agar developer AI baru dapat melanjutkan pekerjaan dengan lancar.

---

## Bagian 1: Ringkasan & Kemajuan Proyek

Kita memulai dengan aplikasi Next.js yang memiliki UI fungsional tetapi masih menggunakan data statis. Tujuan utamanya adalah untuk menghubungkannya ke backend Supabase dan mengembangkannya menjadi aplikasi multi-toko (multi-tenant) yang siap untuk produksi.

**Pencapaian Utama:**

1.  **Arsitektur Database Multi-Toko:**
    *   Skema database di Supabase telah dirancang dan diimplementasikan untuk mendukung banyak organisasi (toko) dan outlet.
    *   Tabel inti yang dibuat meliputi `organizations` (dengan relasi `parent_organization_id` untuk struktur hierarki outlet), `profiles` (untuk menyimpan peran dan menghubungkan `auth.users` ke `organizations`), serta tabel data (`products`, `transactions`, `customers`, `raw_materials`, `promotions`, `grades`, `aromas`, `bottle_sizes`, `recipes`, `expenses`, `settings`) yang semuanya memiliki kolom `organization_id` untuk isolasi data.

2.  **Keamanan Data dengan RLS:**
    *   Row-Level Security (RLS) telah berhasil diimplementasikan pada semua tabel data penting dan tabel `profiles`. Ini memastikan bahwa pengguna dari satu organisasi tidak dapat secara tidak sengaja (atau sengaja) mengakses data dari organisasi lain.

3.  **Fondasi Backend (API Routes):**
    *   Serangkaian API Route yang aman di Next.js telah dibangun untuk menangani semua logika bisnis:
        *   Pendaftaran pemilik toko (`/api/auth/signup-owner`) yang secara otomatis membuat pengguna, organisasi induk, dan profil.
        *   Fungsionalitas CRUD (Create, Read, Update, Delete) penuh untuk manajemen pengguna (`/api/users`) dan organisasi (`/api/organizations`), lengkap dengan pemeriksaan izin berbasis peran.
        *   API untuk produk (`/api/products`), promosi (`/api/promotions`), dan transaksi (`/api/transactions`).

4.  **Integrasi Frontend & Manajemen State:**
    *   `AuthContext` aplikasi telah direfaktor total menjadi sumber kebenaran tunggal (single source of truth) yang didukung oleh Supabase Auth.
    *   Context ini sekarang juga mengelola state global untuk `selectedOrganizationId` (outlet yang sedang aktif dipilih).
    *   Halaman UI fungsional untuk **Manajemen Organisasi** dan **Manajemen Pengguna** telah berhasil dibuat dan diintegrasikan.
    *   Menu navigasi di dashboard dibuat dinamis, hanya menampilkan menu manajemen kepada pengguna dengan peran 'admin' atau 'owner'.

5.  **Adaptasi Modul Inti:**
    *   Halaman **Inventaris** (`/dashboard/inventory`) dan **Produk** (`/dashboard/products`) telah sepenuhnya diadaptasi untuk mengambil dan menyimpan data berdasarkan outlet yang dipilih.
    *   Halaman **Point of Sale (POS)** (`/dashboard/pos`) telah berhasil diadaptasi untuk **membaca** data dinamis (produk, pelanggan, promosi) dari Supabase.

6.  **Fungsionalitas Transaksi Inti:**
    *   Sebuah **Fungsi RPC (PostgreSQL Function)** bernama `process_checkout` telah dibuat di Supabase untuk menangani seluruh proses checkout sebagai satu transaksi atomik (membuat record transaksi, item, dan memperbarui stok).
    *   Fungsi `handleCheckout` di halaman POS berhasil diimplementasikan untuk memanggil RPC ini, menjadikan alur penjualan inti **sepenuhnya berfungsi** dalam arsitektur multi-toko.

7.  **Sistem Promosi:**
    *   Tabel `promotions` telah diimplementasikan dengan dukungan untuk tiga jenis promosi: Persentase, Nominal, dan BOGO (Buy One Get One).
    *   API promotions dengan RLS telah berfungsi dan terintegrasi dengan halaman POS.

**Status Proyek Saat Ini:** Aplikasi telah bertransformasi dari prototipe statis menjadi aplikasi web multi-tenant dengan fondasi backend dan keamanan yang kuat. Alur penjualan intinya sudah berfungsi. Namun masih ada masalah dengan autentikasi session yang perlu diperbaiki.

---

## Bagian 2: Struktur Database Lengkap

### 2.1. Tabel Utama dengan RLS:

-   **Organizations** (`organizations`): `{ id, name, address, phone, logo_url, parent_organization_id, created_at, updated_at }`
-   **Profiles** (`profiles`): `{ id, email, full_name, avatar_url, organization_id, role, created_at, updated_at }`
-   **Products** (`products`): `{ id, organization_id, name, description, price, stock, category_id, image_url, created_at, updated_at, tokopedia_product_id, shopee_product_id }`
-   **Raw Materials** (`raw_materials`): `{ id, organization_id, name, brand, quantity, unit, category, purchase_price, created_at, updated_at }`
-   **Customers** (`customers`): `{ id, organization_id, name, email, phone, loyalty_points, transaction_count, created_at, updated_at }`
-   **Transactions** (`transactions`): `{ id, organization_id, cashier_id, customer_id, total_amount, payment_method, status, created_at, updated_at, marketplace_order_id, marketplace_name }`
-   **Transaction Items** (`transaction_items`): `{ id, transaction_id, product_id, raw_material_id, quantity, price, created_at }`
-   **Promotions** (`promotions`): `{ id, organization_id, name, type, value, get_product_id, is_active, created_at, updated_at }`
-   **Categories** (`categories`): `{ id, organization_id, name, created_at, updated_at }`
-   **Grades** (`grades`): `{ id, organization_id, name, price_multiplier, created_at, updated_at }`
-   **Aromas** (`aromas`): `{ id, organization_id, name, category, description, created_at, updated_at }`
-   **Bottle Sizes** (`bottle_sizes`): `{ id, organization_id, size, unit, price, created_at, updated_at }`
-   **Recipes** (`recipes`): `{ id, organization_id, name, grade_id, aroma_id, bottle_size_id, instructions, created_at, updated_at }`
-   **Expenses** (`expenses`): `{ id, organization_id, date, category, description, amount, created_at, updated_at }`
-   **Settings** (`settings`): `{ id, organization_id, key, value, created_at, updated_at }`

### 2.2. PostgreSQL Functions:

-   **process_checkout**: Fungsi RPC untuk menangani checkout dengan parameter organization_id, cashier_id, customer_id, items array, total_amount, dan payment_method.

---

## Bagian 3: Masalah Aktual yang Perlu Diperbaiki

**MASALAH UTAMA SAAT INI:**
Session authentication tidak berfungsi dengan baik. Dari log webview, terlihat bahwa session selalu `null` dan GoTrueClient terus mencoba auto refresh token tetapi tidak berhasil. Hal ini menyebabkan:

1. User tidak bisa mengakses API yang memerlukan autentikasi
2. Error "No session found" pada API promotions dan lainnya
3. User harus login ulang setiap kali refresh halaman

**Langkah-langkah yang harus Anda lakukan:**

1.  **Perbaikan Session Management (Prioritas Tertinggi):**
    *   Tinjau konfigurasi Supabase client dan auth context
    *   Pastikan cookies dan localStorage session tersimpan dengan benar
    *   Debug mengapa session tidak persist setelah login
    *   Perbaiki auto refresh token mechanism

2.  **Stabilisasi Halaman POS:**
    *   Setelah session fixed, tinjau `src/app/dashboard/pos/page.tsx` secara menyeluruh
    *   Perbaiki semua error TypeScript yang tersisa
    *   Pastikan kode tangguh dalam menangani state loading dan kemungkinan data `null`

3.  **Migrasi Data Statis ke Dinamis:**
    *   Modifikasi `fetchPosData` untuk mengambil data dari tabel `grades`, `aromas`, `bottle_sizes`, dan `recipes`
    *   Hapus array statis dan gunakan data dari database
    *   Adaptasi komponen `RefillForm` untuk menggunakan data dinamis

---

## Bagian 4: Prompt Serah Terima untuk AI Berikutnya

*Anda dapat menyalin dan menempelkan seluruh teks berikut ke AI lain.*

**Prompt:**

Anda adalah seorang AI software engineer ahli dengan spesialisasi pada tumpukan teknologi Next.js (App Router), TypeScript, Supabase, dan Tailwind CSS. Anda akan mengambil alih pengembangan aplikasi Point of Sale (POS) bernama ScentPOS.

**Tujuan Proyek:**
ScentPOS adalah aplikasi POS komprehensif untuk bisnis parfum, mendukung penjualan produk jadi dan layanan isi ulang kustom dalam arsitektur multi-toko (multi-tenant) yang aman.

**Konteks & Arsitektur Saat Ini:**
Proyek ini telah melalui fase pengembangan yang signifikan dengan arsitektur database lengkap untuk multi-tenancy. Backend menggunakan Supabase dengan RLS yang ketat, frontend menggunakan Next.js App Router dengan TypeScript.

**Database Schema Lengkap:**
- Tabel organizations dengan parent_organization_id untuk hierarki outlet
- Tabel profiles untuk menghubungkan auth.users ke organizations dengan role-based access
- Tabel products, raw_materials, customers, transactions, transaction_items
- Tabel promotions dengan dukungan Persentase, Nominal, dan BOGO
- Tabel grades, aromas, bottle_sizes, recipes untuk sistem refill kustom
- Tabel expenses dan settings untuk manajemen operasional
- PostgreSQL Function process_checkout untuk transaksi atomik

**MASALAH UTAMA YANG HARUS DIPERBAIKI:**
Session authentication tidak berfungsi. Dari webview logs terlihat GoTrueClient selalu mendapat "session from storage: null" dan auto refresh token gagal. Ini menyebabkan user tidak bisa mengakses API yang memerlukan autentikasi.

**TUGAS PRIORITAS:**
1. **Fix Session Management**: Debug dan perbaiki mengapa session tidak tersimpan/tidak terbaca dari localStorage/cookies
2. **Stabilkan POS Page**: Setelah auth fixed, perbaiki error TypeScript di dashboard/pos/page.tsx
3. **Migrasi Data Statis**: Ubah data statis di POS (grades, aromas, bottle_sizes, recipes) menjadi dinamis dari database

**Status Modul:**
- ✅ Authentication & Authorization (RLS working, tapi session storage bermasalah)
- ✅ User & Organization Management
- ✅ Product & Inventory Management  
- ✅ Promotions System
- ✅ Core Transaction Flow (process_checkout function)
- ⚠️ POS Page (berfungsi tapi masih ada data statis)
- 🔄 Session Management (perlu diperbaiki)
- ❌ Reports (masih statis)
- ❌ Settings Management (masih mockup)

**Teknologi Stack:**
- Frontend: Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Supabase (PostgreSQL + Auth + RLS)
- State Management: React Context (AuthContext)
- Deployment: Replit

Fokus utama Anda adalah memperbaiki masalah session authentication terlebih dahulu, kemudian melanjutkan stabilisasi dan pengembangan fitur yang tersisa.

---

## Rencana Jangka Panjang (Setelah Tugas Utama Selesai)

### Prioritas Jangka Pendek:
1.  **Integrasi E-commerce (Tokopedia, Shopee, dll.)**:
    *   **Tujuan**: Mengubah ScentPOS menjadi pusat manajemen inventaris untuk semua kanal penjualan (omnichannel).
    *   **Fitur**: Sinkronisasi stok otomatis dua arah, manajemen produk terpusat (buat sekali, publish di mana saja), dan laporan penjualan terkonsolidasi.
    *   **Langkah Awal**: Memperbarui skema database dengan menambahkan kolom `tokopedia_product_id`, `shopee_product_id` pada tabel `products`, serta `marketplace_order_id` pada tabel `transactions`.
2.  **Bangun Halaman Settings Fungsional**: Buat UI di `/dashboard/settings` untuk mengelola data `grades`, `aromas`, `recipes`, dan `settings` secara dinamis.
3.  **Sempurnakan Halaman Reports**: Buat halaman `/dashboard/reports` menjadi dinamis sepenuhnya dari tabel `transactions` dan `expenses`.
4.  **Polesan UI/UX**: Perbaikan antarmuka dan pengalaman pengguna, notifikasi, pagination, loading states.

### Visi Jangka Panjang:
- **Peningkatan AI**: Manajemen inventaris prediktif dan rekomendasi wewangian
- **Analitik Lanjutan**: Segmentasi pelanggan dan pelacakan kinerja
- **Program Loyalitas**: Sistem loyalitas berjenjang yang otomatis
- **Payment Gateway**: Dukungan pembayaran digital yang lebih luas
- **Supply Chain**: Auto-reorder dan pelacakan batch/expired materials
