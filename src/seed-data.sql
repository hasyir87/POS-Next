-- Hapus data lama untuk memastikan data awal yang bersih
TRUNCATE TABLE organizations, profiles, products, promotions, customers, raw_materials, grades, aromas, bottle_sizes, recipes, expenses, settings, categories, transactions, transaction_items RESTART IDENTITY CASCADE;

DO $$
DECLARE
  v_owner_org_id UUID;
  v_outlet_1_id UUID;
  v_owner_id UUID;
  v_admin_id UUID;
  v_cashier_id UUID;
  v_customer_1_id UUID;
  v_customer_2_id UUID;
  v_product_1_id UUID;
  v_product_2_id UUID;
  v_product_3_id UUID;
  v_product_4_id UUID;
  v_grade_standar_id UUID;
  v_grade_premium_id UUID;
  v_aroma_sandalwood_id UUID;
  v_aroma_baccarat_id UUID;
  v_bottle_30_id UUID;
  v_bottle_50_id UUID;
BEGIN
  -- 1. Buat Organisasi Induk
  INSERT INTO organizations (name) VALUES ('ScentCorp Global') RETURNING id INTO v_owner_org_id;

  -- 2. Buat Outlet/Cabang
  INSERT INTO organizations (name, parent_organization_id) VALUES ('ScentPOS Jakarta', v_owner_org_id) RETURNING id INTO v_outlet_1_id;

  -- 3. Buat Pengguna di Auth dan Profil di Public
  -- Owner
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_sent_at, confirmed_at)
  VALUES (current_setting('app.instance_id')::UUID, 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'authenticated', 'authenticated', 'owner@scentpos.com', crypt('password123', gen_salt('bf')), NOW(), '', NULL, NULL, '{"provider":"email","providers":["email"]}', '{"user_role":"owner"}', NOW(), NOW(), '', '', NULL, NOW())
  RETURNING id INTO v_owner_id;
  INSERT INTO profiles (id, email, full_name, organization_id, role) VALUES (v_owner_id, 'owner@scentpos.com', 'Owner ScentPOS', v_owner_org_id, 'owner');

  -- Admin untuk Outlet Jakarta
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_sent_at, confirmed_at)
  VALUES (current_setting('app.instance_id')::UUID, 'b86dba71-0428-4342-9a52-9f3764831633', 'authenticated', 'authenticated', 'admin.jkt@scentpos.com', crypt('password123', gen_salt('bf')), NOW(), '', NULL, NULL, '{"provider":"email","providers":["email"]}', '{"user_role":"admin"}', NOW(), NOW(), '', '', NULL, NOW())
  RETURNING id INTO v_admin_id;
  INSERT INTO profiles (id, email, full_name, organization_id, role) VALUES (v_admin_id, 'admin.jkt@scentpos.com', 'Admin Jakarta', v_outlet_1_id, 'admin');

  -- Kasir untuk Outlet Jakarta
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_sent_at, confirmed_at)
  VALUES (current_setting('app.instance_id')::UUID, 'f2f5f18c-9a3b-4e8b-a8f8-3e4b3f17a1c2', 'authenticated', 'authenticated', 'cashier.jkt@scentpos.com', crypt('password123', gen_salt('bf')), NOW(), '', NULL, NULL, '{"provider":"email","providers":["email"]}', '{"user_role":"cashier"}', NOW(), NOW(), '', '', NULL, NOW())
  RETURNING id INTO v_cashier_id;
  INSERT INTO profiles (id, email, full_name, organization_id, role) VALUES (v_cashier_id, 'cashier.jkt@scentpos.com', 'Kasir Jakarta', v_outlet_1_id, 'cashier');

  -- 4. Buat Produk untuk Outlet Jakarta
  INSERT INTO products (organization_id, name, description, price, stock) VALUES
  (v_outlet_1_id, 'Ocean Breeze', 'A fresh and invigorating scent.', 79990, 15) RETURNING id INTO v_product_1_id,
  (v_outlet_1_id, 'Mystic Woods', 'A deep and earthy aroma.', 85000, 10) RETURNING id INTO v_product_2_id,
  (v_outlet_1_id, 'Citrus Grove', 'A zesty and vibrant fragrance.', 75500, 20) RETURNING id INTO v_product_3_id,
  (v_outlet_1_id, 'Parfum Mini', 'A small-sized perfume for travel.', 25000, 50) RETURNING id INTO v_product_4_id;

  -- 5. Buat Promosi untuk Outlet Jakarta
  INSERT INTO promotions (organization_id, name, type, value, get_product_id, is_active) VALUES
  (v_outlet_1_id, 'Diskon Akhir Pekan', 'Persentase', 15, NULL, true),
  (v_outlet_1_id, 'Potongan Langsung', 'Nominal', 20000, NULL, true),
  (v_outlet_1_id, 'Beli 1 Gratis 1 Parfum Mini', 'BOGO', v_product_4_id, NULL, true);

  -- 6. Buat Pelanggan untuk Outlet Jakarta
  INSERT INTO customers (organization_id, name, email, phone, transaction_count) VALUES
  (v_outlet_1_id, 'Andi Wijaya', 'andi.w@example.com', '081234567890', 25) RETURNING id INTO v_customer_1_id,
  (v_outlet_1_id, 'Bunga Citra', 'bunga.c@example.com', '082345678901', 9) RETURNING id INTO v_customer_2_id;

  -- 7. Buat Data untuk Sistem Refill
  INSERT INTO grades (organization_id, name, price_multiplier, extra_essence_price) VALUES
  (v_outlet_1_id, 'Standar', 1.0, 3000) RETURNING id INTO v_grade_standar_id,
  (v_outlet_1_id, 'Premium', 1.5, 5000) RETURNING id INTO v_grade_premium_id;

  INSERT INTO aromas (organization_id, name, category) VALUES
  (v_outlet_1_id, 'Sandalwood Supreme', 'Woody') RETURNING id INTO v_aroma_sandalwood_id,
  (v_outlet_1_id, 'Baccarat Rouge', 'Oriental') RETURNING id INTO v_aroma_baccarat_id;

  INSERT INTO bottle_sizes (organization_id, size, unit, price) VALUES
  (v_outlet_1_id, 30, 'ml', 5000) RETURNING id INTO v_bottle_30_id,
  (v_outlet_1_id, 50, 'ml', 8000) RETURNING id INTO v_bottle_50_id;
  
  -- Masukkan resep-resep
  INSERT INTO recipes (organization_id, name, grade_id, aroma_id, bottle_size_id, price) VALUES
  (v_outlet_1_id, 'Sandalwood 30ml Standar', v_grade_standar_id, v_aroma_sandalwood_id, v_bottle_30_id, 50000),
  (v_outlet_1_id, 'Sandalwood 50ml Standar', v_grade_standar_id, v_aroma_sandalwood_id, v_bottle_50_id, 80000),
  (v_outlet_1_id, 'Baccarat 30ml Premium', v_grade_premium_id, v_aroma_baccarat_id, v_bottle_30_id, 90000),
  (v_outlet_1_id, 'Baccarat 50ml Premium', v_grade_premium_id, v_aroma_baccarat_id, v_bottle_50_id, 150000);

  -- 8. Buat Pengaturan untuk Outlet Jakarta
  INSERT INTO settings (organization_id, key, value) VALUES
  (v_outlet_1_id, 'low_stock_threshold', '20'),
  (v_outlet_1_id, 'loyalty_threshold', '10'),
  (v_outlet_1_id, 'loyalty_reward_type', 'FreeProduct'),
  (v_outlet_1_id, 'loyalty_reward_value', v_product_4_id::text);

END $$;
