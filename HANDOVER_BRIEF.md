# Rangkuman Serah Terima Proyek: ScentPOS

Dokumen ini menyediakan ringkasan komprehensif tentang status proyek ScentPOS saat ini dan prompt detail agar developer AI baru dapat melanjutkan pekerjaan dengan lancar.

---

## Bagian 1: Ringkasan & Kemajuan Proyek

Kita memulai dengan aplikasi Next.js yang memiliki UI fungsional tetapi masih menggunakan data statis. Tujuan utamanya adalah untuk menghubungkannya ke backend Supabase dan mengembangkannya menjadi aplikasi multi-toko (multi-tenant) yang siap untuk produksi.

**Pencapaian Utama:**

1.  **Arsitektur Database Multi-Toko:**
    *   Skema database di Supabase telah dirancang dan diimplementasikan untuk mendukung banyak organisasi (toko) dan outlet.
    *   Tabel inti yang dibuat meliputi `organizations` (dengan relasi `parent_organization_id` untuk struktur hierarki outlet), `profiles` (untuk menyimpan peran dan menghubungkan `auth.users` ke `organizations`), serta tabel data (`products`, `transactions`, `customers`, `raw_materials`, dll.) yang semuanya memiliki kolom `organization_id` untuk isolasi data.

2.  **Keamanan Data dengan RLS:**
    *   Row-Level Security (RLS) telah berhasil diimplementasikan pada semua tabel data penting dan tabel `profiles`. Ini memastikan bahwa pengguna dari satu organisasi tidak dapat secara tidak sengaja (atau sengaja) mengakses data dari organisasi lain.

3.  **Fondasi Backend (API Routes):**
    *   Serangkaian API Route yang aman di Next.js telah dibangun untuk menangani semua logika bisnis:
        *   Pendaftaran pemilik toko (`/api/auth/signup-owner`) yang secara otomatis membuat pengguna, organisasi induk, dan profil.
        *   Fungsionalitas CRUD (Create, Read, Update, Delete) penuh untuk manajemen pengguna (`/api/users`) dan organisasi (`/api/organizations`), lengkap dengan pemeriksaan izin berbasis peran.

4.  **Integrasi Frontend & Manajemen State:**
    *   `AuthContext` aplikasi telah direfaktor total menjadi sumber kebenaran tunggal (single source of truth) yang didukung oleh Supabase Auth.
    *   Context ini sekarang juga mengelola state global untuk `selectedOrganizationId` (outlet yang sedang aktif dipilih).
    *   Halaman UI fungsional untuk **Manajemen Organisasi** dan **Manajemen Pengguna** telah berhasil dibuat dan diintegrasikan.
    *   Menu navigasi di dashboard dibuat dinamis, hanya menampilkan menu manajemen kepada pengguna dengan peran 'admin' atau 'owner'.

5.  **Adaptasi Modul Inti:**
    *   Halaman **Inventaris** (`/dashboard/inventory`) dan **Produk** (`/dashboard/products`) telah sepenuhnya diadaptasi untuk mengambil dan menyimpan data berdasarkan outlet yang dipilih.
    *   Halaman **Point of Sale (POS)** (`/dashboard/pos`) telah berhasil diadaptasi untuk **membaca** data dinamis (produk, pelanggan, promosi) dari Supabase.

6.  **Fungsionalitas Transaksi Inti (Pencapaian Terakhir):**
    *   Sebuah **Fungsi RPC (PostgreSQL Function)** bernama `process_checkout` telah dibuat di Supabase untuk menangani seluruh proses checkout sebagai satu transaksi atomik (membuat record transaksi, item, dan memperbarui stok).
    *   Fungsi `handleCheckout` di halaman POS berhasil diimplementasikan untuk memanggil RPC ini, menjadikan alur penjualan inti **sepenuhnya berfungsi** dalam arsitektur multi-toko.

**Status Proyek Saat Ini:** Aplikasi telah bertransformasi dari prototipe statis menjadi aplikasi web multi-tenant dengan fondasi backend dan keamanan yang kuat. Alur penjualan intinya sudah berfungsi. Tantangan berikutnya adalah menstabilkan halaman POS dan memindahkan sisa-sisa data statis ke database.

---

## Bagian 2: Prompt Serah Terima untuk AI Berikutnya

*Anda dapat menyalin dan menempelkan seluruh teks berikut ke AI lain.*

**Prompt:**

Anda adalah seorang AI software engineer ahli dengan spesialisasi pada tumpukan teknologi Next.js (App Router), TypeScript, Supabase, dan Tailwind CSS. Anda akan mengambil alih pengembangan aplikasi Point of Sale (POS) bernama ScentPOS.

**Tujuan Proyek:**
ScentPOS adalah aplikasi POS komprehensif untuk bisnis parfum, mendukung penjualan produk jadi dan layanan isi ulang kustom dalam arsitektur multi-toko (multi-tenant) yang aman.

