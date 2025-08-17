
-- Pastikan tidak ada data sensitif di sini.
-- Skrip ini untuk mengisi data dummy/awal.

DO $$
DECLARE
    v_parent_org_id UUID;
    v_outlet_org_id UUID;
    v_owner_user_id UUID;
    v_admin_user_id UUID;
    v_cashier_user_id UUID;
    v_grade_standard_id UUID;
    v_grade_premium_id UUID;
    v_aroma_baccarat_id UUID;
    v_aroma_blackopium_id UUID;
    v_aroma_creed_id UUID;
    v_aroma_sandalwood_id UUID;
    v_bottle_30ml_id UUID;
    v_bottle_50ml_id UUID;
    v_bottle_100ml_id UUID;
BEGIN
    -- 1. Buat Organisasi Induk & Outlet
    INSERT INTO organizations (name, address, phone) VALUES ('M Perfume Amal Group (Induk)', 'Jl. Sudirman No. 1, Jakarta', '021-1234567') RETURNING id INTO v_parent_org_id;
    INSERT INTO organizations (name, address, phone, parent_organization_id) VALUES ('M Perfume Amal - Jakarta Pusat', 'Jl. Thamrin No. 5, Jakarta', '021-7654321', v_parent_org_id) RETURNING id INTO v_outlet_org_id;

    -- 2. Buat Pengguna di auth.users dan profiles
    -- Penting: Kita buat user di auth.users dulu, baru di profiles.
    -- Kita gunakan email_change_password karena ini akan membuat user jika belum ada.
    SELECT auth.email_change_password('owner@mperfumeamal.com', 'password123') INTO v_owner_user_id;
    SELECT auth.email_change_password('admin@mperfumeamal.com', 'password123') INTO v_admin_user_id;
    SELECT auth.email_change_password('kasir@mperfumeamal.com', 'password123') INTO v_cashier_user_id;
    
    -- Dapatkan ID pengguna yang baru dibuat
    SELECT id INTO v_owner_user_id FROM auth.users WHERE email = 'owner@mperfumeamal.com';
    SELECT id INTO v_admin_user_id FROM auth.users WHERE email = 'admin@mperfumeamal.com';
    SELECT id INTO v_cashier_user_id FROM auth.users WHERE email = 'kasir@mperfumeamal.com';

    -- Sisipkan ke profiles
    INSERT INTO profiles (id, email, full_name, role, organization_id) VALUES
    (v_owner_user_id, 'owner@mperfumeamal.com', 'Pemilik Toko', 'owner', v_parent_org_id),
    (v_admin_user_id, 'admin@mperfumeamal.com', 'Admin Jakarta', 'admin', v_outlet_org_id),
    (v_cashier_user_id, 'kasir@mperfumeamal.com', 'Kasir Jakarta', 'cashier', v_outlet_org_id);

    -- 3. Buat Kategori Produk
    INSERT INTO categories (organization_id, name) VALUES (v_outlet_org_id, 'Parfum Pria'), (v_outlet_org_id, 'Parfum Wanita');

    -- 4. Buat Produk Jadi
    INSERT INTO products (organization_id, name, price, stock, description) VALUES
    (v_outlet_org_id, 'ScentPOS Ocean Breeze', 79990, 50, 'A fresh aquatic scent.'),
    (v_outlet_org_id, 'ScentPOS Mystic Woods', 85000, 30, 'A deep, woody fragrance.');

    -- 5. Buat Pelanggan
    INSERT INTO customers (organization_id, name, email, phone, transaction_count) VALUES
    (v_outlet_org_id, 'Andi Wijaya', 'andi.w@example.com', '081234567890', 25),
    (v_outlet_org_id, 'Bunga Citra', 'bunga.c@example.com', '082345678901', 9);

    -- 6. Buat Promosi
    INSERT INTO promotions (organization_id, name, type, value, is_active) VALUES
    (v_outlet_org_id, 'Diskon Akhir Pekan', 'Persentase', 15, true),
    (v_outlet_org_id, 'Potongan Langsung', 'Nominal', 20000, true);

    -- 7. Buat Data untuk Sistem Refill
    -- Grades
    INSERT INTO grades (organization_id, name, price_multiplier, extra_essence_price) VALUES
    (v_outlet_org_id, 'Standar', 1.0, 2000) RETURNING id INTO v_grade_standard_id,
    (v_outlet_org_id, 'Premium', 1.2, 3500) RETURNING id INTO v_grade_premium_id;

    -- Aromas
    INSERT INTO aromas (organization_id, name, category) VALUES
    (v_outlet_org_id, 'Baccarat Rouge', 'Unisex') RETURNING id INTO v_aroma_baccarat_id,
    (v_outlet_org_id, 'YSL Black Opium', 'Wanita') RETURNING id INTO v_aroma_blackopium_id,
    (v_outlet_org_id, 'Creed Aventus', 'Pria') RETURNING id INTO v_aroma_creed_id,
    (v_outlet_org_id, 'Sandalwood Supreme', 'Unisex') RETURNING id INTO v_aroma_sandalwood_id;

    -- Bottle Sizes
    INSERT INTO bottle_sizes (organization_id, size, unit, price) VALUES
    (v_outlet_org_id, 30, 'ml', 15000) RETURNING id INTO v_bottle_30ml_id,
    (v_outlet_org_id, 50, 'ml', 20000) RETURNING id INTO v_bottle_50ml_id,
    (v_outlet_org_id, 100, 'ml', 25000) RETURNING id INTO v_bottle_100ml_id;

    -- Recipes
    INSERT INTO recipes (organization_id, name, grade_id, aroma_id, bottle_size_id, price, instructions) VALUES
    -- Baccarat
    (v_outlet_org_id, 'Resep Baccarat 30ml', v_grade_premium_id, v_aroma_baccarat_id, v_bottle_30ml_id, 55000, '13ml bibit, 17ml camp.'),
    (v_outlet_org_id, 'Resep Baccarat 50ml', v_grade_premium_id, v_aroma_baccarat_id, v_bottle_50ml_id, 90000, '22ml bibit, 28ml camp.'),
    -- Sandalwood
    (v_outlet_org_id, 'Resep Sandalwood 30ml', v_grade_standard_id, v_aroma_sandalwood_id, v_bottle_30ml_id, 50000, '12ml bibit, 18ml camp.'),
    (v_outlet_org_id, 'Resep Sandalwood 50ml', v_grade_standard_id, v_aroma_sandalwood_id, v_bottle_50ml_id, 80000, '20ml bibit, 30ml camp.');

END $$;
