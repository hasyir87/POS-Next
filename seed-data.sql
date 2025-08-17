-- seed-data.sql

DO $$
DECLARE
    v_parent_org_id uuid;
    v_outlet_org_id uuid;
    v_owner_user_id uuid;
    v_admin_user_id uuid;
    v_cashier_user_id uuid;
    v_grade_standar_id uuid;
    v_grade_premium_id uuid;
    v_aroma_sandalwood_id uuid;
    v_aroma_vanilla_id uuid;
    v_aroma_ysl_id uuid;
    v_aroma_baccarat_id uuid;
    v_aroma_aqua_id uuid;
    v_aroma_creed_id uuid;
    v_bottle_30_id uuid;
    v_bottle_50_id uuid;
    v_bottle_100_id uuid;
BEGIN
    -- Bersihkan data lama untuk menghindari konflik (opsional, tapi bagus untuk testing)
    DELETE FROM recipes;
    DELETE FROM bottle_sizes;
    DELETE FROM aromas;
    DELETE FROM grades;
    DELETE FROM transaction_items;
    DELETE FROM transactions;
    DELETE FROM products;
    DELETE FROM promotions;
    DELETE FROM customers;
    DELETE FROM profiles;
    DELETE FROM organizations;
    -- Jangan hapus user dari auth.users agar tidak perlu signup ulang terus
    -- Cukup update atau pastikan mereka ada

    -- 1. Buat Pengguna di Auth jika belum ada dan tetapkan password
    -- Supabase akan membuat user jika email belum terdaftar
    PERFORM auth.email_change_password('owner@mperfumeamal.com', 'password123');
    PERFORM auth.email_change_password('admin@mperfumeamal.com', 'password123');
    PERFORM auth.email_change_password('kasir@mperfumeamal.com', 'password123');

    -- Ambil UUID pengguna dari auth.users
    SELECT id INTO v_owner_user_id FROM auth.users WHERE email = 'owner@mperfumeamal.com';
    SELECT id INTO v_admin_user_id FROM auth.users WHERE email = 'admin@mperfumeamal.com';
    SELECT id INTO v_cashier_user_id FROM auth.users WHERE email = 'kasir@mperfumeamal.com';

    -- Pastikan UUID tidak null
    IF v_owner_user_id IS NULL OR v_admin_user_id IS NULL OR v_cashier_user_id IS NULL THEN
        RAISE EXCEPTION 'Could not find user UUIDs in auth.users. Seeding cannot continue.';
    END IF;

    -- 2. Buat Organisasi Induk
    INSERT INTO organizations (name) VALUES ('M Perfume Amal Group') RETURNING id INTO v_parent_org_id;

    -- 3. Buat Outlet/Cabang
    INSERT INTO organizations (name, parent_organization_id) VALUES ('M Perfume Amal - Jakarta Pusat', v_parent_org_id) RETURNING id INTO v_outlet_org_id;
    INSERT INTO organizations (name, parent_organization_id) VALUES ('M Perfume Amal - Bandung', v_parent_org_id);

    -- 4. Buat Profil Pengguna dan hubungkan ke organisasi
    INSERT INTO profiles (id, email, full_name, role, organization_id) VALUES
    (v_owner_user_id, 'owner@mperfumeamal.com', 'Pemilik Toko', 'owner', v_parent_org_id),
    (v_admin_user_id, 'admin@mperfumeamal.com', 'Admin Jakarta', 'admin', v_outlet_org_id),
    (v_cashier_user_id, 'kasir@mperfumeamal.com', 'Kasir Jakarta', 'cashier', v_outlet_org_id);

    -- 5. Seed Data untuk Pengaturan Refill (Grades, Aromas, Bottle Sizes, Recipes)
    -- Ini semua terkait dengan outlet Jakarta
    INSERT INTO grades (organization_id, name, price_multiplier, extra_essence_price) VALUES
    (v_outlet_org_id, 'Standar', 1.0, 2000) RETURNING id INTO v_grade_standar_id;
    
    INSERT INTO grades (organization_id, name, price_multiplier, extra_essence_price) VALUES
    (v_outlet_org_id, 'Premium', 1.2, 3500) RETURNING id INTO v_grade_premium_id;

    -- Aromas
    INSERT INTO aromas (organization_id, name, category) VALUES
    (v_outlet_org_id, 'Sandalwood Supreme', 'Woody') RETURNING id INTO v_aroma_sandalwood_id;
    INSERT INTO aromas (organization_id, name, category) VALUES
    (v_outlet_org_id, 'Vanilla Orchid', 'Sweet') RETURNING id INTO v_aroma_vanilla_id;
    INSERT INTO aromas (organization_id, name, category) VALUES
    (v_outlet_org_id, 'YSL Black Opium', 'Spicy') RETURNING id INTO v_aroma_ysl_id;
    INSERT INTO aromas (organization_id, name, category) VALUES
    (v_outlet_org_id, 'Baccarat Rouge', 'Sweet') RETURNING id INTO v_aroma_baccarat_id;
    INSERT INTO aromas (organization_id, name, category) VALUES
    (v_outlet_org_id, 'Aqua di Gio', 'Fresh') RETURNING id INTO v_aroma_aqua_id;
    INSERT INTO aromas (organization_id, name, category) VALUES
    (v_outlet_org_id, 'Creed Aventus', 'Fruity') RETURNING id INTO v_aroma_creed_id;

    -- Bottle Sizes
    INSERT INTO bottle_sizes (organization_id, size, unit, price) VALUES
    (v_outlet_org_id, 30, 'ml', 10000) RETURNING id INTO v_bottle_30_id;
    INSERT INTO bottle_sizes (organization_id, size, unit, price) VALUES
    (v_outlet_org_id, 50, 'ml', 15000) RETURNING id INTO v_bottle_50_id;
    INSERT INTO bottle_sizes (organization_id, size, unit, price) VALUES
    (v_outlet_org_id, 100, 'ml', 25000) RETURNING id INTO v_bottle_100_id;
    
    -- Recipes
    INSERT INTO recipes (organization_id, name, grade_id, aroma_id, bottle_size_id, price) VALUES
    (v_outlet_org_id, 'Sandalwood 30ml Standar', v_grade_standar_id, v_aroma_sandalwood_id, v_bottle_30_id, 50000),
    (v_outlet_org_id, 'Sandalwood 50ml Standar', v_grade_standar_id, v_aroma_sandalwood_id, v_bottle_50_id, 80000),
    (v_outlet_org_id, 'YSL 50ml Premium', v_grade_premium_id, v_aroma_ysl_id, v_bottle_50_id, 90000),
    (v_outlet_org_id, 'Creed 100ml Premium', v_grade_premium_id, v_aroma_creed_id, v_bottle_100_id, 200000);

    -- 6. Seed Data untuk Produk Jadi (untuk outlet Jakarta)
    INSERT INTO products (organization_id, name, description, price, stock, image_url) VALUES
    (v_outlet_org_id, 'Ocean Breeze', 'A fresh aquatic scent.', 79990, 15, 'https://placehold.co/100x100.png'),
    (v_outlet_org_id, 'Mystic Woods', 'A deep, woody fragrance.', 85000, 10, 'https://placehold.co/100x100.png'),
    (v_outlet_org_id, 'Parfum Mini', 'A small sample perfume.', 25000, 50, 'https://placehold.co/100x100.png');
    
    -- 7. Seed Data Pelanggan (untuk outlet Jakarta)
    INSERT INTO customers (organization_id, name, email, phone, loyalty_points, transaction_count) VALUES
    (v_outlet_org_id, 'Andi Wijaya', 'andi.w@example.com', '081234567890', 100, 25),
    (v_outlet_org_id, 'Bunga Citra', 'bunga.c@example.com', '082345678901', 20, 9);
    
    -- 8. Seed Data Promosi (untuk outlet Jakarta)
    INSERT INTO promotions (organization_id, name, type, value, is_active) VALUES
    (v_outlet_org_id, 'Diskon Akhir Pekan', 'Persentase', 15, true),
    (v_outlet_org_id, 'Potongan Langsung', 'Nominal', 20000, true);
    
END $$;
