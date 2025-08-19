
# Prompt Master untuk Pengembangan Aplikasi ScentPOS dengan Flutter

Anda adalah seorang AI software engineer ahli dengan spesialisasi pengembangan aplikasi mobile menggunakan Flutter dan integrasi dengan backend Supabase.

## Tujuan Utama

Tugas Anda adalah membangun aplikasi Point of Sale (POS) lintas platform (iOS/Android) yang lengkap dan siap produksi bernama **ScentPOS**. Aplikasi ini akan menjadi klien untuk backend Supabase yang sudah ada.

---

## 1. Tumpukan Teknologi & Arsitektur

*   **Framework Frontend**: Flutter (versi stabil terbaru).
*   **Manajemen State**: Gunakan `flutter_bloc` untuk arsitektur yang skalabel dan teruji.
*   **Backend**: Supabase. Aplikasi Flutter akan berinteraksi dengan Supabase menggunakan paket `supabase_flutter`.
*   **Navigasi**: Gunakan `GoRouter` untuk manajemen rute yang kuat.
*   **UI**: Desain antarmuka yang bersih, modern, dan responsif. Anda dapat menggunakan paket seperti `flutter_staggered_grid_view` untuk katalog produk.
*   **Dependensi Penting**:
    *   `supabase_flutter`: Untuk interaksi dengan Supabase.
    *   `flutter_bloc`: Untuk manajemen state.
    *   `go_router`: Untuk navigasi.
    *   `intl`: Untuk format mata uang dan tanggal.
    *   `equatable`: Untuk perbandingan objek dalam BLoC.

**PENTING**: Backend Supabase (Database, Otentikasi, RLS, Functions) **SUDAH ADA DAN BERFUNGSI**. Aplikasi Flutter ini adalah *headless client*. Jangan membuat ulang logika backend.

---

## 2. Fitur-Fitur Utama yang Harus Dibangun

Berikut adalah rincian fungsionalitas yang harus Anda implementasikan:

### 2.1. Otentikasi & Multi-Tenancy
-   **Halaman Splash/Loading**: Tampilkan layar pemuatan saat memeriksa status sesi otentikasi.
-   **Halaman Login**: Formulir untuk email dan password. Panggil `supabase.auth.signInWithPassword`.
-   **Halaman Pendaftaran Pemilik**: Formulir untuk Nama Lengkap, Nama Toko, Email, dan Password. Panggil fungsi RPC `signup_owner` di Supabase untuk pendaftaran.
-   **Manajemen Sesi**: Gunakan `onAuthStateChange` dari Supabase untuk mengarahkan pengguna secara otomatis (ke dasbor jika login, ke login jika logout).
-   **Pemilihan Outlet**: Setelah login, jika pengguna (misal: 'owner') memiliki akses ke beberapa outlet, sediakan UI (misalnya, `DropdownButton` di `AppBar`) untuk beralih antar outlet. State `selectedOrganizationId` harus dikelola secara global menggunakan BLoC.

### 2.2. Dasbor Utama
-   Tampilkan ringkasan Key Performance Indicators (KPI) seperti pendapatan harian, jumlah penjualan, dan pelanggan baru.
-   Tampilkan grafik penjualan sederhana.
-   Tampilkan notifikasi untuk stok yang menipis.
-   Data ini harus diambil dari database berdasarkan `selectedOrganizationId`.

### 2.3. Point of Sale (POS)
Ini adalah fitur inti. Buat antarmuka kasir yang efisien.
-   **Layout Terpadu**: Gunakan `TabBar` atau sejenisnya untuk beralih antara mode "Produk Jadi" dan "Isi Ulang".
-   **Mode Produk Jadi**:
    -   Tampilkan katalog produk dalam bentuk grid yang menarik (`StaggeredGridView` atau `GridView`).
    -   Setiap item produk dapat diketuk untuk ditambahkan ke keranjang.
    -   Implementasikan fitur pencarian produk.
