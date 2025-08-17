
-- Ekstensi untuk UUID jika belum ada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fungsi untuk mengeksekusi SQL dinamis (hanya untuk setup)
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT) RETURNS VOID AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- 1. Membuat Tabel
-- Tabel untuk Organisasi/Toko
DROP TABLE IF EXISTS organizations CASCADE;
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    logo_url TEXT,
    parent_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL, -- Untuk struktur cabang/outlet
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE organizations IS 'Menyimpan data setiap organisasi (toko induk) dan cabangnya (outlet).';

-- Tabel untuk Profil Pengguna (terhubung ke auth.users)
DROP TABLE IF EXISTS profiles CASCADE;
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'cashier', 'superadmin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE profiles IS 'Menyimpan data profil pengguna yang terhubung ke Supabase Auth dan organisasi.';

-- Tabel Kategori Produk
DROP TABLE IF EXISTS categories CASCADE;
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Produk Jadi
DROP TABLE IF EXISTS products CASCADE;
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    stock INT NOT NULL DEFAULT 0,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    image_url TEXT,
    tokopedia_product_id TEXT, -- ID Produk di Tokopedia
    shopee_product_id TEXT,    -- ID Produk di Shopee
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE products IS 'Menyimpan data produk jadi yang siap dijual.';
COMMENT ON COLUMN products.tokopedia_product_id IS 'ID unik produk ini di platform Tokopedia.';
COMMENT ON COLUMN products.shopee_product_id IS 'ID unik produk ini di platform Shopee.';


-- Tabel Bahan Baku
DROP TABLE IF EXISTS raw_materials CASCADE;
CREATE TABLE raw_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    quantity INT NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    purchase_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE raw_materials IS 'Menyimpan data inventaris bahan baku untuk refill.';

-- Tabel Pelanggan
DROP TABLE IF EXISTS customers CASCADE;
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    loyalty_points INT NOT NULL DEFAULT 0,
    transaction_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Transaksi
DROP TABLE IF EXISTS transactions CASCADE;
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cashier_id UUID NOT NULL REFERENCES profiles(id),
    customer_id UUID REFERENCES customers(id),
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    marketplace_name TEXT, -- Nama marketplace (e.g., 'tokopedia', 'shopee')
    marketplace_order_id TEXT, -- ID Order dari marketplace
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(marketplace_name, marketplace_order_id)
);
COMMENT ON TABLE transactions IS 'Mencatat semua transaksi penjualan, baik dari POS maupun marketplace.';
COMMENT ON COLUMN transactions.marketplace_name IS 'Asal marketplace jika transaksi berasal dari e-commerce.';
COMMENT ON COLUMN transactions.marketplace_order_id IS 'ID pesanan asli dari platform marketplace.';


-- Tabel Item Transaksi
DROP TABLE IF EXISTS transaction_items CASCADE;
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    raw_material_id UUID REFERENCES raw_materials(id),
    quantity INT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Promosi
DROP TABLE IF EXISTS promotions CASCADE;
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Persentase', 'Nominal', 'BOGO'
    value NUMERIC(10, 2) NOT NULL,
    get_product_id UUID REFERENCES products(id), -- Untuk promo BOGO
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Grade Parfum
DROP TABLE IF EXISTS grades CASCADE;
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.0,
    extra_essence_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Aroma
DROP TABLE IF EXISTS aromas CASCADE;
CREATE TABLE aromas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Ukuran Botol
DROP TABLE IF EXISTS bottle_sizes CASCADE;
CREATE TABLE bottle_sizes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    size INT NOT NULL,
    unit VARCHAR(20) NOT NULL,
    price NUMERIC(10, 2) NOT NULL, -- Harga botolnya saja
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Resep
DROP TABLE IF EXISTS recipes CASCADE;
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    grade_id UUID REFERENCES grades(id) ON DELETE CASCADE,
    aroma_id UUID REFERENCES aromas(id) ON DELETE CASCADE,
    bottle_size_id UUID REFERENCES bottle_sizes(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL, -- Harga dasar resep (sebelum pengali grade)
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Beban/Pengeluaran
DROP TABLE IF EXISTS expenses CASCADE;
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Pengaturan
DROP TABLE IF EXISTS settings CASCADE;
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, key)
);


-- 2. Mengaktifkan Row Level Security (RLS) pada semua tabel
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE aromas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;


-- 3. Fungsi Helper untuk RLS

