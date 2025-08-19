# Rangkuman Serah Terima Proyek: ScentPOS

Dokumen ini menyediakan ringkasan komprehensif tentang status proyek ScentPOS saat ini dan prompt detail agar developer AI baru dapat melanjutkan pekerjaan dengan lancar.

---

## Bagian 1: Ringkasan & Kemajuan Proyek

Proyek ScentPOS telah berhasil bertransisi dari prototipe statis menjadi aplikasi web multi-tenant yang fungsional dengan fondasi backend yang kuat. Aplikasi ini sekarang terhubung sepenuhnya ke Supabase, memanfaatkan otentikasi, database PostgreSQL, dan Row-Level Security (RLS) untuk isolasi data yang aman antar organisasi.

**Pencapaian Utama & Status Saat Ini:**

1.  **Arsitektur Database Multi-Toko (Live):**
    *   Skema database di Supabase telah diimplementasikan dan distabilkan. Ini mendukung banyak organisasi (induk) dan outlet (anak), dengan tabel data yang terisolasi melalui `organization_id`.
    *   Lihat skema lengkap di `docs/blueprint.md`.

2.  **Keamanan Data dengan RLS (Live & Teruji):**
    *   Row-Level Security (RLS) aktif pada semua tabel data penting. Ini secara ketat memberlakukan aturan bahwa pengguna hanya dapat mengakses data dari organisasi mereka sendiri.

3.  **Alur Otentikasi Stabil:**
    *   **Pendaftaran Pemilik (`/signup`)**: Pengguna dapat mendaftar sebagai pemilik baru. Alur ini secara atomik membuat entri di `auth.users`, membuat `organization` baru, dan membuat `profile` terkait dengan peran 'owner'. Proses ini ditangani oleh fungsi `signup_owner` di database untuk konsistensi.
    *   **Login & Manajemen Sesi**: Pengguna dapat login, dan sesi mereka dikelola dengan benar menggunakan Supabase Auth (SSR). Masalah persistensi sesi yang sebelumnya ada **telah diselesaikan**.
    *   **Middleware**: Rute dilindungi oleh middleware yang mengarahkan pengguna yang belum login ke halaman utama dan pengguna yang sudah login ke dasbor.

4.  **Konektivitas Backend & Frontend (Live):**
    *   **`AuthContext`**: Berfungsi sebagai sumber kebenaran tunggal untuk data pengguna, profil, dan sesi otentikasi. Ini juga mengelola `selectedOrganizationId` untuk konteks data di seluruh aplikasi.
    *   **API Routes**: Sebagian besar halaman manajemen (Produk, Inventaris, Anggota, Pengguna) sekarang mengambil dan menyimpan data secara dinamis melalui API route yang aman dan sadar-RLS.
    *   **Halaman POS**: Berhasil mengambil data dinamis (produk, pelanggan, promosi) dari Supabase. Alur checkout inti berfungsi, memanggil fungsi `process_checkout` di database untuk transaksi atomik.

**Status Proyek Saat Ini:** Aplikasi berada dalam kondisi yang stabil. Fondasi backend, otentikasi, dan keamanan data sudah matang. Alur penjualan inti dan beberapa modul manajemen dasar sudah berfungsi dengan data live. Fokus sekarang dapat beralih dari perbaikan bug ke pengembangan fitur.

---

## Bagian 2: Tantangan & Pelajaran

Proses stabilisasi mengungkap beberapa pelajaran penting:
*   **Eksekusi Skrip SQL**: Skrip setup database harus sepenuhnya *idempotent* (dapat dijalankan berulang kali). Ini dicapai dengan menggunakan `DROP...IF EXISTS...CASCADE` untuk semua objek (tabel, fungsi, kebijakan, trigger) sebelum membuatnya kembali.
*   **Penanganan Error API**: Validasi dan penanganan error harus dilakukan di beberapa lapisan. Fungsi database harus melemparkan error yang spesifik (misalnya, `user_exists`), dan API frontend harus menangkap error ini untuk memberikan umpan balik yang kontekstual kepada pengguna.
*   **Inisialisasi Klien Supabase**: Pada Next.js, klien Supabase (terutama yang menggunakan `service_role_key`) harus diinisialisasi di dalam lingkup fungsi *request* (misalnya, di dalam `POST`), bukan di level modul, untuk memastikan variabel lingkungan dimuat dengan benar.

---

## Bagian 3: Prompt Serah Terima untuk AI Berikutnya

