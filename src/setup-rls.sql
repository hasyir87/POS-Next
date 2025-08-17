-- Fungsi helper untuk mengeksekusi SQL dinamis
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT) RETURNS VOID AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- 1. Inisialisasi: Hapus tabel yang ada jika ada untuk memulai dari awal
DROP TABLE IF EXISTS "transaction_items" CASCADE;
DROP TABLE IF EXISTS "transactions" CASCADE;
DROP TABLE IF EXISTS "raw_materials" CASCADE;
DROP TABLE IF EXISTS "expenses" CASCADE;
DROP TABLE IF EXISTS "promotions" CASCADE;
DROP TABLE IF EXISTS "customers" CASCADE;
DROP TABLE IF EXISTS "products" CASCADE;
DROP TABLE IF EXISTS "categories" CASCADE;
DROP TABLE IF EXISTS "recipes" CASCADE;
DROP TABLE IF EXISTS "grades" CASCADE;
DROP TABLE IF EXISTS "aromas" CASCADE;
DROP TABLE IF EXISTS "bottle_sizes" CASCADE;
DROP TABLE IF EXISTS "settings" CASCADE;
DROP TABLE IF EXISTS "profiles" CASCADE;
DROP TABLE IF EXISTS "organizations" CASCADE;
DROP TYPE IF EXISTS "user_role" CASCADE;
DROP TYPE IF EXISTS "payment_method" CASCADE;
DROP TYPE IF EXISTS "transaction_status" CASCADE;
DROP TYPE IF EXISTS "promotion_type" CASCADE;

-- 2. Buat tipe ENUM untuk data yang terstruktur
CREATE TYPE user_role AS ENUM ('owner', 'cashier', 'admin', 'superadmin');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer', 'e_wallet', 'qris', 'debit');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE promotion_type AS ENUM ('Persentase', 'Nominal', 'BOGO');

-- 3. Buat tabel utama
-- Tabel Organisasi: untuk multi-tenancy (toko/outlet)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    logo_url TEXT,
    parent_organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON COLUMN organizations.parent_organization_id IS 'Untuk struktur hierarki (induk/cabang). Jika NULL, ini adalah organisasi induk.';

-- Tabel Profil Pengguna: menghubungkan auth.users dengan organisasi dan peran
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE profiles IS 'Menyimpan data tambahan pengguna yang tidak ada di auth.users.';

-- Tabel Kategori Produk
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Produk Jadi
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  category_id UUID REFERENCES categories(id),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Bahan Baku untuk refill
CREATE TABLE raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255),
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit VARCHAR(50) NOT NULL, -- e.g., ml, gr, pcs
  category VARCHAR(100), -- e.g., Bibit, Pelarut, Kemasan
  purchase_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Pelanggan
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  loyalty_points INT NOT NULL DEFAULT 0,
  transaction_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Transaksi
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cashier_id UUID NOT NULL REFERENCES profiles(id),
  customer_id UUID REFERENCES customers(id),
  total_amount NUMERIC(12, 2) NOT NULL,
  payment_method payment_method NOT NULL,
  status transaction_status NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Item Transaksi
CREATE TABLE transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  raw_material_id UUID REFERENCES raw_materials(id),
  quantity INT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Promosi
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type promotion_type NOT NULL,
  value NUMERIC(10, 2) NOT NULL,
  get_product_id UUID REFERENCES products(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel untuk sistem refill: Grade, Aroma, Ukuran Botol, Resep
CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
  extra_essence_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE aromas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bottle_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  size INT NOT NULL, -- e.g., 30, 50, 100
  unit VARCHAR(20) NOT NULL DEFAULT 'ml',
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  grade_id UUID REFERENCES grades(id),
  aroma_id UUID REFERENCES aromas(id),
  bottle_size_id UUID REFERENCES bottle_sizes(id),
  price NUMERIC(10, 2), -- Harga dasar resep
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Beban
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Pengaturan
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, key)
);