**Konteks & Arsitektur Saat Ini:**
Proyek ini telah melalui fase pengembangan yang signifikan. Berikut adalah status arsitektur saat ini:
*   **Backend & Database:** Menggunakan Supabase. Skema database dirancang untuk multi-tenancy. Tabel `organizations` menggunakan `parent_organization_id` untuk hierarki outlet. Tabel `profiles` menghubungkan `auth.users` ke `organizations` dan menyimpan peran ('owner', 'admin', 'cashier'). Semua tabel data utama (`products`, `transactions`, `customers`, `raw_materials`, dll.) memiliki kolom `organization_id` untuk partisi data.
*   **Keamanan:** Row-Level Security (RLS) diaktifkan dan dikonfigurasi pada semua tabel data dan tabel `profiles`, memastikan isolasi data yang ketat antar organisasi.
*   **Transaksi Inti:** Proses checkout ditangani oleh Fungsi RPC (PostgreSQL Function) di Supabase bernama `process_checkout`. Fungsi ini secara atomik membuat record di `transactions` dan `transaction_items`, serta memperbarui stok di `products`.
*   **Frontend:** Dibangun dengan Next.js App Router dan TypeScript.
    *   **Manajemen State:** `AuthContext` (`src/context/auth-context.tsx`) berfungsi sebagai state manager global. Ini menangani state otentikasi Supabase (`user`, `profile`, `loading`) dan ID outlet yang dipilih secara global (`selectedOrganizationId`).
    *   **Halaman yang Telah Diadaptasi:** Halaman Inventaris (`/dashboard/inventory`), Produk (`/dashboard/products`), Manajemen Pengguna (`/dashboard/users`), dan Manajemen Organisasi (`/dashboard/organizations`) sudah terintegrasi penuh dengan backend dan `AuthContext`. Halaman Point of Sale (POS) (`/dashboard/pos`) sudah berhasil diadaptasi untuk membaca data dinamis, dan fungsi checkout-nya sudah terhubung ke RPC.
    *   **Navigasi:** Layout dashboard (`/dashboard/layout.tsx`) memiliki navigasi sadar peran dan "Outlet Selector" yang dinamis.

**Status Proyek Saat Ini:**
Alur penjualan inti di halaman POS berfungsi, namun file `src/app/dashboard/pos/page.tsx` baru-baru ini mengalami beberapa error TypeScript (seperti `Property 'id' does not exist on type 'never'`) karena kompleksitas dalam menangani data dinamis. Selain itu, bagian "Formulir Isi Ulang Kustom" (Refill Form) di halaman ini masih menggunakan data statis.

**TUGAS UTAMA ANDA SAAT INI:**
Tugas Anda adalah **menstabilkan, memperbaiki, dan menyelesaikan adaptasi file `src/app/dashboard/pos/page.tsx`** dengan menghilangkan semua data statis yang tersisa.

**Langkah-langkah yang harus Anda lakukan:**
1.  **Koreksi & Stabilisasi (Prioritas Utama):** Tinjau `src/app/dashboard/pos/page.tsx` secara menyeluruh. Perbaiki semua error TypeScript yang tersisa. Pastikan kode tangguh dalam menangani state loading dan kemungkinan data `null` atau array kosong yang datang dari Supabase, terutama di dalam blok render `.map`.
2.  **Migrasi Data Statis ke Dinamis:** Setelah halaman stabil, lanjutkan tugas migrasi:
    *   **Modifikasi `fetchPosData`:** Perbarui fungsi `useEffect` ini. Selain mengambil data produk, pelanggan, dan promosi, tambahkan query untuk mengambil data dari tabel `grades`, `aromas`, `bottle_sizes`, dan `recipes` dari Supabase, difilter berdasarkan `selectedOrganizationId`.
    *   **Buat State Baru:** Buat variabel state `useState` baru di komponen `PosPage` untuk menyimpan data yang baru diambil (contoh: `const [grades, setGrades] = useState<Grade[]>([]);`).
    *   **Hapus Data Statis:** Hapus array statis untuk `grades`, `aromas`, `bottleSizes`, dan `recipes`.
    *   **Adaptasi Komponen `RefillForm`:** Pastikan semua elemen UI di `RefillForm` (seperti `Select` dan `Combobox`) sekarang menggunakan data dari state dinamis yang baru.

---

**Rencana Jangka Panjang (Setelah Tugas Utama Selesai):**

Rencana pengembangan selanjutnya dibagi menjadi prioritas jangka pendek untuk menyelesaikan fungsionalitas inti, dan visi jangka panjang sesuai dengan blueprint awal aplikasi.

### Prioritas Jangka Pendek:
1.  **Bangun Halaman Pengaturan Fungsional:** Buat antarmuka pengguna (UI) di `/dashboard/settings` yang memungkinkan admin/owner untuk mengelola data bisnis inti secara dinamis, termasuk data di tabel `grades`, `aromas`, `recipes`, dan `settings` (seperti aturan loyalitas).
2.  **Sempurnakan Halaman Laporan:** Buat halaman `/dashboard/reports` menjadi dinamis sepenuhnya, menampilkan data analitik dari tabel `transactions` dan `transaction_items`. Implementasikan kemampuan filter berdasarkan outlet dan rentang tanggal.
3.  **Polesan UI/UX Umum:** Lakukan perbaikan antarmuka dan pengalaman pengguna di seluruh aplikasi, seperti menambahkan notifikasi yang lebih baik, pagination, dan feedback loading yang lebih jelas.

### Visi Jangka Panjang (Sesuai Blueprint):
- **Peningkatan Kemampuan AI**: Manajemen inventaris prediktif dan rekomendasi wewangian yang dipersonalisasi.
- **Analitik Tingkat Lanjut**: Segmentasi pelanggan dan pelacakan kinerja pemasok.
- **Integrasi E-commerce**: Membangun toko online dengan sinkronisasi inventaris real-time.
- **Ekspansi Program Loyalitas**: Mengembangkan sistem loyalitas berjenjang dan hadiah yang bisa diotomatisasi.
- **Integrasi Gerbang Pembayaran**: Mendukung lebih banyak opsi pembayaran digital.
- **Optimasi Rantai Pasokan**: Fitur pemesanan ulang otomatis dan pelacakan batch/kedaluwarsa bahan baku.
