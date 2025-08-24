# Blueprint Aplikasi: ScentPOS

Dokumen ini berfungsi sebagai panduan arsitektur dan teknis untuk aplikasi ScentPOS.

## 1. Visi & Tujuan

ScentPOS adalah solusi Point of Sale (POS) multi-tenant berbasis cloud yang dirancang khusus untuk memenuhi kebutuhan unik bisnis parfum. Tujuannya adalah untuk menyediakan platform yang intuitif, aman, dan dapat diskalakan untuk mengelola semua aspek operasional, mulai dari penjualan hingga manajemen inventaris, dalam satu dasbor terpadu.

**Model Bisnis yang Didukung:**
1.  **Toko Parfum Jadi**: Penjualan produk parfum yang sudah jadi.
2.  **Toko Parfum Isi Ulang (Refill)**: Penjualan parfum kustom yang diracik sesuai permintaan pelanggan.
3.  **Model Hibrida**: Toko yang melayani kedua model bisnis di atas.

## 2. Fitur Utama

-   **Otentikasi & Keamanan**:
    -   Pendaftaran pemilik toko (multi-tenant).
    -   Manajemen pengguna berbasis peran (Owner, Admin, Cashier).
    -   Isolasi data antar toko dijamin oleh Aturan Keamanan Firestore.
-   **Manajemen Dasbor & Outlet**:
    -   Dasbor utama untuk ringkasan bisnis (KPI, penjualan, notifikasi).
    -   Kemampuan untuk beralih antar outlet/cabang yang dimiliki.
-   **Point of Sale (POS)**:
    -   Antarmuka kasir terpadu.
    -   Penjualan produk jadi dengan pencarian.
    -   Formulir isi ulang dinamis untuk parfum kustom.
    -   Manajemen keranjang belanja.
    -   Integrasi dengan data pelanggan dan promosi.
-   **Manajemen Produk**:
    -   CRUD untuk produk jadi (nama, harga, stok, gambar).
    -   CRUD untuk bahan baku (bibit, pelarut, kemasan).
-   **Manajemen Pelanggan (CRM)**:
    -   Database pelanggan.
    -   Pelacakan riwayat transaksi.
    -   Sistem poin loyalitas.
-   **Manajemen Operasional**:
    -   Manajemen promosi (persentase, nominal, BOGO).
    -   Manajemen shift kasir (saldo awal, akhir).
    -   Pencatatan beban operasional.
    -   Laporan keuangan (laba rugi).
-   **Pengaturan Toko**:
    -   Konfigurasi atribut (kategori produk, grade parfum, ukuran botol).
    -   Manajemen outlet dan kunci API.

## 3. Tumpukan Teknologi

-   **Framework**: Next.js 15+ (App Router)
-   **Bahasa**: TypeScript
-   **Backend**: **Firebase** (Firestore, Authentication, Cloud Functions, Storage)
-   **Styling**: Tailwind CSS
-   **UI**: ShadCN UI
-   **State Management**: React Context API
-   **AI**: Google Genkit

---

## 4. Model Data (Firestore)

Ini adalah representasi dari arsitektur data inti aplikasi di Firestore. Setiap model merepresentasikan sebuah **koleksi**.

### 4.1. Koleksi Inti & Otentikasi

**`organizations`**
Menyimpan data setiap entitas bisnis (toko induk atau cabang).

| Field                  | Tipe      | Deskripsi                                                        |
| ---------------------- | --------- | ---------------------------------------------------------------- |
| **`(Document ID)`**    | `string`  | ID unik, auto-generate.                                        |
| `name`                 | `string`  | Nama unik dari organisasi atau outlet.                           |
| `address`              | `string`  | Alamat fisik.                                                    |
| `phone`                | `string`  | Nomor telepon.                                                   |
| `logo_url`             | `string`  | URL ke file logo di Firebase Storage.                            |
| `parent_organization_id`| `string`  | Merujuk ke ID dokumen lain di `organizations`. `null` jika induk.|
| `is_setup_complete`    | `boolean` | Menandai apakah setup awal untuk outlet ini sudah selesai.       |
| `created_at`           | `Timestamp` | Waktu pembuatan record.                                          |
| `updated_at`           | `Timestamp` | Waktu pembaruan terakhir.                                        |

**`profiles`**
Menghubungkan pengguna di Firebase Auth dengan organisasi dan peran mereka. ID dokumen sama dengan UID Firebase Auth.

