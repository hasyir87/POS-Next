-- seed-data.sql

-- Pastikan RLS dinonaktifkan sementara untuk proses seeding
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE promotions DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE grades DISABLE ROW LEVEL SECURITY;
ALTER TABLE aromas DISABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_sizes DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipes DISABLE ROW LEVEL SECURITY;


DO $$
DECLARE
    -- Deklarasi variabel untuk menyimpan ID yang akan digunakan kembali
    v_owner_user_id uuid;
    v_admin_user_id uuid;
    v_cashier_user_id uuid;
    v_parent_org_id uuid;
    v_outlet_jkt_id uuid;
    v_outlet_bdg_id uuid;
    v_category_parfum_id uuid;
    v_category_kemasan_id uuid;
    v_product_mini_id uuid;
    v_grade_standar_id uuid;
    v_grade_premium_id uuid;
    v_aroma_sandalwood_id uuid;
    v_aroma_vanilla_id uuid;
    v_aroma_ysl_id uuid;
    v_aroma_baccarat_id uuid;
    v_bottle_30_id uuid;
    v_bottle_50_id uuid;
    v_bottle_100_id uuid;
BEGIN
    -- 1. Buat Organisasi Induk
    INSERT INTO organizations (name) VALUES ('M Perfume Amal (Pusat)') RETURNING id INTO v_parent_org_id;

    -- 2. Buat Pengguna (Users)
    -- Karena kita tidak bisa membuat user di auth.users dari SQL, kita akan menggunakan UUID statis
    -- dan mengasumsikan pengguna ini sudah dibuat melalui API atau Supabase Studio.
    -- Ganti UUID ini dengan UUID pengguna asli dari Supabase Anda jika diperlukan.
    v_owner_user_id := '00000000-0000-0000-0000-000000000001';
    v_admin_user_id := '00000000-0000-0000-0000-000000000002';
    v_cashier_user_id := '00000000-0000-0000-0000-000000000003';

    -- 3. Buat Profil untuk Pengguna
    INSERT INTO profiles (id, email, full_name, role, organization_id) VALUES
    (v_owner_user_id, 'owner@mperfumeamal.com', 'Pemilik Toko', 'owner', v_parent_org_id),
    (v_admin_user_id, 'admin@mperfumeamal.com', 'Admin Jakarta', 'admin', v_parent_org_id),
    (v_cashier_user_id, 'kasir@mperfumeamal.com', 'Kasir Jakarta', 'cashier', v_parent_org_id);
    
    -- 4. Buat Outlet (sebagai sub-organisasi)
    INSERT INTO organizations (name, parent_organization_id) VALUES
    ('M Perfume Amal - Jakarta', v_parent_org_id) RETURNING id INTO v_outlet_jkt_id;
    
    INSERT INTO organizations (name, parent_organization_id) VALUES
    ('M Perfume Amal - Bandung', v_parent_org_id) RETURNING id INTO v_outlet_bdg_id;

    -- 5. Buat Kategori Produk
    INSERT INTO categories (organization_id, name) VALUES
    (v_parent_org_id, 'Parfum Jadi') RETURNING id INTO v_category_parfum_id;
    
    INSERT INTO categories (organization_id, name) VALUES
    (v_parent_org_id, 'Kemasan') RETURNING id INTO v_category_kemasan_id;

    -- 6. Seed Data Produk Jadi
    INSERT INTO products (organization_id, name, description, price, stock, category_id, image_url) VALUES
    (v_outlet_jkt_id, 'Ocean Breeze', 'A fresh scent of the sea.', 79990, 15, v_category_parfum_id, 'https://placehold.co/100x100.png'),
    (v_outlet_jkt_id, 'Mystic Woods', 'A deep, woody fragrance.', 85000, 10, v_category_parfum_id, 'https://placehold.co/100x100.png'),
    (v_outlet_jkt_id, 'Citrus Grove', 'A vibrant, citrusy aroma.', 75500, 20, v_category_parfum_id, 'https://placehold.co/100x100.png'),
    (v_outlet_jkt_id, 'Floral Fantasy', 'A bouquet of fresh flowers.', 92000, 8, v_category_parfum_id, 'https://placehold.co/100x100.png'),
    (v_outlet_jkt_id, 'Parfum Mini', 'A small bottle for travel.', 25000, 50, v_category_parfum_id, 'https://placehold.co/100x100.png') RETURNING id INTO v_product_mini_id;

    -- 7. Seed Data Bahan Baku (Raw Materials) untuk outlet Jakarta
    INSERT INTO raw_materials (organization_id, name, brand, quantity, unit, category, purchase_price) VALUES
    (v_outlet_jkt_id, 'Rose Absolute', 'Luxe Fragrance Co.', 50, 'ml', 'Bibit Parfum', 1500),
    (v_outlet_jkt_id, 'Jasmine Sambac', 'Aroma Natural', 350, 'ml', 'Bibit Parfum', 1800),
    (v_outlet_jkt_id, 'Ethanol', 'Generic Chemical', 5000, 'ml', 'Pelarut', 100);

    -- 8. Seed Data Pelanggan (Customers) untuk outlet Jakarta
    INSERT INTO customers (organization_id, name, email, phone, loyalty_points, transaction_count) VALUES
    (v_outlet_jkt_id, 'Andi Wijaya', 'andi.w@example.com', '081234567890', 120, 25),
    (v_outlet_jkt_id, 'Bunga Citra', 'bunga.c@example.com', '082345678901', 45, 9);
    
    -- 9. Seed Data Promosi untuk outlet Jakarta
    INSERT INTO promotions (organization_id, name, type, value, get_product_id, is_active) VALUES
    (v_outlet_jkt_id, 'Diskon Akhir Pekan', 'Persentase', 15, NULL, true),
    (v_outlet_jkt_id, 'Potongan Langsung', 'Nominal', 20000, NULL, true),
    (v_outlet_jkt_id, 'Beli 1 Gratis 1 Parfum Mini', 'BOGO', 1, v_product_mini_id, true);

    -- 10. Seed Data untuk Sistem Refill (berlaku untuk semua outlet di bawah parent org)
    -- Grades
    INSERT INTO grades (organization_id, name, price_multiplier, extra_essence_price) VALUES
    (v_parent_org_id, 'Standar', 1.0, 2500) RETURNING id INTO v_grade_standar_id;
    INSERT INTO grades (organization_id, name, price_multiplier, extra_essence_price) VALUES
    (v_parent_org_id, 'Premium', 1.2, 3500) RETURNING id INTO v_grade_premium_id;

    -- Aromas
    INSERT INTO aromas (organization_id, name, category, description) VALUES
    (v_parent_org_id, 'Sandalwood Supreme', 'Woody', 'A rich and creamy sandalwood scent.') RETURNING id INTO v_aroma_sandalwood_id;
    INSERT INTO aromas (organization_id, name, category, description) VALUES
    (v_parent_org_id, 'Vanilla Orchid', 'Gourmand', 'A sweet and comforting vanilla fragrance.') RETURNING id INTO v_aroma_vanilla_id;
    INSERT INTO aromas (organization_id, name, category, description) VALUES
    (v_parent_org_id, 'YSL Black Opium', 'Oriental', 'Inspired by the popular designer fragrance.') RETURNING id INTO v_aroma_ysl_id;
    INSERT INTO aromas (organization_id, name, category, description) VALUES
    (v_parent_org_id, 'Baccarat Rouge', 'Oriental Floral', 'Inspired by Maison Francis Kurkdjian.') RETURNING id INTO v_aroma_baccarat_id;

    -- Bottle Sizes
    INSERT INTO bottle_sizes (organization_id, size, unit, price) VALUES
    (v_parent_org_id, 30, 'ml', 10000) RETURNING id INTO v_bottle_30_id;
    INSERT INTO bottle_sizes (organization_id, size, unit, price) VALUES
    (v_parent_org_id, 50, 'ml', 15000) RETURNING id INTO v_bottle_50_id;
    INSERT INTO bottle_sizes (organization_id, size, unit, price) VALUES
    (v_parent_org_id, 100, 'ml', 20000) RETURNING id INTO v_bottle_100_id;

    -- Recipes
    -- Harga di sini adalah harga dasar HANYA untuk bibitnya, belum termasuk botol & pengali grade
    INSERT INTO recipes (organization_id, name, grade_id, aroma_id, bottle_size_id, price, instructions) VALUES
    (v_parent_org_id, 'Sandalwood 30ml Recipe', v_grade_standar_id, v_aroma_sandalwood_id, v_bottle_30_id, 45000, '12ml bibit, 18ml pelarut'),
    (v_parent_org_id, 'Sandalwood 50ml Recipe', v_grade_standar_id, v_aroma_sandalwood_id, v_bottle_50_id, 75000, '20ml bibit, 30ml pelarut'),
    (v_parent_org_id, 'YSL Black Opium 30ml Recipe', v_grade_premium_id, v_aroma_ysl_id, v_bottle_30_id, 60000, '13ml bibit, 17ml pelarut'),
    (v_parent_org_id, 'YSL Black Opium 50ml Recipe', v_grade_premium_id, v_aroma_ysl_id, v_bottle_50_id, 95000, '22ml bibit, 28ml pelarut'),
    (v_parent_org_id, 'Baccarat Rouge 50ml Recipe', v_grade_premium_id, v_aroma_baccarat_id, v_bottle_50_id, 110000, '25ml bibit, 25ml pelarut');

END $$;


-- Aktifkan kembali RLS setelah seeding selesai
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE aromas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
