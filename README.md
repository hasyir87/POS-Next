# ScentPOS - Blueprint & Dokumentasi Aplikasi

Selamat datang di ScentPOS, sebuah Point of Sale (POS) modern yang dirancang khusus untuk bisnis parfum. Aplikasi ini dibangun dengan tumpukan teknologi modern untuk memberikan kinerja tinggi, antarmuka yang elegan, dan fitur-fitur cerdas untuk menyederhanakan operasi bisnis sehari-hari.

## 1. Filosofi & Tujuan Aplikasi

ScentPOS dikembangkan untuk mengatasi tantangan unik dalam bisnis parfum, yang mencakup penjualan produk jadi, layanan isi ulang (refill) kustom, manajemen bahan baku yang kompleks, dan kebutuhan untuk memberikan layanan pelanggan yang premium. Tujuannya adalah untuk menjadi sistem "all-in-one" yang mengelola penjualan, inventaris, pelanggan, dan keuangan dalam satu platform yang intuitif.

## 2. Fitur Utama

Berikut adalah rincian fungsionalitas utama yang telah diimplementasikan:

### 2.1. Dasbor Analitik (`/dashboard`)
- **KPI Utama**: Menampilkan metrik kunci secara real-time seperti pendapatan harian, jumlah penjualan, pelanggan baru, dan saldo kas shift.
- **Grafik Penjualan**: Visualisasi performa penjualan mingguan untuk melacak tren.
- **Notifikasi Cerdas**: Peringatan otomatis untuk stok bahan yang menipis atau habis, memungkinkan manajemen proaktif.
- **Papan Peringkat**: Menampilkan 5 produk jadi terlaris dan 5 aroma isi ulang terpopuler untuk memberikan wawasan bisnis.

### 2.2. Point of Sale (POS) (`/dashboard/pos`)
- **Antarmuka Kasir Terpadu**: Melayani penjualan **Produk Jadi** dan **Layanan Isi Ulang** dari satu layar.
- **Formulir Isi Ulang Dinamis**: Memungkinkan pembuatan parfum kustom dengan memilih grade, aroma, ukuran botol, dan bahkan menyesuaikan jumlah bibit. Harga dihitung secara otomatis.
- **Manajemen Keranjang**: Fungsi untuk menambah, mengubah kuantitas, dan menghapus item dari pesanan.
- **Integrasi Member & Loyalitas**: Mencari dan menetapkan pelanggan ke transaksi. Sistem secara otomatis mendeteksi jika member berhak mendapatkan hadiah (berdasarkan ambang batas transaksi di Pengaturan) dan memungkinkan kasir untuk menerapkan hadiah tersebut.
- **Sistem Promo & Voucher**: Menerapkan diskon (persentase atau nominal) dan promosi "Beli X Gratis Y" (BOGO) yang terhubung langsung ke stok produk.

### 2.3. Manajemen Produk (`/dashboard/products`)
- **Katalog Produk Jadi**: Pusat untuk mengelola produk siap jual.
- **Data Penting**: Setiap produk memiliki data untuk nama, gambar, stok, **Harga Pokok Penjualan (HPP)**, dan harga jual, memungkinkan pelacakan profitabilitas yang akurat.

### 2.4. Manajemen Inventaris (`/dashboard/inventory`)
- **Stok Bahan Baku**: Mengelola semua bahan mentah (bibit parfum, pelarut, kemasan, dll) yang dikelompokkan berdasarkan kategori.
- **Nilai Stok**: Menghitung nilai total setiap item inventaris berdasarkan harga beli dan kuantitas.
- **Ahli Racik Cerdas (AI)**: Fitur berbasis Genkit AI yang memberikan rekomendasi campuran bahan baku optimal berdasarkan deskripsi wewangian dari pelanggan dan ketersediaan stok.

### 2.5. Keuangan
- **Manajemen Beban (`/dashboard/expenses`)**: Mencatat dan mengkategorikan semua pengeluaran operasional bisnis.
- **Akun Utang & Piutang (`/dashboard/accounts`)**: Melacak faktur dari pemasok (utang) dan tagihan ke pelanggan (piutang), serta status pembayarannya.
- **Laporan Laba Rugi (`/dashboard/reports`)**: Menghasilkan laporan keuangan dinamis yang menghitung laba bersih berdasarkan total pendapatan, HPP, dan beban operasional. Laporan dapat diekspor ke format PDF atau Excel.

