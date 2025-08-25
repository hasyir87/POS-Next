# ScentPOS - Blueprint & Dokumentasi Aplikasi

Selamat datang di ScentPOS, sebuah Point of Sale (POS) modern yang dirancang khusus untuk bisnis parfum. Aplikasi ini dibangun dengan tumpukan teknologi modern untuk memberikan kinerja tinggi, antarmuka yang elegan, dan fitur-fitur cerdas untuk menyederhanakan operasi bisnis sehari-hari.

## 1. Filosofi & Tujuan Aplikasi

ScentPOS dikembangkan untuk mengatasi tantangan unik dalam bisnis parfum dengan melayani dua model bisnis utama:

1.  **Toko Parfum Isi Ulang (Refill)**: Dengan fitur unggulan seperti formulir isi ulang dinamis, ScentPOS memudahkan pembuatan parfum kustom dengan memilih grade, aroma, ukuran botol, dan menyesuaikan jumlah bibit. Harga dihitung secara otomatis, dan sistem ini mengelola inventaris bahan baku yang kompleks.
2.  **Toko Parfum Jadi**: ScentPOS membantu mengelola produk siap jual dengan informasi detail seperti nama, gambar, stok, dan harga jual.

Tujuannya adalah untuk menjadi sistem "all-in-one" yang mengelola penjualan, inventaris, pelanggan, dan keuangan dalam satu platform yang intuitif, baik untuk toko yang fokus pada salah satu model maupun yang menjalankan keduanya secara bersamaan.

## 2. Arsitektur & Tumpukan Teknologi

ScentPOS dirancang dengan arsitektur modern yang memisahkan frontend dan backend, memastikannya skalabel, aman, dan mudah dikelola.

### 2.1. Tumpukan Teknologi (Tech Stack)
-   **Framework Frontend**: Next.js (dengan App Router)
-   **Bahasa**: TypeScript
-   **Backend as a Service (BaaS)**: **Firebase**
-   **Styling**: Tailwind CSS
-   **Komponen UI**: ShadCN UI (dibangun di atas Radix UI)
-   **Manajemen State**: React Context API & `useState`
-   **Formulir**: React Hook Form dengan Zod untuk validasi skema
-   **Fitur AI**: Google Genkit

### 2.2. Integrasi Firebase (Backend)

Aplikasi ini terintegrasi penuh dengan **Firebase** sebagai backend.

-   **Database (Firestore)**: Semua data, termasuk profil pengguna, organisasi, produk, inventaris, dan transaksi, disimpan di database NoSQL Firestore.
-   **Authentication (Firebase Auth)**: Mengelola otentikasi (login, daftar, sesi) dan terintegrasi dengan data profil di Firestore.
-   **Storage**: Digunakan untuk menyimpan file seperti gambar produk dengan aman.
-   **Cloud Functions**: Digunakan untuk logika backend yang aman seperti pembuatan pengguna, penghapusan, dan kalkulasi analitik dasbor.

### 2.3. Struktur Database di Firestore (Koleksi)

-   **`organizations`**: Menyimpan data toko/organisasi. `{ name, owner_id, is_setup_complete }`
-   **`profiles`**: Menyimpan data pengguna yang terikat pada ID Firebase Auth. `{ email, full_name, role, organization_id }`
-   **`products`**: Menyimpan produk jadi. `{ organization_id, name, price, stock, image_url }`
-   **`raw_materials`**: Menyimpan bahan baku untuk refill. `{ organization_id, name, brand, quantity, unit, category, purchase_price }`
-   **`customers`**: Menyimpan data pelanggan/anggota. `{ organization_id, name, email, phone, transaction_count }`
-   **`transactions`**: Menyimpan riwayat transaksi. `{ organization_id, cashier_id, customer_id, total_amount, payment_method }`
-   **`grades`**: Menyimpan grade parfum untuk refill. `{ organization_id, name, price_multiplier, extra_essence_price }`

## 3. Fitur Utama

- **Dasbor Analitik**: Menampilkan KPI, grafik penjualan, dan notifikasi stok menipis dari data real-time yang diproses oleh Cloud Functions.
- **Point of Sale (POS)**: Antarmuka terpadu untuk penjualan produk jadi dan isi ulang yang langsung mencatat transaksi ke Firestore.
- **Manajemen Data**: Fungsionalitas CRUD untuk Produk, Inventaris, Anggota, dan Pengguna yang terhubung ke Firestore.
- **Manajemen Multi-Outlet**: Kemampuan untuk beralih antar outlet (organisasi) yang berbeda.

## 4. Panduan Menjalankan Proyek

1.  **Konfigurasi Environment**: Salin `.env.local.example` ke `.env.local` dan isi dengan kredensial proyek Firebase Anda.
2.  **Instal dependensi**:
    ```bash
    npm install
    ```
3.  **Jalankan server pengembangan**:
    ```bash
    npm run dev
    ```
4.  **Akses Aplikasi**: Buka `http://localhost:9002`.

## 5. Visi Jangka Panjang

- **Peningkatan AI**: Manajemen inventaris prediktif dan rekomendasi wewangian.
- **Fitur Lanjutan**: Program loyalitas berjenjang.
- **Integrasi Pembayaran**: Menambah gateway pembayaran digital.
- **Peningkatan UX**: Dasbor yang dapat disesuaikan dan mode offline.
