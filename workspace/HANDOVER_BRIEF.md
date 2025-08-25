# Rangkuman Serah Terima Proyek: ScentPOS

Dokumen ini menyediakan ringkasan komprehensif tentang status proyek ScentPOS saat ini dan prompt detail agar developer AI baru dapat melanjutkan pekerjaan dengan lancar.

---

## Bagian 1: Ringkasan & Kemajuan Proyek

Proyek ScentPOS telah berhasil bertransisi dari prototipe statis menjadi aplikasi web multi-tenant yang fungsional dengan fondasi backend Firebase yang kuat. Aplikasi ini sekarang terhubung sepenuhnya ke Firebase, memanfaatkan Authentication, Firestore sebagai database, dan Cloud Functions untuk logika backend yang aman.

**Pencapaian Utama & Status Saat Ini:**

1.  **Arsitektur Multi-Tenant (Live):**
    *   Struktur koleksi di Firestore telah diimplementasikan dan distabilkan. Ini mendukung banyak organisasi (induk) dan outlet (anak), dengan data yang terisolasi melalui `organization_id`.
    *   Lihat skema lengkap di `workspace/docs/blueprint.md`.

2.  **Keamanan Data dengan Aturan Keamanan (Live):**
    *   Aturan Keamanan Firestore diterapkan untuk memastikan pengguna hanya dapat mengakses data dari organisasi mereka sendiri.

3.  **Alur Otentikasi Stabil:**
    *   **Pendaftaran Pemilik (`/signup`)**: Pengguna dapat mendaftar sebagai pemilik baru. Alur ini memanggil Cloud Function `createOwner` yang secara atomik membuat entri di Firebase Auth, `organizations`, dan `profiles`.
    *   **Login & Manajemen Sesi**: Pengguna dapat login, dan sesi mereka dikelola dengan benar menggunakan Firebase Authentication SDK. Masalah persistensi sesi yang sebelumnya ada **telah diselesaikan**.
    *   **Middleware**: Rute dilindungi oleh middleware yang mengarahkan pengguna berdasarkan status otentikasi mereka.

4.  **Konektivitas Backend & Frontend (Live):**
    *   **`AuthContext`**: Berfungsi sebagai sumber kebenaran tunggal untuk data pengguna, profil, dan sesi otentikasi. Ini juga mengelola `selectedOrganizationId` untuk konteks data di seluruh aplikasi.
    *   **Cloud Functions**: Logika bisnis penting (pendaftaran, manajemen pengguna) ditangani oleh Cloud Functions yang aman.
    *   **Halaman Manajemen**: Sebagian besar halaman manajemen (Produk, Inventaris, Anggota, Pengguna) sekarang mengambil dan menyimpan data secara dinamis dari Firestore.
    *   **Halaman POS**: Berhasil mengambil data dinamis. Alur checkout inti perlu dihubungkan ke Cloud Function `process_checkout`.

**Status Proyek Saat Ini:** Aplikasi berada dalam kondisi stabil. Fondasi backend, otentikasi, dan keamanan data sudah matang. Alur pendaftaran dan beberapa modul manajemen dasar sudah berfungsi dengan data live. Fokus sekarang dapat beralih dari perbaikan bug ke pengembangan fitur.

---

## Bagian 2: Prompt Serah Terima untuk AI Berikutnya

*Anda dapat menyalin dan menempelkan seluruh teks berikut ke AI lain.*

**Prompt:**

Anda adalah seorang AI software engineer ahli dengan spesialisasi pada tumpukan teknologi Next.js (App Router), TypeScript, Firebase (Firestore, Auth, Functions), dan Tailwind CSS. Anda akan melanjutkan pengembangan aplikasi Point of Sale (POS) multi-tenant bernama ScentPOS.

**Konteks & Arsitektur Saat Ini:**
Proyek ini telah melalui fase stabilisasi yang signifikan. Fondasi backend menggunakan Firebase (Firestore untuk database, Authentication untuk sesi, dan Cloud Functions untuk logika bisnis) sudah kuat dan berfungsi. Masalah otentikasi dan persistensi sesi telah diperbaiki.

**Blueprint & Model Data:**
Dokumentasi lengkap mengenai arsitektur, fitur, dan model data Firestore dapat ditemukan di **`workspace/docs/blueprint.md`**. Harap tinjau dokumen ini secara menyeluruh sebelum memulai.

**TUGAS PRIORITAS BERIKUTNYA:**
Fokus utama sekarang beralih dari perbaikan infrastruktur ke pengembangan fitur.

1.  **Selesaikan Migrasi Data Statis**:
    *   Tinjau semua halaman yang tersisa (terutama `/dashboard/reports`, `/dashboard/accounts`, `/dashboard/shifts`) dan ganti semua data *hardcoded* dengan panggilan ke Firestore berdasarkan `selectedOrganizationId`.
    *   Pastikan semua fungsionalitas CRUD (Tambah, Ubah, Hapus) di halaman-halaman tersebut terhubung ke backend.

2.  **Sempurnakan Halaman Pengaturan (`/dashboard/settings`)**:
    *   Saat ini, halaman pengaturan sebagian besar masih menggunakan state lokal.
    *   Buat agar setiap perubahan pada pengaturan (misalnya, Atribut Inventaris, Loyalitas, Promosi) benar-benar disimpan ke koleksi yang relevan di Firestore untuk outlet yang dipilih.

3.  **Implementasikan `process_checkout`**:
    *   Buat dan implementasikan Cloud Function `process_checkout` untuk menangani transaksi secara atomik.
    *   Hubungkan tombol "Bayar" di halaman POS untuk memanggil fungsi ini dengan data keranjang belanja.

**Status Modul:**
*   ✅ Authentication & Authorization (Login, Signup, Middleware)
*   ✅ User Management (via Cloud Functions)
*   ✅ Product & Inventory Management (CRUD ke Firestore)
*   ✅ Member Management (CRUD ke Firestore)
*   ⚠️ POS Page (Fungsional, tapi checkout belum terhubung)
*   ⚠️ Settings Page (UI ada, tapi belum menyimpan data)
*   ❌ Reports Page (Masih menggunakan data statis)
*   ❌ Accounts Page (Masih menggunakan data statis)
*   ❌ Shifts Page (Masih menggunakan data statis)

**Teknologi Stack:**
*   Frontend: Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui
*   Backend: Firebase (Firestore, Auth, Cloud Functions)
*   State Management: React Context (AuthProvider)

Fokus utama Anda adalah mengubah sisa komponen aplikasi dari prototipe berbasis state lokal menjadi aplikasi yang sepenuhnya terintegrasi dengan backend Firebase.

---

## Rencana Jangka Panjang (Setelah Tugas Utama Selesai)

1.  **Integrasi E-commerce (Tokopedia, Shopee)**: Mengubah ScentPOS menjadi pusat manajemen inventaris omnichannel.
2.  **Polesan UI/UX**: Implementasikan *loading state* yang lebih baik (seperti *skeleton loaders*), notifikasi *real-time*, dan pagination untuk semua tabel data.
3.  **Analitik & Dasbor Lanjutan**: Buat dasbor utama menjadi dinamis sepenuhnya, menampilkan KPI nyata dari Firestore.
4.  **Peningkatan AI**: Memanfaatkan Genkit untuk fitur-fitur seperti prediksi penjualan atau rekomendasi produk.
5.  **Program Loyalitas & Shift**: Implementasikan logika penuh untuk sistem loyalitas dan manajemen shift.
