
-- Pastikan Anda menjalankan ini setelah skema tabel dan RLS dibuat.
-- Script ini akan menghapus data lama dan mengisi dengan data awal yang bersih.

-- Bersihkan data lama untuk menghindari konflik (opsional, tapi direkomendasikan untuk awal)
TRUNCATE TABLE transaction_items, transactions, products, raw_materials, customers, promotions, grades, aromas, bottle_sizes, recipes, expenses, settings, profiles, organizations RESTART IDENTITY CASCADE;

-- 1. Buat Organisasi Induk
-- Ganti 'ScentCorp' dengan nama organisasi Anda jika perlu.
INSERT INTO organizations (name) VALUES ('ScentCorp') RETURNING id;
-- (Ambil ID yang dikembalikan oleh query di atas, misalnya: 'org_uuid_1')
-- Untuk skrip ini, kita akan mengasumsikan ID-nya adalah '11111111-1111-1111-1111-111111111111' untuk konsistensi.
-- Anda bisa menggantinya dengan UUID yang sebenarnya jika perlu.
-- Untuk kemudahan, kita akan menggunakan subquery.

-- 2. Buat Pengguna (Owner)
-- CATATAN PENTING: Anda harus membuat pengguna ini melalui Supabase Auth UI (atau API) terlebih dahulu
-- dengan email 'owner@scentcorp.com' dan password. Lalu dapatkan ID-nya.
-- Untuk tujuan seeding, kita akan membuat entri profil secara manual.
-- Ganti 'a0f1d510-5fb3-456b-bc75-c7065a427430' dengan ID pengguna Auth yang sebenarnya.
INSERT INTO profiles (id, email, full_name, role, organization_id)
SELECT 'a0f1d510-5fb3-456b-bc75-c7065a427430', 'owner@scentcorp.com', 'Pemilik Toko', 'owner', id
FROM organizations WHERE name = 'ScentCorp';

-- 3. Buat Outlet/Cabang di bawah Organisasi Induk
INSERT INTO organizations (name, parent_organization_id)
SELECT 'ScentCorp - Jakarta Pusat', id FROM organizations WHERE name = 'ScentCorp';

INSERT INTO organizations (name, parent_organization_id)
SELECT 'ScentCorp - Bandung', id FROM organizations WHERE name = 'ScentCorp';

-- 4. Buat Pengguna lain (Admin & Kasir) untuk outlet Jakarta
-- Sama seperti owner, buat pengguna ini di Supabase Auth dulu dan ganti UUID-nya.
INSERT INTO profiles (id, email, full_name, role, organization_id)
SELECT 'a0f1d510-5fb3-456b-bc75-c7065a427431', 'admin.jkt@scentcorp.com', 'Admin Jakarta', 'admin', id
FROM organizations WHERE name = 'ScentCorp - Jakarta Pusat';

INSERT INTO profiles (id, email, full_name, role, organization_id)
SELECT 'a0f1d510-5fb3-456b-bc75-c7065a427432', 'kasir.jkt@scentcorp.com', 'Kasir Jakarta', 'cashier', id
FROM organizations WHERE name = 'ScentCorp - Jakarta Pusat';


-- 5. Isi Data untuk Outlet Jakarta Pusat
DO $$
DECLARE
    jakarta_org_id UUID;
    owner_id UUID;
    prod1_id UUID;
    prod2_id UUID;
    prod3_id UUID;
    cust1_id UUID;
    cust2_id UUID;
BEGIN
    -- Dapatkan ID yang relevan
    SELECT id INTO jakarta_org_id FROM organizations WHERE name = 'ScentCorp - Jakarta Pusat';
    SELECT id INTO owner_id FROM profiles WHERE email = 'owner@scentcorp.com';

    -- Produk
    INSERT INTO products (organization_id, name, description, price, stock) VALUES
    (jakarta_org_id, 'Ocean Breeze', 'Aroma segar lautan.', 80000, 50),
    (jakarta_org_id, 'Mystic Woods', 'Aroma hutan pinus yang menenangkan.', 85000, 30),
    (jakarta_org_id, 'Citrus Grove', 'Kesegaran jeruk di pagi hari.', 75000, 45)
    RETURNING id, id, id INTO prod1_id, prod2_id, prod3_id;

    -- Pelanggan (Customers)
    INSERT INTO customers (organization_id, name, email, phone, loyalty_points, transaction_count) VALUES
    (jakarta_org_id, 'Budi Santoso', 'budi.s@example.com', '081234567890', 150, 5),
    (jakarta_org_id, 'Siti Aminah', 'siti.a@example.com', '081234567891', 80, 2)
    RETURNING id, id INTO cust1_id, cust2_id;

    -- Transaksi
    INSERT INTO transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status) VALUES
    (jakarta_org_id, owner_id, cust1_id, 165000, 'qris', 'completed'),
    (jakarta_org_id, owner_id, cust2_id, 75000, 'cash', 'completed');

    -- Item Transaksi (detail dari transaksi di atas)
    INSERT INTO transaction_items (transaction_id, product_id, quantity, price)
    SELECT id, prod1_id, 1, 80000 FROM transactions WHERE customer_id = cust1_id;
    INSERT INTO transaction_items (transaction_id, product_id, quantity, price)
    SELECT id, prod2_id, 1, 85000 FROM transactions WHERE customer_id = cust1_id;

    INSERT INTO transaction_items (transaction_id, product_id, quantity, price)
    SELECT id, prod3_id, 1, 75000 FROM transactions WHERE customer_id = cust2_id;

END $$;

-- Konfirmasi data
SELECT o.name as organization_name, p.full_name, p.email, p.role
FROM profiles p
JOIN organizations o ON p.organization_id = o.id;

SELECT * FROM products;
