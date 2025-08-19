# ScentPOS - Point of Sale untuk Bisnis Parfum

Selamat datang di ScentPOS, sebuah Point of Sale (POS) modern yang dirancang khusus untuk bisnis parfum. Aplikasi ini dibangun dengan tumpukan teknologi modern untuk memberikan kinerja tinggi, antarmuka yang elegan, dan fondasi yang kuat untuk operasi bisnis multi-toko (multi-tenant).

## 1. Filosofi & Tujuan Aplikasi

ScentPOS dikembangkan untuk mengatasi tantangan unik dalam bisnis parfum, yang mencakup:
1.  **Penjualan Produk Jadi**: Mengelola produk siap jual dengan informasi stok dan harga.
2.  **Layanan Isi Ulang (Refill) Kustom**: Memfasilitasi pembuatan parfum kustom dengan berbagai pilihan (grade, aroma, botol), dengan perhitungan harga otomatis.
3.  **Manajemen Multi-Toko**: Memberikan dukungan out-of-the-box untuk bisnis dengan banyak cabang atau outlet, di mana setiap data outlet terisolasi dan aman.

Tujuannya adalah untuk menjadi sistem "all-in-one" yang mengelola penjualan, inventaris, pelanggan, dan pengguna dalam satu platform yang intuitif dan aman.

## 2. Arsitektur & Tumpukan Teknologi

ScentPOS dirancang dengan arsitektur modern yang memanfaatkan Supabase sebagai backend terintegrasi, memastikan skalabilitas, keamanan, dan kemudahan pengembangan.

### 2.1. Tumpukan Teknologi (Tech Stack)
-   **Framework**: Next.js (App Router v15+)
-   **Bahasa**: TypeScript
-   **Backend & Database**: **Supabase**
-   **Styling**: Tailwind CSS
-   **Komponen UI**: ShadCN UI (dibangun di atas Radix UI)
-   **Manajemen State**: React Context API (`useAuth`)
-   **Formulir**: React Hook Form dengan Zod untuk validasi skema
-   **Fitur AI**: Google Genkit (untuk fitur-fitur cerdas di masa depan)

### 2.2. Integrasi Supabase (Backend)

Aplikasi ini **terintegrasi penuh** dengan Supabase untuk semua kebutuhan backend.

-   **Database (PostgreSQL)**: Semua data, termasuk pengguna, organisasi, produk, dan transaksi, disimpan di database PostgreSQL.
-   **Row-Level Security (RLS)**: Keamanan data adalah prioritas utama. RLS diaktifkan di semua tabel penting untuk memastikan setiap pengguna (tenant/organisasi) hanya dapat mengakses data mereka sendiri.
-   **Authentication (Supabase Auth)**: Mengelola seluruh siklus hidup otentikasi (daftar, login, sesi, middleware). Terintegrasi secara ketat dengan kebijakan RLS di database.
-   **Functions (RPC)**: Logika bisnis yang kompleks dan kritis, seperti proses checkout, dienkapsulasi dalam fungsi PostgreSQL (`process_checkout`) untuk memastikan operasi berjalan secara atomik dan aman.
-   **Storage**: Digunakan untuk menyimpan aset seperti gambar produk atau logo organisasi.

Untuk detail lengkap tentang skema database, lihat dokumen **`docs/blueprint.md`**.

## 3. Fitur Utama (Saat Ini & Rencana)

- **Otentikasi Multi-Tenant**: Pengguna dapat mendaftar dan membuat organisasi mereka sendiri. Pengguna hanya dapat melihat data yang terkait dengan organisasinya.
- **Manajemen Pengguna**: Pemilik dapat mengundang dan mengelola pengguna lain (Admin, Kasir) di dalam organisasinya.
- **Manajemen Produk & Inventaris**: Fungsionalitas CRUD untuk produk jadi dan bahan baku, terikat pada outlet yang dipilih.
- **Point of Sale (POS)**: Antarmuka untuk memproses penjualan produk jadi dan layanan isi ulang.
- **Alur Transaksi Atomik**: Proses checkout yang andal menggunakan fungsi RPC database untuk memastikan konsistensi data.

## 4. Panduan Menjalankan Proyek

1.  **Setup Environment**: Salin `.env.example` menjadi `.env.local` dan isi dengan kredensial Supabase Anda.
    ```bash
    cp .env.example .env.local
    ```

2.  **Instal Dependensi**:
    ```bash
    npm install
    ```

3.  **Setup Database**: Jalankan skrip setup untuk menerapkan skema, RLS, dan fungsi ke database Supabase Anda.
    ```bash
    npm run setup-db
    ```
    *Catatan: Anda harus mengatur variabel `SERVICE_ROLE_KEY_SUPABASE` di environment Anda agar skrip ini berhasil.*


4.  **Jalankan Server Pengembangan**:
    ```bash
    npm run dev
    ```

5.  **Akses Aplikasi**: Buka `http://localhost:9002` di browser Anda. Anda dapat mendaftar sebagai pemilik baru atau login dengan akun yang ada.

## 5. Visi & Rencana Jangka Panjang

- **Fungsionalitas Penuh**: Mengubah semua halaman yang masih menggunakan data statis (Laporan, Akun, Shift) menjadi sepenuhnya dinamis dan terintegrasi.
- **Dasbor Analitik**: Membangun dasbor yang menampilkan KPI, grafik, dan wawasan bisnis dari data transaksi dan inventaris secara real-time.
- **Integrasi E-commerce**: Menghubungkan ScentPOS dengan platform seperti Tokopedia dan Shopee untuk sinkronisasi stok dan manajemen pesanan terpusat.
- **Peningkatan AI**: Memanfaatkan Genkit untuk fitur-fitur seperti prediksi penjualan, rekomendasi produk, atau analisis sentimen pelanggan.
