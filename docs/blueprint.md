# **Nama Aplikasi**: ScentPOS

## Tujuan Aplikasi

ScentPOS dirancang sebagai solusi Point of Sale (POS) yang komprehensif untuk bisnis wewangian, dengan fokus melayani dua model bisnis utama:
1.  **Toko Parfum Isi Ulang (Refill)**: Mengelola kompleksitas penjualan parfum kustom, termasuk pencampuran bahan baku, manajemen inventaris bibit parfum, pelarut, dan botol.
2.  **Toko Parfum Jadi**: Mengelola penjualan produk parfum yang sudah jadi dalam kemasan, melacak stok produk siap jual, dan mengelola Harga Pokok Penjualan (HPP).

Aplikasi ini bertujuan untuk menyatukan kedua operasi tersebut dalam satu platform yang mulus dan intuitif, memberikan kontrol penuh atas penjualan, inventaris, dan keuangan untuk kedua jenis usaha.

## Arsitektur Backend & Database: Supabase

Untuk mendukung skalabilitas dan keandalan, ScentPOS akan menggunakan **Supabase** sebagai Backend as a Service (BaaS). Ini memungkinkan pengembangan yang cepat sambil menyediakan fondasi yang kuat.

-   **Supabase Database (PostgreSQL)**: Seluruh data aplikasi, mulai dari produk, inventaris, transaksi, hingga pengguna, akan disimpan dalam database PostgreSQL yang dikelola oleh Supabase. Keamanan data akan dijamin menggunakan **Row Level Security (RLS)**, di mana setiap pengguna hanya dapat mengakses data yang relevan dengan perannya dan organisasinya.
-   **Supabase Auth**: Mengelola seluruh siklus otentikasi pengguna, termasuk pendaftaran, login, dan manajemen sesi. Terintegrasi secara erat dengan RLS untuk memastikan bahwa kueri database selalu berjalan dalam konteks pengguna yang terotentikasi.
-   **Supabase Storage**: Digunakan untuk menyimpan aset media, terutama gambar produk, dengan kebijakan akses yang aman untuk memastikan hanya pengguna yang berwenang yang dapat mengunggah atau mengakses file.
-   **Supabase Edge Functions**: Untuk logika sisi server yang lebih kompleks yang tidak dapat ditangani oleh RLS saja, seperti pemrosesan pembayaran atau integrasi pihak ketiga, akan diimplementasikan menggunakan fungsi serverless ini.

### Struktur Tabel Database Utama di Supabase
-   `organizations`: `id`, `name`, `owner_id (fk to users.id)`
-   `users`: `id (uuid dari auth.users)`, `email`, `role`, `organization_id (fk to organizations.id)`
-   `products`: `id`, `name`, `cogs`, `price`, `stock`, `image_url`, `organization_id (fk)`
-   `materials`: `id`, `name`, `brand`, `quantity`, `unit`, `category`, `purchase_price`, `organization_id (fk)`
-   `members`: `id`, `name`, `email`, `phone`, `transaction_count`, `organization_id (fk)`
-   `transactions`: `id`, `created_at`, `total_amount`, `member_id (fk)`, `user_id (fk)`
-   `transaction_items`: `id`, `transaction_id (fk)`, `product_id (fk)`, `material_id (fk)`, `quantity`, `price`
-   `expenses`: `id`, `date`, `category`, `description`, `amount`, `organization_id (fk)`
-   `shifts`: `id`, `start_time`, `end_time`, `start_cash`, `end_cash`, `user_id (fk)`

## Fitur Inti:

- Otentikasi Pengguna: Login berbasis peran (dikelola oleh Supabase Auth).
- Pencatatan Penjualan: Mencatat penjualan parfum kustom dan jadi ke database Supabase.
- Alat Inventaris Cerdas: Alat bertenaga AI yang menyarankan bahan optimal berdasarkan data inventaris dari Supabase.
- Manajemen Shift: Mencatat data shift ke tabel `shifts`.
- Sistem Promosi: Menerapkan promosi pada transaksi.
- Laporan Laba Rugi: Menghitung laba/rugi berdasarkan data dari tabel `transactions`, `expenses`, dan `products`.
- Dukungan Multibahasa: Dukungan untuk Bahasa Inggris dan Bahasa Indonesia.

## Panduan Gaya:

- Warna Primer: Lavender lembut (#D0B4DE).
- Warna Latar Belakang: Abu-abu sangat terang (#F5F5F5).
- Warna Aksen: Emas kusam (#C4B38A).
- Font Tubuh: 'PT Sans'.
- Font Judul: 'Playfair'.
- Gunakan ikon garis minimalis.
- Tekankan ruang putih dan tata letak berbasis grid.

## Perencanaan Masa Depan:

- **Peningkatan Kemampuan AI**: Manajemen inventaris prediktif dan rekomendasi wewangian yang dipersonalisasi.
- **Pelaporan dan Analitik Tingkat Lanjut**: Segmentasi pelanggan dan pelacakan kinerja pemasok.
- **Integrasi E-commerce**: Toko online dengan sinkronisasi inventaris real-time.
- **Manajemen Multi-outlet**: Kontrol terpusat untuk bisnis dengan banyak cabang.
- **Ekspansi Program Loyalitas**: Sistem loyalitas berjenjang dan hadiah otomatis.
- **Integrasi Gerbang Pembayaran**: Mendukung lebih banyak opsi pembayaran, termasuk pembayaran tanpa kontak.
- **Optimasi Rantai Pasokan**: Pemesanan ulang otomatis dan pelacakan batch/kedaluwarsa.
- **Peningkatan UI/UX**: Dasbor yang dapat disesuaikan dan mode offline.
