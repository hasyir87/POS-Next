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
    -   Isolasi data antar toko dijamin oleh Row-Level Security (RLS) di tingkat database.
-   **Manajemen Dasbor & Outlet**:
    -   Dasbor utama untuk ringkasan bisnis (KPI, penjualan, notifikasi).
    -   Kemampuan untuk beralih antar outlet/cabang yang dimiliki.
-   **Point of Sale (POS)**:
    -   Antarmuka kasir terpadu.
    -   Penjualan produk jadi dengan pencarian dan pemindai barcode.
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
-   **Backend**: Supabase (Auth, PostgreSQL, Storage, Functions)
-   **Styling**: Tailwind CSS
-   **UI**: ShadCN UI
-   **State Management**: React Context API
-   **AI**: Google Genkit

---

## 4. Skema Database (PostgreSQL di Supabase)

Ini adalah representasi dari arsitektur data inti aplikasi.

### 4.1. Tabel Inti & Otentikasi

**`organizations`**
Menyimpan data setiap entitas bisnis (toko induk atau cabang).

| Kolom                  | Tipe      | Deskripsi                                                        |
| ---------------------- | --------- | ---------------------------------------------------------------- |
| **`id`** (PK)          | `uuid`    | Kunci utama, auto-generate.                                      |
| `name`                 | `text`    | Nama unik dari organisasi atau outlet.                           |
| `address`              | `text`    | Alamat fisik.                                                    |
| `phone`                | `text`    | Nomor telepon.                                                   |
| `logo_url`             | `text`    | URL ke file logo di Supabase Storage.                            |
| `parent_organization_id` | `uuid` (FK) | Merujuk ke `organizations.id`. `NULL` jika ini adalah toko induk. |
| `is_setup_complete`    | `boolean` | Menandai apakah setup awal untuk outlet ini sudah selesai.       |
| `created_at`           | `timestamptz` | Waktu pembuatan record.                                          |
| `updated_at`           | `timestamptz` | Waktu pembaruan terakhir.                                        |

**`profiles`**
Menghubungkan pengguna di `auth.users` dengan organisasi dan peran mereka.

| Kolom             | Tipe          | Deskripsi                                                     |
| ----------------- | ------------- | ------------------------------------------------------------- |
| **`id`** (PK, FK) | `uuid`        | Kunci utama, sama dengan `auth.users.id`.                     |
| `email`           | `text`        | Email pengguna (duplikasi untuk kemudahan query).             |
| `full_name`       | `text`        | Nama lengkap pengguna.                                        |
| `avatar_url`      | `text`        | URL ke foto profil di Supabase Storage.                       |
| `organization_id` | `uuid` (FK)   | Menghubungkan pengguna ke `organizations.id` mereka.          |
| `role`            | `user_role` (Enum) | Peran pengguna: `owner`, `admin`, `cashier`, `superadmin`. |
| `created_at`      | `timestamptz` | Waktu pembuatan record.                                       |
| `updated_at`      | `timestamptz` | Waktu pembaruan terakhir.                                     |

### 4.2. Tabel Data Operasional

Semua tabel berikut memiliki kolom `organization_id` (FK) untuk memastikan isolasi data melalui RLS.

**`products`**: Produk jadi yang siap dijual.
- `id`, `organization_id`, `name`, `description`, `price`, `stock`, `category_id` (FK ke `categories`), `image_url`

**`raw_materials`**: Bahan baku untuk parfum refill.
- `id`, `organization_id`, `name`, `brand`, `quantity`, `unit`, `category`, `purchase_price`

**`customers`**: Database pelanggan.
- `id`, `organization_id`, `name`, `email`, `phone`, `loyalty_points`, `transaction_count`

**`transactions`**: Header untuk setiap transaksi penjualan.
- `id`, `organization_id`, `cashier_id` (FK ke `profiles`), `customer_id` (FK ke `customers`), `total_amount`, `payment_method`, `status`

**`transaction_items`**: Detail item dalam sebuah transaksi.
- `id`, `transaction_id` (FK ke `transactions`), `product_id` (FK ke `products`), `quantity`, `price`

**`promotions`**: Aturan promosi yang bisa diterapkan.
- `id`, `organization_id`, `name`, `type` (Enum: Persentase, Nominal, BOGO), `value`, `get_product_id` (FK ke `products`), `is_active`

**`expenses`**: Pencatatan beban operasional.
- `id`, `organization_id`, `date`, `category`, `description`, `amount`

### 4.3. Tabel Konfigurasi & Atribut

**`categories`**: Kategori untuk produk.
- `id`, `organization_id`, `name`

**`grades`**: Tingkatan kualitas parfum (misal: Standard, Premium).
- `id`, `organization_id`, `name`, `price_multiplier` (misal: 1.5x), `extra_essence_price`

**`aromas`**: Daftar aroma bibit yang tersedia.
- `id`, `organization_id`, `name`, `category`, `description`

**`bottle_sizes`**: Ukuran botol yang tersedia untuk refill.
- `id`, `organization_id`, `size` (misal: 50), `unit` (misal: 'ml'), `price`

**`recipes`**: Resep standar untuk kombinasi aroma dan botol.
- `id`, `organization_id`, `name`, `grade_id` (FK), `aroma_id` (FK), `bottle_size_id` (FK), `instructions`, `price`

**`settings`**: Tabel serbaguna untuk menyimpan pengaturan lain.
- `id`, `organization_id`, `key` (misal: 'loyalty_threshold'), `value`

---

## 5. Fungsi & Trigger Penting di Database

-   **`function handle_new_user()` & Trigger `on_auth_user_created`**:
    -   Secara otomatis membuat *record* di `public.profiles` setiap kali pengguna baru berhasil mendaftar di `auth.users`. Ini memastikan data pengguna dan profil selalu sinkron.

-   **`function signup_owner(...)`**:
    -   Fungsi RPC yang menangani seluruh alur pendaftaran pemilik baru secara atomik. Ini termasuk memeriksa duplikasi email/organisasi, membuat pengguna di `auth.users`, membuat record `organizations`, dan membuat record `profiles`.

-   **`function process_checkout(...)`**:
    -   Fungsi RPC untuk menangani checkout. Menerima detail pesanan (item, pelanggan, total) dan secara atomik membuat record di `transactions` & `transaction_items`, serta memperbarui stok produk di `products`.
