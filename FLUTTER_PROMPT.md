
# Prompt Rekonstruksi Aplikasi SNIPOS ke Flutter

Anda adalah seorang AI software engineer ahli dengan spesialisasi pada **Flutter**, **Dart**, dan integrasi **Firebase**. Tugas Anda adalah merancang dan membangun kembali aplikasi Point of Sale (POS) bernama **SNIPOS** dari basis kode Next.js menjadi aplikasi cross-platform (Android, iOS, Desktop) menggunakan Flutter.

---

## 1. Tujuan & Konteks Proyek

**SNIPOS** adalah aplikasi POS komprehensif yang dirancang khusus untuk bisnis parfum. Aplikasi ini harus melayani dua model bisnis utama:

1.  **Toko Parfum Isi Ulang (Refill):** Memungkinkan pelanggan untuk membuat parfum kustom.
2.  **Toko Parfum Jadi:** Menjual produk parfum yang sudah jadi dalam kemasan.

Aplikasi ini menggunakan **Firebase** sebagai backend tunggal, yang menangani otentikasi, database, dan logika bisnis sisi server.

---

## 2. Arsitektur Backend (Firebase - Tetap Digunakan)

Aplikasi Flutter yang akan Anda bangun akan terhubung ke backend Firebase yang **sudah ada**. Anda tidak perlu membuat backend baru.

*   **Authentication**: Gunakan `firebase_auth` untuk menangani semua alur otentikasi (login, daftar, manajemen sesi).
*   **Database**: Gunakan `cloud_firestore` untuk semua operasi CRUD (Create, Read, Update, Delete) data.
*   **Cloud Functions**: Gunakan `cloud_functions` untuk memanggil logika bisnis yang ada di sisi server.
*   **Tumpukan Teknologi Backend (Untuk Referensi):**
    *   Database: Firestore
    *   Otentikasi: Firebase Authentication
    *   Server-side Logic: Cloud Functions (ditulis dalam TypeScript)

### Struktur Database di Firestore (Koleksi Utama)

Anda harus berinteraksi dengan koleksi-koleksi berikut:

*   `organizations`: Menyimpan data toko/organisasi. `{ name, owner_id, is_setup_complete }`
*   `profiles`: Menyimpan profil pengguna, terikat pada UID Firebase Auth. `{ email, full_name, role, organization_id }`
*   `products`: Menyimpan produk parfum jadi. `{ organization_id, name, price, stock, image_url }`
*   `raw_materials`: Bahan baku untuk parfum refill. `{ organization_id, name, brand, quantity, unit, category, purchase_price }`
*   `customers`: Data pelanggan/anggota. `{ organization_id, name, email, phone, transaction_count }`
*   `transactions`: Riwayat transaksi. `{ organization_id, cashier_id, customer_id, total_amount, payment_method, items }`
*   `grades`: Tingkatan kualitas parfum untuk refill. `{ organization_id, name, price_multiplier, extra_essence_price }`
*   `expenses`: Catatan beban operasional. `{ organization_id, date, category, description, amount }`
*   `shifts`: Catatan buka/tutup kasir. `{ organization_id, cashier_id, start_amount, end_amount, status }`

### Cloud Functions yang Ada (API Endpoints)

Anda akan memanggil fungsi-fungsi ini dari aplikasi Flutter:

*   `createOwner(data)`: Untuk pendaftaran pemilik toko baru.
*   `createUser(data)`: Untuk menambah staf baru (admin/kasir) oleh pemilik.
*   `deleteUser(data)`: Untuk menghapus staf.
*   `createOutlet(data)`: Untuk membuat cabang/outlet baru oleh pemilik.
*   `updateOutlet(data)`: Untuk mengubah nama outlet.
*   `deleteOutlet(data)`: Untuk menghapus outlet.

---

## 3. Rincian Fungsional per Modul (Untuk Dibangun di Flutter)

Berikut adalah rincian setiap layar/fitur yang perlu Anda bangun:

### Modul 0: Otentikasi
*   **Layar Login:** Formulir untuk email dan password. Panggil fungsi `signInWithEmailAndPassword` dari `firebase_auth`.
*   **Layar Signup:** Formulir untuk nama lengkap, nama organisasi, email, dan password. Panggil Cloud Function `createOwner`.
*   **Manajemen Sesi:** Setelah login berhasil, simpan data profil pengguna dari koleksi `profiles` dan data organisasi dari `organizations`. Gunakan state management (BLoC, Riverpod, atau Provider) untuk menyediakan data ini ke seluruh aplikasi.

### Modul 1: Dasbor (`/dashboard`)
*   **Tujuan:** Menampilkan ringkasan bisnis (Key Performance Indicators - KPI).
*   **Fungsionalitas:**
    *   Tampilkan kartu ringkasan untuk "Pendapatan Hari Ini", "Penjualan Hari Ini", dan "Pelanggan Baru".
    *   Ambil data dari koleksi `transactions` dan `customers` dengan filter berdasarkan `organization_id` yang dipilih dan tanggal hari ini.
    *   Tampilkan tabel "Produk Terlaris Hari Ini".
    *   (Opsional) Tampilkan grafik penjualan (bisa menggunakan `fl_chart`).

