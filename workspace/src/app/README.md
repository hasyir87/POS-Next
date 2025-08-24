# ScentPOS - Point of Sale untuk Bisnis Parfum

Selamat datang di ScentPOS, sebuah Point of Sale (POS) modern yang dirancang khusus untuk bisnis parfum. Aplikasi ini dibangun dengan tumpukan teknologi modern untuk memberikan kinerja tinggi, antarmuka yang elegan, dan fondasi yang kuat untuk operasi bisnis multi-toko (multi-tenant).

## 1. Filosofi & Tujuan Aplikasi

ScentPOS dikembangkan untuk mengatasi tantangan unik dalam bisnis parfum, yang mencakup:
1.  **Penjualan Produk Jadi**: Mengelola produk siap jual dengan informasi stok dan harga.
2.  **Layanan Isi Ulang (Refill) Kustom**: Memfasilitasi pembuatan parfum kustom dengan berbagai pilihan (grade, aroma, botol), dengan perhitungan harga otomatis.
3.  **Manajemen Multi-Toko**: Memberikan dukungan out-of-the-box untuk bisnis dengan banyak cabang atau outlet, di mana setiap data outlet terisolasi dan aman.

Tujuannya adalah untuk menjadi sistem "all-in-one" yang mengelola penjualan, inventaris, pelanggan, dan pengguna dalam satu platform yang intuitif dan aman.

## 2. Arsitektur & Tumpukan Teknologi

ScentPOS dirancang dengan arsitektur modern yang memanfaatkan Firebase sebagai backend terintegrasi, memastikan skalabilitas, keamanan, dan kemudahan pengembangan.

### 2.1. Tumpukan Teknologi (Tech Stack)
-   **Framework**: Next.js (App Router v15+)
-   **Bahasa**: TypeScript
-   **Backend & Database**: **Firebase** (Firestore, Authentication, Cloud Functions, Storage)
-   **Styling**: Tailwind CSS
-   **Komponen UI**: ShadCN UI (dibangun di atas Radix UI)
-   **Manajemen State**: React Context API (`useAuth`)
-   **Formulir**: React Hook Form dengan Zod untuk validasi skema
-   **Fitur AI**: Google Genkit (untuk fitur-fitur cerdas di masa depan)

### 2.2. Integrasi Firebase (Backend)

Aplikasi ini **terintegrasi penuh** dengan Firebase untuk semua kebutuhan backend.

-   **Firestore**: Digunakan sebagai database NoSQL utama untuk menyimpan semua data aplikasi (pengguna, organisasi, produk, transaksi, dll.).
-   **Authentication**: Mengelola seluruh siklus hidup otentikasi (daftar, login, sesi). Terintegrasi secara ketat dengan aturan keamanan Firestore.
-   **Cloud Functions**: Logika backend yang sensitif dan kompleks (seperti membuat pemilik baru atau memproses checkout) dienkapsulasi dalam Cloud Functions untuk memastikan operasi berjalan secara atomik dan aman.
-   **Storage**: Digunakan untuk menyimpan aset seperti gambar produk atau logo organisasi.

Untuk detail lengkap tentang model data, lihat dokumen **`docs/blueprint.md`**.

## 3. Fitur Utama (Saat Ini & Rencana)

- **Otentikasi Multi-Tenant**: Pengguna dapat mendaftar dan membuat organisasi mereka sendiri. Pengguna hanya dapat melihat data yang terkait dengan organisasinya.
- **Manajemen Pengguna**: Pemilik dapat mengundang dan mengelola pengguna lain (Admin, Kasir) di dalam organisasinya.
- **Manajemen Produk & Inventaris**: Fungsionalitas CRUD untuk produk jadi dan bahan baku, terikat pada outlet yang dipilih.
- **Point of Sale (POS)**: Antarmuka untuk memproses penjualan produk jadi dan layanan isi ulang.
- **Alur Transaksi Atomik**: Proses checkout yang andal menggunakan Cloud Functions untuk memastikan konsistensi data.

## 4. Panduan Menjalankan Proyek

1.  **Setup Environment**: Buat file `.env.local` di root proyek dan isi dengan kredensial Firebase Anda. Gunakan `.env.example` sebagai template.

2.  **Instal Dependensi**:
    ```bash
    # Di root folder
    npm install
    
    # Di folder functions
    cd functions
    npm install
    cd ..
    ```

3.  **Jalankan Server Pengembangan**:
    ```bash
    npm run dev
    ```

4.  **Akses Aplikasi**: Buka `http://localhost:9002` di browser Anda. Anda dapat mendaftar sebagai pemilik baru atau login dengan akun yang ada.

## 5. Visi & Rencana Jangka Panjang

- **Fungsionalitas Penuh**: Mengubah semua halaman yang masih menggunakan data statis (Laporan, Akun, Shift) menjadi sepenuhnya dinamis dan terintegrasi dengan Firestore.
- **Dasbor Analitik**: Membangun dasbor yang menampilkan KPI, grafik, dan wawasan bisnis dari data transaksi dan inventaris secara real-time.
- **Integrasi E-commerce**: Menghubungkan ScentPOS dengan platform seperti Tokopedia dan Shopee untuk sinkronisasi stok dan manajemen pesanan terpusat.
- **Peningkatan AI**: Memanfaatkan Genkit untuk fitur-fitur seperti prediksi penjualan, rekomendasi produk, atau analisis sentimen pelanggan.
