# ScentPOS - Blueprint & Dokumentasi Aplikasi

Selamat datang di ScentPOS, sebuah Point of Sale (POS) modern yang dirancang khusus untuk bisnis parfum. Aplikasi ini dibangun dengan tumpukan teknologi modern untuk memberikan kinerja tinggi, antarmuka yang elegan, dan fitur-fitur cerdas untuk menyederhanakan operasi bisnis sehari-hari.

## 1. Filosofi & Tujuan Aplikasi

ScentPOS dikembangkan untuk mengatasi tantangan unik dalam bisnis parfum dengan melayani dua model bisnis utama:

1.  **Toko Parfum Isi Ulang (Refill)**: Dengan fitur unggulan seperti formulir isi ulang dinamis, ScentPOS memudahkan pembuatan parfum kustom dengan memilih grade, aroma, ukuran botol, dan menyesuaikan jumlah bibit. Harga dihitung secara otomatis, dan sistem ini mengelola inventaris bahan baku yang kompleks.
2.  **Toko Parfum Jadi**: ScentPOS membantu mengelola produk siap jual dengan informasi detail seperti nama, gambar, stok, Harga Pokok Penjualan (HPP), dan harga jual, memungkinkan pelacakan profitabilitas yang akurat.

Tujuannya adalah untuk menjadi sistem "all-in-one" yang mengelola penjualan, inventaris, pelanggan, dan keuangan dalam satu platform yang intuitif, baik untuk toko yang fokus pada salah satu model maupun yang menjalankan keduanya secara bersamaan.

## 2. Arsitektur & Tumpukan Teknologi

ScentPOS dirancang dengan arsitektur modern yang memisahkan frontend dan backend, memastikannya skalabel, aman, dan mudah dikelola.

### 2.1. Tumpukan Teknologi (Tech Stack)
-   **Framework Frontend**: Next.js (dengan App Router)
-   **Bahasa**: TypeScript
-   **Backend as a Service (BaaS)**: **Supabase**
-   **Styling**: Tailwind CSS
-   **Komponen UI**: ShadCN UI (dibangun di atas Radix UI)
-   **Manajemen State**: React Context API & `useState`
-   **Formulir**: React Hook Form dengan Zod untuk validasi skema
-   **Fitur AI**: Google Genkit
-   **Grafik & Laporan**: Recharts, jspdf, xlsx

### 2.2. Integrasi Supabase (Backend)

Saat ini, aplikasi menggunakan state lokal untuk simulasi. Namun, arsitektur yang dituju adalah migrasi penuh ke **Supabase** sebagai backend.

-   **Database (PostgreSQL)**: Semua data, termasuk pengguna, produk, inventaris, dan transaksi, akan disimpan di database PostgreSQL Supabase. Keamanan akan dijamin dengan **Row Level Security (RLS)** untuk memastikan setiap pengguna hanya bisa mengakses data sesuai haknya.
-   **Authentication (Supabase Auth)**: Mengelola otentikasi (login, daftar, sesi) dan terintegrasi langsung dengan kebijakan RLS di database.
-   **Storage**: Menyimpan file seperti gambar produk dengan aman.
-   **Edge Functions**: Digunakan untuk logika backend kustom yang mungkin diperlukan di masa depan.

### 2.3. Struktur Database yang Dituju di Supabase

-   **Produk Jadi (`products`)**: `{ id, name, cogs, price, stock, image_url, organization_id, tokopedia_product_id, shopee_product_id }`
-   **Bahan Baku (`materials`)**: `{ id, name, brand, quantity, unit, category, purchase_price, organization_id }`
-   **Anggota (`members`)**: `{ id, name, email, phone, transaction_count, organization_id }`
-   **Transaksi (`transactions`)**: `{ id, created_at, total_amount, member_id, user_id, marketplace_order_id, marketplace_name }`
-   **Item Transaksi (`transaction_items`)**: `{ id, transaction_id, product_id, material_id, quantity, price }`
-   **Beban (`expenses`)**: `{ id, date, category, description, amount, organization_id }`
-   **Pengguna & Peran (`users`)**: `{ id, email, role, organization_id }`
-   **Organisasi (`organizations`)**: `{ id, name, owner_id }`

## 3. Fitur Utama

Berikut adalah rincian fungsionalitas utama yang akan didukung oleh arsitektur Supabase:

- **Dasbor Analitik**: Menampilkan KPI, grafik penjualan, dan notifikasi stok menipis dari data real-time.
- **Point of Sale (POS)**: Antarmuka terpadu untuk penjualan produk jadi dan isi ulang yang langsung mencatat transaksi ke database.
- **Manajemen Produk & Inventaris**: CRUD untuk produk jadi dan bahan baku yang terhubung ke tabel `products` dan `materials`.
- **Keuangan**: Manajemen beban dan laporan laba rugi yang dihasilkan dari data transaksi.
- **Manajemen Operasional**: Pengelolaan shift, anggota, dan peran pengguna dengan hak akses yang diatur oleh RLS.

## 4. Panduan Menjalankan Proyek

1.  **Instal dependensi**:
    ```bash
    npm install
    ```
2.  **Jalankan server pengembangan**:
    ```bash
    npm run dev
    ```
3.  **Akses Aplikasi**: Buka `http://localhost:9002`.

## 5. Perencanaan Masa Depan

### Prioritas Berikutnya: Integrasi E-commerce
- **Tujuan**: Mengubah ScentPOS menjadi pusat komando untuk penjualan omnichannel.
- **Fitur yang Akan Ditambahkan**:
    - **Sinkronisasi Stok Otomatis**: Stok akan tersinkronisasi secara real-time antara ScentPOS, Tokopedia, dan Shopee.
    - **Manajemen Produk Terpusat**: Buat atau perbarui produk di ScentPOS, dan perubahan tersebut akan diterapkan ke semua marketplace yang terhubung.
    - **Laporan Penjualan Terkonsolidasi**: Dasbor akan menampilkan data penjualan gabungan dari semua kanal.

### Visi Jangka Panjang:
- **Peningkatan AI**: Inventaris prediktif dan rekomendasi personal.
- **Fitur Lanjutan**: Program loyalitas berjenjang.
- **Integrasi Pembayaran**: Menambah gateway pembayaran dan opsi nirsentuh.
- **Peningkatan UX**: Dasbor yang dapat disesuaikan dan mode offline.