### 2.6. Manajemen Operasional
- **Manajemen Shift (`/dashboard/shifts`)**: Mencatat saldo kas awal dan akhir untuk setiap sesi kasir.
- **Manajemen Anggota (`/dashboard/members`)**: Mengelola data pelanggan setia, termasuk melacak jumlah transaksi mereka untuk program loyalitas.
- **Manajemen Pengguna & Peran (`/dashboard/settings/roles`)**: Mengatur hak akses mendetail untuk setiap peran pengguna (Pemilik, Admin, Kasir).
- **Pengaturan Terpusat (`/dashboard/settings`)**: Satu tempat untuk mengonfigurasi semua aspek aplikasi, termasuk:
    - **Atribut Inventaris**: Mengelola daftar Kategori, Unit, dan Brand secara dinamis.
    - **Program Loyalitas**: Mengatur aturan untuk hadiah member.
    - **Promosi**: Membuat dan mengelola semua jenis promosi.
    - **Outlet & Kunci API**.

## 3. Struktur Data & Logika (Database Blueprint)

Aplikasi ini menggunakan state di dalam komponen React untuk mensimulasikan database. Berikut adalah struktur data utamanya:

- **Produk Jadi**: `{ id, name, cogs, price, stock, image }`
- **Bahan Baku (Inventaris)**: `{ id, name, brand, quantity, unit, category, purchasePrice }`
- **Anggota**: `{ id, name, email, phone, level, transactionCount }`
- **Promosi**: `{ id, name, type, value }`
  - `type`: 'Persentase', 'Nominal', atau 'BOGO'.
  - `value`: Angka diskon, atau ID produk gratis untuk BOGO.
- **Beban**: `{ id, date, category, description, amount }`
- **Transaksi (disimulasikan di Laporan)**: `{ id, date, item, revenue, cogs }`
- **Shift**: `{ id, date, cashier, start, end, status }`

## 4. Tumpukan Teknologi (Tech Stack)

- **Framework**: Next.js (dengan App Router)
- **Bahasa**: TypeScript
- **Styling**: Tailwind CSS
- **Komponen UI**: ShadCN UI (Radix UI + Tailwind CSS)
- **Manajemen State**: React Context API & `useState`
- **Formulir**: React Hook Form dengan Zod untuk validasi
- **Fitur AI**: Google Genkit
- **Grafik & Laporan**: Recharts, jspdf, xlsx

## 5. Arsitektur Proyek

Struktur folder utama dirancang untuk skalabilitas dan keterbacaan:

- `src/app/`: Berisi semua rute dan halaman aplikasi.
  - `(auth)/`: Halaman login.
  - `dashboard/`: Semua halaman setelah pengguna login (layout utama, POS, inventaris, dll).
- `src/components/`: Berisi komponen React yang dapat digunakan kembali.
  - `ui/`: Komponen UI dasar dari ShadCN.
  - Komponen kustom seperti `inventory-tool.tsx`, `login-form.tsx`, dll.
- `src/context/`: Berisi logic untuk manajemen state global, seperti `auth-context.tsx`.
- `src/ai/`: Berisi semua kode yang berhubungan dengan AI, termasuk flows Genkit.
- `src/lib/`: Berisi fungsi utilitas, seperti `cn` untuk styling.

## 6. Panduan Menjalankan Proyek

Untuk menjalankan aplikasi ini di lingkungan pengembangan lokal:

1.  **Instal dependensi**:
    Pastikan Anda memiliki Node.js dan npm terinstal. Buka terminal di direktori proyek dan jalankan:
    ```bash
    npm install
    ```

2.  **Jalankan server pengembangan**:
    Setelah instalasi selesai, jalankan perintah berikut untuk memulai aplikasi:
    ```bash
    npm run dev
    ```

3.  **Akses Aplikasi**:
    Buka browser Anda dan navigasikan ke `http://localhost:9002` (atau port lain yang ditampilkan di terminal). Anda akan disambut oleh halaman login.