*Anda dapat menyalin dan menempelkan seluruh teks berikut ke AI lain.*

**Prompt:**

Anda adalah seorang AI software engineer ahli dengan spesialisasi pada tumpukan teknologi Next.js (App Router), TypeScript, Supabase, dan Tailwind CSS. Anda akan melanjutkan pengembangan aplikasi Point of Sale (POS) multi-tenant bernama ScentPOS.

**Konteks & Arsitektur Saat Ini:**
Proyek ini telah melalui fase stabilisasi yang signifikan. Fondasi backend menggunakan Supabase (Auth, PostgreSQL, RLS) sudah kuat dan berfungsi. Masalah otentikasi dan persistensi sesi telah diperbaiki. Aplikasi ini berhasil mengimplementasikan arsitektur multi-tenant di mana data diisolasi per organisasi.

**Blueprint & Skema Database:**
Dokumentasi lengkap mengenai arsitektur, fitur, dan skema database dapat ditemukan di **`docs/blueprint.md`**. Harap tinjau dokumen ini secara menyeluruh sebelum memulai.

**TUGAS PRIORITAS BERIKUTNYA:**
Fokus utama sekarang beralih dari perbaikan infrastruktur ke pengembangan fitur.

1.  **Selesaikan Migrasi Data Statis**:
    *   Tinjau semua halaman (terutama `/dashboard/reports`, `/dashboard/accounts`, `/dashboard/shifts`) dan ganti semua data *hardcoded* (seperti `initialExpenseHistory`) dengan panggilan API yang sesuai untuk mengambil data dari Supabase berdasarkan `selectedOrganizationId`.
    *   Pastikan semua fungsionalitas CRUD (Tambah, Ubah, Hapus) di halaman-halaman tersebut terhubung ke backend.

2.  **Sempurnakan Halaman Pengaturan (`/dashboard/settings`)**:
    *   Saat ini, halaman pengaturan sebagian besar masih menggunakan state lokal.
    *   Buat agar setiap perubahan pada pengaturan (misalnya, Atribut Inventaris, Loyalitas, Promosi) benar-benar disimpan ke tabel `settings` atau tabel relevan lainnya di Supabase untuk outlet yang dipilih.

3.  **Laporan Dinamis**:
    *   Buat halaman `/dashboard/reports` menjadi dinamis sepenuhnya. Laporan laba rugi harus dihasilkan dengan menghitung data dari tabel `transactions` dan `expenses` untuk rentang tanggal yang dipilih.

**Status Modul:**
*   ✅ Authentication & Authorization (RLS, Signup, Login, Middleware)
*   ✅ User & Organization Management (Dasar)
*   ✅ Product & Inventory Management (Dasar)
*   ✅ Core Transaction Flow (via RPC `process_checkout`)
*   ⚠️ POS Page (Fungsional, tapi bisa disempurnakan)
*   ⚠️ Settings Page (UI ada, tapi belum menyimpan data)
*   ❌ Reports Page (Masih menggunakan data statis)
*   ❌ Accounts Page (Masih menggunakan data statis)
*   ❌ Shifts Page (Masih menggunakan data statis)

**Teknologi Stack:**
*   Frontend: Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui
*   Backend: Supabase (PostgreSQL + Auth + RLS)
*   State Management: React Context (AuthProvider)

Fokus utama Anda adalah mengubah sisa komponen aplikasi dari prototipe berbasis state lokal menjadi aplikasi yang sepenuhnya terintegrasi dengan backend Supabase.

---

## Rencana Jangka Panjang (Setelah Tugas Utama Selesai)

1.  **Integrasi E-commerce (Tokopedia, Shopee)**: Mengubah ScentPOS menjadi pusat manajemen inventaris omnichannel.
2.  **Polesan UI/UX**: Implementasikan *loading state* yang lebih baik (seperti *skeleton loaders*), notifikasi *real-time*, dan pagination untuk semua tabel data.
3.  **Analitik & Dasbor Lanjutan**: Buat dasbor utama menjadi dinamis sepenuhnya, menampilkan KPI nyata dari database.
4.  **Peningkatan AI**: Implementasikan fitur seperti manajemen inventaris prediktif atau rekomendasi produk/aroma yang dipersonalisasi menggunakan Genkit.
5.  **Program Loyalitas & Shift**: Implementasikan logika penuh untuk sistem loyalitas dan manajemen shift.