-- 4. Aktifkan Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE aromas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 5. Buat Fungsi Helper untuk RLS
-- Fungsi untuk mendapatkan ID organisasi pengguna
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT organization_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fungsi untuk mendapatkan peran pengguna
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS TEXT AS $$
BEGIN
  -- Baca peran dari klaim JWT, bukan dari tabel profiles, untuk menghindari rekursi
  RETURN (auth.jwt() ->> 'user_role');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Buat Kebijakan RLS (Policies)

-- PROFILES
-- Pengguna hanya bisa melihat/mengedit profilnya sendiri.
CREATE POLICY "Users can view and edit their own profile"
ON profiles FOR ALL
USING (auth.uid() = id);
-- Admin/Owner bisa melihat semua profil di dalam organisasinya.
CREATE POLICY "Admins and owners can view all profiles in their organization"
ON profiles FOR SELECT
USING (
  organization_id = get_user_organization_id() AND
  (get_user_role(auth.uid()) IN ('admin', 'owner'))
);

-- ORGANIZATIONS
-- Pengguna bisa melihat organisasi tempat mereka terdaftar.
CREATE POLICY "Users can view their own organization"
ON organizations FOR SELECT
USING (id = get_user_organization_id());
-- Owner bisa melihat outlet/cabang di bawah organisasi induknya.
CREATE POLICY "Owners can view their child organizations"
ON organizations FOR SELECT
USING (parent_organization_id = get_user_organization_id());

-- DATA TABLES (Products, Customers, etc.)
-- Kebijakan umum untuk semua tabel data yang memiliki organization_id
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN (
      'products', 'categories', 'raw_materials', 'customers',
      'transactions', 'promotions', 'grades', 'aromas', 'bottle_sizes',
      'recipes', 'expenses', 'settings'
    )
  LOOP
    EXECUTE format('
      CREATE POLICY "Users can only access data from their own organization"
      ON public.%I FOR ALL
      USING (organization_id = get_user_organization_id())
      WITH CHECK (organization_id = get_user_organization_id());
    ', t);
  END LOOP;
END;
$$;


-- TRANSACTION_ITEMS: Kebijakan khusus karena tidak punya organization_id
-- Pengguna bisa melihat item transaksi jika mereka bagian dari organisasi transaksi tsb.
CREATE POLICY "Users can access items of transactions in their organization"
ON transaction_items FOR ALL
USING (
  (
    SELECT organization_id FROM transactions
    WHERE id = transaction_items.transaction_id
  ) = get_user_organization_id()
);


-- 7. Tambahkan fungsi untuk checkout sebagai transaksi atomik
CREATE OR REPLACE FUNCTION process_checkout(
  p_organization_id UUID,
  p_cashier_id UUID,
  p_customer_id UUID,
  p_items JSON,
  p_total_amount NUMERIC,
  p_payment_method payment_method
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  item RECORD;
BEGIN
  -- 1. Buat record transaksi baru
  INSERT INTO transactions(organization_id, cashier_id, customer_id, total_amount, payment_method, status)
  VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
  RETURNING id INTO v_transaction_id;

  -- 2. Loop melalui item dan masukkan ke transaction_items & update stok
  FOR item IN SELECT * FROM json_to_recordset(p_items) AS x(product_id UUID, quantity INT, price NUMERIC)
  LOOP
    -- Masukkan ke item transaksi
    INSERT INTO transaction_items(transaction_id, product_id, quantity, price)
    VALUES (v_transaction_id, item.product_id, item.quantity, item.price);

    -- Update stok produk
    UPDATE products
    SET stock = stock - item.quantity
    WHERE id = item.product_id;
  END LOOP;

  -- 3. (Opsional) Update jumlah transaksi pelanggan jika ada
  IF p_customer_id IS NOT NULL THEN
    UPDATE customers
    SET transaction_count = transaction_count + 1
    WHERE id = p_customer_id;
  END IF;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Fungsi untuk update stok, bisa dipanggil terpisah jika perlu
CREATE OR REPLACE FUNCTION update_product_stock(p_product_id UUID, p_quantity_sold INT)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock = stock - p_quantity_sold
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;