### Modul 2: Point of Sale (POS) (`/dashboard/pos`)
*   **Tujuan:** Antarmuka utama kasir untuk melakukan transaksi.
*   **Fungsionalitas:**
    *   **Tab Produk Jadi:** Tampilkan grid produk dari koleksi `products`. Saat produk diklik, tambahkan ke keranjang.
    *   **Tab Isi Ulang:** Implementasikan formulir dinamis:
        1.  Pilih Grade (dari koleksi `grades`).
        2.  Pilih Aroma (dari `raw_materials` kategori "Bibit Parfum").
        3.  Pilih Ukuran Botol.
        4.  Hitung harga secara otomatis berdasarkan grade, resep, dan tambahan bibit.
        5.  Tambahkan ke keranjang sebagai item "refill".
    *   **Keranjang (Cart):** Tampilkan daftar item, kuantitas, dan harga. Izinkan penyesuaian kuantitas atau penghapusan item.
    *   **Ringkasan Pesanan:** Hitung subtotal, diskon (jika ada), pajak, dan total akhir.
    *   **Tombol Bayar:** Saat ditekan, simpan data transaksi baru ke koleksi `transactions`. Idealnya, ini memanggil Cloud Function untuk memastikan pengurangan stok terjadi secara atomik (transaksional).

### Modul 3: Manajemen Data (CRUD untuk setiap modul)
*   **Produk (`/dashboard/products`):**
    *   Tampilkan daftar produk jadi dari koleksi `products`.
    *   Sediakan fungsionalitas untuk menambah, mengubah (misal: harga, stok), dan menghapus produk.
*   **Inventaris (`/dashboard/inventory`):**
    *   Tampilkan daftar bahan baku dari `raw_materials`, dikelompokkan berdasarkan kategori.
    *   Sediakan fungsionalitas CRUD untuk bahan baku.
*   **Anggota (`/dashboard/members`):**
    *   Tampilkan daftar pelanggan dari koleksi `customers`.
    *   Sediakan fungsionalitas CRUD untuk anggota.
*   **Beban (`/dashboard/expenses`):**
    *   Tampilkan daftar beban dari koleksi `expenses`.
    *   Sediakan fungsionalitas CRUD untuk mencatat beban.

### Modul 4: Laporan (`/dashboard/reports`)
*   **Tujuan:** Membuat laporan laba rugi.
*   **Fungsionalitas:**
    *   Sediakan filter tanggal (misal: Bulan Ini, Bulan Lalu).
    *   Hitung **Total Pendapatan** dari koleksi `transactions`.
    *   Hitung **Total Beban** dari koleksi `expenses`.
    *   Hitung **Laba Bersih** (Pendapatan - Beban - Estimasi HPP).
    *   Tampilkan dalam format laporan yang jelas.
    *   Sediakan tombol untuk mengekspor laporan (misal: ke PDF atau CSV).

### Modul 5: Pengaturan (`/dashboard/settings`)
*   **Tujuan:** Mengelola konfigurasi aplikasi.
*   **Fungsionalitas:**
    *   **Manajemen Outlet:** (Hanya untuk `owner`) Tampilkan daftar outlet/cabang. Sediakan fungsionalitas untuk menambah/mengubah/menghapus outlet dengan memanggil Cloud Functions terkait.
    *   **Manajemen Staf:** (Hanya untuk `owner`/`admin`) Arahkan ke halaman terpisah untuk mengelola pengguna (lihat Modul 6).
    *   **Manajemen Grade:** Sediakan fungsionalitas CRUD untuk koleksi `grades`.

### Modul 6: Manajemen Pengguna (`/dashboard/users`)
*   **Tujuan:** Mengelola staf (kasir/admin).
*   **Fungsionalitas:** (Hanya untuk `owner`/`admin`)
    *   Tampilkan daftar pengguna dari koleksi `profiles` yang memiliki `organization_id` yang sama.
    *   Sediakan tombol untuk menambah pengguna baru (panggil CF `createUser`).
    *   Sediakan opsi untuk menghapus pengguna (panggil CF `deleteUser`).

---

## 4. Tumpukan Teknologi & Arsitektur Flutter yang Disarankan

*   **State Management:** Gunakan `flutter_bloc` atau `riverpod` untuk manajemen state yang solid dan terukur.
*   **Navigasi:** Gunakan `go_router` atau `auto_route` untuk navigasi berbasis route yang kuat.
*   **Integrasi Firebase:**
    *   `firebase_core`
    *   `firebase_auth`
    *   `cloud_firestore`
    *   `cloud_functions`
*   **UI Components:** Gunakan `Material 3` sebagai dasar. Buat komponen yang dapat digunakan kembali untuk elemen UI umum (kartu, dialog, tombol, dll).
*   **Validasi Formulir:** Gunakan `form_field_validator` atau `flutter_form_builder`.
*   **Struktur Proyek:** Atur proyek Anda berdasarkan fitur (misalnya, `lib/features/auth`, `lib/features/dashboard`, `lib/features/pos`, dll).

**Tugas Pertama Anda:**
Mulai dengan membuat kerangka aplikasi Flutter, siapkan integrasi Firebase, dan implementasikan alur otentikasi (Login & Signup) sebagai fondasi.
