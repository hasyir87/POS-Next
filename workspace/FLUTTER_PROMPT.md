# Prompt Master untuk Pengembangan Aplikasi ScentPOS dengan Flutter

Anda adalah seorang AI software engineer ahli dengan spesialisasi pengembangan aplikasi mobile menggunakan Flutter dan integrasi dengan backend Firebase.

## Tujuan Utama

Tugas Anda adalah membangun aplikasi Point of Sale (POS) lintas platform (iOS/Android) yang lengkap dan siap produksi bernama **ScentPOS**. Aplikasi ini akan menjadi klien untuk backend **Firebase** yang sudah ada.

---

## 1. Tumpukan Teknologi & Arsitektur

*   **Framework Frontend**: Flutter (versi stabil terbaru).
*   **Manajemen State**: Gunakan **`flutter_bloc`**. Ini adalah pilihan krusial untuk memastikan arsitektur yang skalabel, teruji, dan modular.
*   **Backend**: **Firebase**. Aplikasi Flutter akan berinteraksi dengan Firebase menggunakan paket-paket resmi seperti `firebase_core`, `firebase_auth`, `cloud_firestore`, dan `firebase_functions`.
*   **Navigasi**: Gunakan `GoRouter` untuk manajemen rute yang kuat.
*   **UI**: Desain antarmuka yang bersih, modern, dan responsif.
*   **Dependensi Penting**:
    *   `firebase_core`, `firebase_auth`, `cloud_firestore`, `firebase_functions`: Untuk interaksi dengan Firebase.
    *   `flutter_bloc`: Untuk manajemen state.
    *   `go_router`: Untuk navigasi.
    *   `intl`: Untuk format mata uang dan tanggal.
    *   `equatable`: Untuk perbandingan objek dalam BLoC.
    *   Paket untuk konektivitas printer (misalnya, `blue_thermal_printer`).

**PENTING**: Backend Firebase (Firestore, Authentication, Cloud Functions, Aturan Keamanan) **SUDAH ADA DAN BERFUNGSI**. Aplikasi Flutter ini adalah *headless client*. Jangan membuat ulang logika backend.

---

## 2. Fitur-Fitur Utama yang Harus Dibangun

Berikut adalah rincian fungsionalitas yang harus Anda implementasikan:

### 2.1. Otentikasi & Multi-Tenancy
-   **Halaman Splash/Loading**: Tampilkan layar pemuatan saat memeriksa status sesi otentikasi (`FirebaseAuth.instance.authStateChanges()`).
-   **Halaman Login**: Formulir untuk email dan password. Panggil `signInWithEmailAndPassword`.
-   **Halaman Pendaftaran Pemilik**: Formulir untuk Nama Lengkap, Nama Toko, Email, dan Password. Panggil **Cloud Function `createOwner`** untuk pendaftaran.
-   **Manajemen Sesi**: Gunakan `authStateChanges` dari Firebase Auth untuk mengarahkan pengguna secara otomatis.
-   **Pemilihan Outlet**: Setelah login, jika pengguna memiliki akses ke beberapa outlet, sediakan UI untuk beralih antar outlet. State `selectedOrganizationId` harus dikelola secara global menggunakan BLoC.

### 2.2. Dasbor Utama
-   Tampilkan ringkasan KPI. Panggil **Cloud Function `get_dashboard_analytics`** untuk mendapatkan data.
-   Tampilkan grafik penjualan dan notifikasi stok menipis.

### 2.3. Point of Sale (POS)
-   **Layout Terpadu**: Beralih antara mode "Produk Jadi" dan "Isi Ulang".
-   **Mode Produk Jadi**: Tampilkan katalog produk dari koleksi `products` di Firestore.
-   **Mode Isi Ulang (Refill)**:
    -   **Langkah 1: Pilih Grade**: Ambil data dari koleksi `grades`.
    -   **Langkah 2: Pilih Aroma**: Ambil data dari koleksi `aromas`.
    -   **Langkah 3: Pilih Ukuran Botol**: Ambil data dari koleksi `bottle_sizes`.
    -   **Kalkulasi Harga**: Harga dihitung berdasarkan resep dari koleksi `recipes` dan atribut dari `grades`.
-   **Keranjang Belanja**: Tampilkan item yang ditambahkan dan terapkan promosi dari koleksi `promotions`.
-   **Proses Checkout**:
    -   Pilih pelanggan dari koleksi `customers`.
    -   Saat "Bayar" ditekan, panggil **Cloud Function `process_checkout`** untuk memastikan transaksi atomik.
    -   Setelah berhasil, tawarkan opsi cetak struk.

### 2.4. Manajemen Data
- Implementasikan fungsionalitas CRUD (Create, Read, Update, Delete) penuh untuk modul-modul berikut, dengan query yang difilter berdasarkan `selectedOrganizationId`.
-   **Produk**: Koleksi `products`.
-   **Inventaris**: Koleksi `raw_materials`.
-   **Pelanggan**: Koleksi `customers`.
-   **Pengguna**: Panggil **Cloud Function `createUser`** dan `deleteUser` untuk mengelola staf.

### 2.5. Pengaturan
- Buat halaman di mana pengguna (`owner`) dapat mengelola data di koleksi `grades`, `aromas`, `bottle_sizes`, `promotions`, dll.

### 2.6. Integrasi Perangkat Keras
- **Cetak Struk**: Implementasikan fungsionalitas untuk mencari dan terhubung dengan printer.

---

## 3. Skema Database Firestore (Untuk Referensi)

Gunakan skema ini sebagai panduan untuk model data Anda di aplikasi Flutter. Lihat `workspace/docs/blueprint.md` untuk detail lengkap.

### Koleksi Inti:
-   **`organizations`**: `{ id, name, parent_organization_id, ... }`
-   **`profiles`**: `{ id, email, full_name, organization_id, role }`

### Koleksi Data (Semua memiliki `organization_id`):
-   `products`
-   `raw_materials`
-   `customers`
-   `transactions`, `transaction_items`
-   `promotions`
-   `grades`, `aromas`, `bottle_sizes`, `recipes`

---

## 4. Prinsip Arsitektur & Kode

-   **Struktur Proyek Modular**: Pisahkan kode berdasarkan fitur atau lapisan.
-   **Pemisahan Tanggung Jawab (BLoC)**:
    -   **UI (Widgets)**: Menampilkan state, mengirim event.
    -   **BLoC**: Logika bisnis, memanggil repository.
    -   **Repository**: Berinteraksi dengan Firestore dan Cloud Functions.
-   **Penanganan Error & Loading**: Gunakan state `error` dan `loading` dalam BLoC untuk memberikan feedback yang jelas kepada pengguna.

Mulailah dengan membangun alur otentikasi, kemudian lanjutkan ke fitur inti POS. Selamat bekerja!