-   **Mode Isi Ulang (Refill)**:
    -   Buat formulir bertingkat (multi-step) yang memandu kasir:
        1.  Pilih Grade Parfum.
        2.  Pilih Aroma (disaring berdasarkan Grade).
        3.  Pilih Ukuran Botol.
        4.  (Opsional) Sesuaikan jumlah bibit.
    -   Harga harus dihitung secara dinamis berdasarkan pilihan di atas.
-   **Keranjang Belanja (Cart)**:
    -   Tampilkan daftar item yang ditambahkan.
    -   Fungsi untuk menambah/mengurangi kuantitas atau menghapus item.
    -   Terapkan promosi (diskon persentase/nominal atau BOGO).
    -   Hitung subtotal, diskon, pajak, dan total akhir.
-   **Proses Checkout**:
    -   Pilih pelanggan dari daftar yang ada atau tambahkan pelanggan baru.
    -   Pilih metode pembayaran (Tunai, QRIS, Debit).
    -   Saat tombol "Bayar" ditekan, panggil fungsi RPC `process_checkout` di Supabase dengan semua data yang diperlukan (items, total, customer_id, dll.) untuk memastikan transaksi atomik.

### 2.4. Manajemen Data
Implementasikan fungsionalitas CRUD (Create, Read, Update, Delete) penuh untuk modul-modul berikut. Setiap halaman harus menampilkan data berdasarkan `selectedOrganizationId`.
-   **Produk**: Kelola produk jadi.
-   **Inventaris**: Kelola bahan baku.
-   **Pelanggan**: Kelola data pelanggan.
-   **Pengguna**: Kelola staf (Admin, Kasir) di dalam organisasi.

### 2.5. Pengaturan
-   Buat halaman di mana pengguna (dengan peran 'owner') dapat mengelola atribut bisnis seperti:
    -   Daftar Grade Parfum
    -   Daftar Aroma
    -   Ukuran Botol
    -   Promosi
    -   Pengaturan Loyalitas

---

## 3. Skema Database Supabase (Untuk Referensi)

Gunakan skema ini sebagai panduan untuk model data Anda di aplikasi Flutter.

### Tabel Inti:
-   **`organizations`**: `{ id, name, address, phone, logo_url, parent_organization_id }`
-   **`profiles`**: `{ id (sama dengan auth.users.id), email, full_name, organization_id, role }`

### Tabel Data (Semua memiliki `organization_id`):
-   **`products`**: `{ id, name, description, price, stock, category_id, image_url }`
-   **`raw_materials`**: `{ id, name, brand, quantity, unit, category, purchase_price }`
-   **`customers`**: `{ id, name, email, phone, loyalty_points, transaction_count }`
-   **`transactions`**: `{ id, cashier_id, customer_id, total_amount, payment_method, status }`
-   **`transaction_items`**: `{ id, transaction_id, product_id, quantity, price }`
-   **`promotions`**: `{ id, name, type, value, get_product_id, is_active }`
-   **`grades`**: `{ id, name, price_multiplier, extra_essence_price }`
-   **`aromas`**: `{ id, name, category, description }`
-   **`bottle_sizes`**: `{ id, size, unit, price }`
-   **`recipes`**: `{ id, name, grade_id, aroma_id, bottle_size_id, price, instructions }`

---

## Instruksi Tambahan

-   **Struktur Proyek**: Gunakan struktur direktori yang bersih dan terorganisir (misalnya, pisahkan `data`, `presentation/bloc`, `presentation/widgets`, `presentation/screens`).
-   **Penanganan Error**: Implementasikan penanganan error yang baik untuk panggilan API. Tampilkan pesan yang informatif kepada pengguna menggunakan `SnackBar` atau dialog.
-   **Loading State**: Tampilkan indikator loading (misalnya, `CircularProgressIndicator`) saat data sedang diambil dari Supabase.
-   **Kode yang Bersih**: Tulis kode yang bersih, dapat dibaca, dan mudah dikelola.

Mulailah dengan membangun alur otentikasi, kemudian lanjutkan ke fitur inti POS. Selamat bekerja!