| Field             | Tipe        | Deskripsi                                                     |
| ----------------- | ----------- | ------------------------------------------------------------- |
| **`(Document ID)`**| `string`    | ID unik, sama dengan `Firebase Auth UID`.                     |
| `email`           | `string`    | Email pengguna (duplikasi untuk kemudahan query).             |
| `full_name`       | `string`    | Nama lengkap pengguna.                                        |
| `avatar_url`      | `string`    | URL ke foto profil di Firebase Storage.                       |
| `organization_id` | `string`    | Menghubungkan pengguna ke dokumen di `organizations`.         |
| `role`            | `string`    | Peran pengguna: `owner`, `admin`, `cashier`, `superadmin`. |
| `created_at`      | `Timestamp` | Waktu pembuatan record.                                       |
| `updated_at`      | `Timestamp` | Waktu pembaruan terakhir.                                     |

### 4.2. Koleksi Data Operasional

Semua koleksi berikut memiliki field `organization_id` untuk menegakkan aturan keamanan.

**`products`**: Produk jadi yang siap dijual.
- `organization_id`, `name`, `description`, `price`, `stock`, `category_id`, `image_url`

**`raw_materials`**: Bahan baku untuk parfum refill.
- `organization_id`, `name`, `brand`, `quantity`, `unit`, `category`, `purchase_price`

**`customers`**: Database pelanggan.
- `organization_id`, `name`, `email`, `phone`, `loyalty_points`, `transaction_count`

**`transactions`**: Header untuk setiap transaksi penjualan.
- `organization_id`, `cashier_id` (UID dari `profiles`), `customer_id`, `total_amount`, `payment_method`, `status`

**`transaction_items`**: Detail item dalam sebuah transaksi.
- `transaction_id`, `product_id`, `quantity`, `price`

**`promotions`**: Aturan promosi yang bisa diterapkan.
- `organization_id`, `name`, `type` (`Persentase`, `Nominal`, `BOGO`), `value`, `get_product_id`, `is_active`

**`expenses`**: Pencatatan beban operasional.
- `organization_id`, `date`, `category`, `description`, `amount`

### 4.3. Koleksi Konfigurasi & Atribut

**`categories`**: Kategori untuk produk.
- `organization_id`, `name`

**`grades`**: Tingkatan kualitas parfum.
- `organization_id`, `name`, `price_multiplier`, `extra_essence_price`

**`aromas`**: Daftar aroma bibit yang tersedia.
- `organization_id`, `name`, `category`, `description`

**`bottle_sizes`**: Ukuran botol yang tersedia untuk refill.
- `organization_id`, `size` (number), `unit` ('ml'), `price`

**`recipes`**: Resep standar untuk kombinasi aroma dan botol.
- `organization_id`, `name`, `grade_id`, `aroma_id`, `bottle_size_id`, `instructions`, `price`

**`settings`**: Tabel serbaguna untuk menyimpan pengaturan lain.
- `organization_id`, `key` (e.g., 'loyalty_threshold'), `value`

---

## 5. Logika Backend (Firebase Cloud Functions)

-   **`createOwner`**:
    -   **Pemicu**: Dipanggil oleh klien (HTTPS Callable).
    -   **Tugas**: Menangani seluruh alur pendaftaran pemilik baru secara atomik: membuat pengguna di Auth, membuat dokumen `organizations`, dan membuat dokumen `profiles`. Melakukan rollback jika terjadi kegagalan.

-   **`createUser`**:
    -   **Pemicu**: Dipanggil oleh klien (HTTPS Callable).
    -   **Tugas**: Memungkinkan `owner` atau `admin` untuk membuat pengguna baru (misal, kasir) di dalam organisasi mereka.

-   **`deleteUser`**:
    -   **Pemicu**: Dipanggil oleh klien (HTTPS Callable).
    -   **Tugas**: Memungkinkan `owner` atau `admin` untuk menghapus pengguna dari organisasi mereka, termasuk menghapus profil dan akun Auth.

-   **`setupInitialData`**:
    -   **Pemicu**: Dipanggil oleh klien (HTTPS Callable) dari halaman setup.
    -   **Tugas**: Mengisi Firestore dengan data awal (kategori, grade) untuk organisasi yang baru dibuat.

-   **`get_dashboard_analytics`**:
    -   **Pemicu**: Dipanggil oleh klien (HTTPS Callable).
    -   **Tugas**: Menghitung data analitik untuk dasbor, seperti pendapatan harian.

-   **`process_checkout`**:
    -   **Pemicu**: Dipanggil oleh klien (HTTPS Callable).
    -   **Tugas**: Fungsi untuk menangani checkout. Menerima detail pesanan dan secara atomik membuat record di `transactions` & `transaction_items`, serta memperbarui stok. (Rencana implementasi).