-- Fungsi untuk mendapatkan klaim kustom dari JWT
CREATE OR REPLACE FUNCTION get_jwt_claim(claim_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('request.jwt.claims', true)::jsonb ->> claim_name;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL; -- Mengembalikan NULL jika klaim tidak ada atau terjadi error
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger untuk menambahkan klaim kustom (role dan organization_id) ke token JWT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
  v_org_id UUID;
BEGIN
  -- Ambil role dan organization_id dari tabel profiles
  SELECT role, organization_id INTO v_role, v_org_id
  FROM public.profiles
  WHERE id = new.id;

  -- Set klaim kustom
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', v_role, 'organization_id', v_org_id)
  WHERE id = new.id;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Menerapkan trigger ke tabel profiles
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_profile_update()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
  v_org_id UUID;
BEGIN
  -- Ambil role dan organization_id yang baru dari baris yang diupdate
  v_role := new.role;
  v_org_id := new.organization_id;

  -- Update klaim kustom di auth.users
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', v_role, 'organization_id', v_org_id)
  WHERE id = new.id;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger untuk update
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (old.role IS DISTINCT FROM new.role OR old.organization_id IS DISTINCT FROM new.organization_id)
  EXECUTE FUNCTION public.handle_profile_update();


-- 4. Membuat Kebijakan (Policies) RLS

-- Kebijakan untuk 'profiles'
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Superadmins can view all profiles" ON profiles;
CREATE POLICY "Superadmins can view all profiles" ON profiles FOR SELECT USING (get_jwt_claim('role') = 'superadmin');

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage profiles in their organization" ON profiles;
CREATE POLICY "Admins can manage profiles in their organization" ON profiles FOR ALL
USING (
  (get_jwt_claim('role') = 'admin' OR get_jwt_claim('role') = 'owner') AND
  get_jwt_claim('organization_id')::UUID = organization_id
);

DROP POLICY IF EXISTS "Superadmins can manage all profiles" ON profiles;
CREATE POLICY "Superadmins can manage all profiles" ON profiles FOR ALL USING (get_jwt_claim('role') = 'superadmin');

-- Kebijakan untuk 'organizations'
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization" ON organizations FOR SELECT
USING (id = get_jwt_claim('organization_id')::UUID);

DROP POLICY IF EXISTS "Superadmins can manage all organizations" ON organizations;
CREATE POLICY "Superadmins can manage all organizations" ON organizations FOR ALL USING (get_jwt_claim('role') = 'superadmin');


-- Kebijakan generik untuk tabel data lainnya (Products, Customers, dll.)
DO $$
DECLARE
    t_name TEXT;
BEGIN
    -- Daftar tabel yang menggunakan kebijakan RLS berbasis organisasi
    FOR t_name IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (
        'products', 'raw_materials', 'customers', 'transactions', 'promotions',
        'categories', 'grades', 'aromas', 'bottle_sizes', 'recipes', 'expenses', 'settings'
    )
    LOOP
        -- Hapus kebijakan yang ada untuk menghindari konflik
        EXECUTE format('DROP POLICY IF EXISTS "Allow full access based on organization" ON %I;', t_name);
        -- Buat kebijakan baru
        EXECUTE format('
            CREATE POLICY "Allow full access based on organization" ON %I FOR ALL
            USING (organization_id = get_jwt_claim(''organization_id'')::UUID)
            WITH CHECK (organization_id = get_jwt_claim(''organization_id'')::UUID);
        ', t_name);

        -- Kebijakan tambahan untuk Superadmin (opsional, tapi bagus untuk dimiliki)
        EXECUTE format('DROP POLICY IF EXISTS "Superadmins have full access" ON %I;', t_name);
        EXECUTE format('
            CREATE POLICY "Superadmins have full access" ON %I FOR ALL
            USING (get_jwt_claim(''role'') = ''superadmin'');
        ', t_name);
    END LOOP;
END;
$$;

-- Kebijakan untuk 'transaction_items'
DROP POLICY IF EXISTS "Allow access based on transaction organization" ON transaction_items;
CREATE POLICY "Allow access based on transaction organization" ON transaction_items FOR ALL
USING (
    transaction_id IN (
        SELECT id FROM transactions WHERE organization_id = get_jwt_claim('organization_id')::UUID
    )
);
DROP POLICY IF EXISTS "Superadmin full access on transaction items" ON transaction_items;
CREATE POLICY "Superadmin full access on transaction items" ON transaction_items FOR ALL
USING (get_jwt_claim('role') = 'superadmin');


-- 5. Stored Procedures (jika diperlukan)
-- Fungsi untuk checkout
CREATE OR REPLACE FUNCTION process_checkout(
    p_organization_id UUID,
    p_cashier_id UUID,
    p_customer_id UUID,
    p_items JSON,
    p_total_amount NUMERIC,
    p_payment_method TEXT
) RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    item JSON;
BEGIN
    -- 1. Buat record transaksi baru
    INSERT INTO transactions(organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    -- 2. Loop melalui item dan masukkan ke transaction_items & update stok
    FOR item IN SELECT * FROM json_array_elements(p_items)
    LOOP
        -- Masukkan ke transaction_items
        INSERT INTO transaction_items(transaction_id, product_id, quantity, price)
        VALUES (
            v_transaction_id,
            (item->>'product_id')::UUID,
            (item->>'quantity')::INT,
            (item->>'price')::NUMERIC
        );

        -- Update stok produk
        UPDATE products
        SET stock = stock - (item->>'quantity')::INT
        WHERE id = (item->>'product_id')::UUID;
    END LOOP;

    -- 3. Update jumlah transaksi pelanggan jika ada
    IF p_customer_id IS NOT NULL THEN
        UPDATE customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id;
    END IF;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Fungsi untuk update stok (jika dipanggil terpisah)
CREATE OR REPLACE FUNCTION update_product_stock(p_product_id UUID, p_quantity_sold INT)
RETURNS void AS $$
BEGIN
    UPDATE products
    SET stock = stock - p_quantity_sold
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;
