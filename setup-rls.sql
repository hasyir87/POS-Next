
-- Ekstensi untuk UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Hapus tabel jika sudah ada untuk memastikan setup yang bersih
DROP TABLE IF EXISTS "settings", "expenses", "recipes", "bottle_sizes", "aromas", "grades", "promotions", "transaction_items", "transactions", "customers", "raw_materials", "products", "categories", "profiles", "organizations" CASCADE;
DROP TYPE IF EXISTS "user_role", "promotion_type", "transaction_status", "payment_method" CASCADE;


-- Tipe Enum untuk peran pengguna, jenis promosi, dll.
CREATE TYPE "user_role" AS ENUM ('superadmin', 'owner', 'admin', 'cashier');
CREATE TYPE "promotion_type" AS ENUM ('Persentase', 'Nominal', 'BOGO');
CREATE TYPE "transaction_status" AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE "payment_method" AS ENUM ('cash', 'qris', 'debit');


-- Tabel untuk Organisasi/Toko
CREATE TABLE "organizations" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" text NOT NULL,
  "address" text,
  "phone" text,
  "logo_url" text,
  "parent_organization_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN "organizations"."parent_organization_id" IS 'Untuk struktur multi-outlet (induk-anak)';

-- Tabel untuk Profil Pengguna
CREATE TABLE "profiles" (
  "id" uuid PRIMARY KEY REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "email" text UNIQUE NOT NULL,
  "full_name" text,
  "avatar_url" text,
  "organization_id" uuid REFERENCES "organizations"("id") ON DELETE SET NULL,
  "role" user_role NOT NULL DEFAULT 'cashier',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Tabel untuk Kategori Produk
CREATE TABLE "categories" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Tabel untuk Produk Jadi
CREATE TABLE "products" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "price" real NOT NULL DEFAULT 0,
  "stock" integer NOT NULL DEFAULT 0,
  "category_id" uuid REFERENCES "categories"("id") ON DELETE SET NULL,
  "image_url" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Tabel untuk Bahan Baku (Inventaris)
CREATE TABLE "raw_materials" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "brand" text,
  "quantity" real NOT NULL DEFAULT 0,
  "unit" text NOT NULL,
  "category" text,
  "purchase_price" real NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Tabel untuk Pelanggan/Anggota
CREATE TABLE "customers" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "loyalty_points" integer NOT NULL DEFAULT 0,
  "transaction_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Tabel untuk Transaksi
CREATE TABLE "transactions" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "cashier_id" uuid NOT NULL REFERENCES "profiles"("id"),
  "customer_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
  "total_amount" real NOT NULL,
  "payment_method" payment_method NOT NULL,
  "status" transaction_status NOT NULL DEFAULT 'completed',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Tabel untuk Item Transaksi
CREATE TABLE "transaction_items" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "transaction_id" uuid NOT NULL REFERENCES "transactions"("id") ON DELETE CASCADE,
  "product_id" uuid REFERENCES "products"("id"),
  "raw_material_id" uuid REFERENCES "raw_materials"("id"),
  "quantity" integer NOT NULL,
  "price" real NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Tabel untuk Promosi
CREATE TABLE "promotions" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "type" promotion_type NOT NULL,
  "value" real NOT NULL,
  "get_product_id" uuid REFERENCES "products"("id"),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Tabel untuk Tingkatan/Grade Parfum
CREATE TABLE "grades" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "price_multiplier" real NOT NULL DEFAULT 1.0,
  "extra_essence_price" real NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Tabel untuk Aroma
CREATE TABLE "aromas" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "category" text,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Tabel untuk Ukuran Botol
CREATE TABLE "bottle_sizes" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "size" integer NOT NULL,
  "unit" text NOT NULL,
  "price" real NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Tabel untuk Resep Parfum
CREATE TABLE "recipes" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "grade_id" uuid NOT NULL REFERENCES "grades"("id"),
  "aroma_id" uuid NOT NULL REFERENCES "aromas"("id"),
  "bottle_size_id" uuid NOT NULL REFERENCES "bottle_sizes"("id"),
  "price" real NOT NULL,
  "instructions" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);


-- Tabel untuk Beban/Pengeluaran
CREATE TABLE "expenses" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "category" text NOT NULL,
  "description" text NOT NULL,
  "amount" real NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Tabel untuk Pengaturan
CREATE TABLE "settings" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "key" text NOT NULL,
  "value" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE("organization_id", "key")
);

---
--- KEBIJAKAN RLS (ROW LEVEL SECURITY)
---
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

-- Fungsi Helper untuk mendapatkan peran dari custom claims JWT
CREATE OR REPLACE FUNCTION get_my_claim(claim TEXT) RETURNS JSONB
    LANGUAGE sql STABLE
    AS $$
    select nullif(current_setting('request.jwt.claims', true), '')::jsonb->claim
$$;

-- Fungsi untuk memeriksa apakah pengguna adalah superadmin
CREATE OR REPLACE FUNCTION is_superadmin() RETURNS BOOLEAN
    LANGUAGE plpgsql STABLE
    AS $$
    BEGIN
      RETURN get_my_claim('user_role')::text = '"superadmin"';
    END;
$$;

-- Fungsi untuk mendapatkan organization_id dari profil pengguna
CREATE OR REPLACE FUNCTION get_my_organization_id() RETURNS UUID
    LANGUAGE sql STABLE
    AS $$
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Kebijakan untuk ORGANIZATIONS
DROP POLICY IF EXISTS "Superadmin can see all organizations" ON organizations;
CREATE POLICY "Superadmin can see all organizations" ON organizations FOR SELECT USING (is_superadmin());

DROP POLICY IF EXISTS "Owner can see their own and child organizations" ON organizations;
CREATE POLICY "Owner can see their own and child organizations" ON organizations FOR SELECT USING (
  (get_my_claim('user_role')::text = '"owner"') AND (id = get_my_organization_id() OR parent_organization_id = get_my_organization_id())
);

DROP POLICY IF EXISTS "Users can see their own organization" ON organizations;
CREATE POLICY "Users can see their own organization" ON organizations FOR SELECT USING (id = get_my_organization_id());

DROP POLICY IF EXISTS "Superadmin or Owner can insert organizations" ON organizations;
CREATE POLICY "Superadmin or Owner can insert organizations" ON organizations FOR INSERT WITH CHECK (
  is_superadmin() OR (get_my_claim('user_role')::text = '"owner"')
);

DROP POLICY IF EXISTS "Superadmin or Owner can update their organizations" ON organizations;
CREATE POLICY "Superadmin or Owner can update their organizations" ON organizations FOR UPDATE USING (
  is_superadmin() OR ((get_my_claim('user_role')::text = '"owner"') AND id = get_my_organization_id())
);

-- Kebijakan untuk PROFILES
DROP POLICY IF EXISTS "Users can see their own profile" ON profiles;
CREATE POLICY "Users can see their own profile" ON profiles FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins/Owners can see profiles in their organization" ON profiles;
CREATE POLICY "Admins/Owners can see profiles in their organization" ON profiles FOR SELECT USING (
  get_my_claim('user_role')::text IN ('"admin"', '"owner"') AND organization_id = get_my_organization_id()
);

DROP POLICY IF EXISTS "Superadmins can see all profiles" ON profiles;
CREATE POLICY "Superadmins can see all profiles" ON profiles FOR SELECT USING (is_superadmin());

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins/Owners can update profiles in their organization" ON profiles;
CREATE POLICY "Admins/Owners can update profiles in their organization" ON profiles FOR UPDATE USING (
  get_my_claim('user_role')::text IN ('"admin"', '"owner"') AND organization_id = get_my_organization_id()
) WITH CHECK (
  organization_id = get_my_organization_id()
);

-- Kebijakan Umum untuk tabel data (produk, pelanggan, dll.)
CREATE OR REPLACE FUNCTION create_data_rls_policies(table_name TEXT)
RETURNS void AS $$
BEGIN
  -- Hapus kebijakan lama jika ada
  EXECUTE format('DROP POLICY IF EXISTS "Allow ALL for Superadmins" ON %I;', table_name);
  EXECUTE format('DROP POLICY IF EXISTS "Allow FULL access for organization members" ON %I;', table_name);

  -- Kebijakan untuk Superadmin
  EXECUTE format('CREATE POLICY "Allow ALL for Superadmins" ON %I FOR ALL USING (is_superadmin());', table_name);

  -- Kebijakan untuk anggota organisasi
  EXECUTE format('CREATE POLICY "Allow FULL access for organization members" ON %I FOR ALL USING (organization_id = get_my_organization_id()) WITH CHECK (organization_id = get_my_organization_id());', table_name);
END;
$$ LANGUAGE plpgsql;

-- Terapkan kebijakan umum ke semua tabel data
SELECT create_data_rls_policies('products');
SELECT create_data_rls_policies('categories');
SELECT create_data_rls_policies('raw_materials');
SELECT create_data_rls_policies('customers');
SELECT create_data_rls_policies('transactions');
SELECT create_data_rls_policies('promotions');
SELECT create_data_rls_policies('grades');
SELECT create_data_rls_policies('aromas');
SELECT create_data_rls_policies('bottle_sizes');
SELECT create_data_rls_policies('recipes');
SELECT create_data_rls_policies('expenses');
SELECT create_data_rls_policies('settings');

-- Kebijakan khusus untuk TRANSACTION_ITEMS
DROP POLICY IF EXISTS "Allow access based on transaction organization" ON transaction_items;
CREATE POLICY "Allow access based on transaction organization" ON transaction_items FOR ALL
USING (
  is_superadmin() OR
  (
    (SELECT organization_id FROM transactions WHERE id = transaction_id) = get_my_organization_id()
  )
);

-- Fungsi RPC untuk Eksekusi SQL (Hanya untuk Superadmin)
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS void AS $$
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Only superadmins can execute raw SQL';
  END IF;
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- Fungsi untuk memperbarui stok produk
CREATE OR REPLACE FUNCTION update_product_stock(p_product_id uuid, p_quantity_sold integer)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET stock = stock - p_quantity_sold
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Fungsi untuk proses checkout
CREATE OR REPLACE FUNCTION process_checkout(
    p_organization_id uuid,
    p_cashier_id uuid,
    p_customer_id uuid,
    p_items jsonb,
    p_total_amount real,
    p_payment_method text
)
RETURNS uuid AS $$
DECLARE
    new_transaction_id uuid;
    item record;
BEGIN
    -- 1. Buat record transaksi baru
    INSERT INTO transactions(organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method::payment_method, 'completed')
    RETURNING id INTO new_transaction_id;

    -- 2. Loop melalui item dan masukkan ke transaction_items & update stok
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity integer, price real)
    LOOP
        INSERT INTO transaction_items(transaction_id, product_id, quantity, price)
        VALUES (new_transaction_id, item.product_id, item.quantity, item.price);

        -- Update stok produk
        PERFORM update_product_stock(item.product_id, item.quantity);
    END LOOP;

    -- 3. Update data pelanggan jika ada
    IF p_customer_id IS NOT NULL THEN
        UPDATE customers
        SET 
            transaction_count = transaction_count + 1,
            loyalty_points = loyalty_points + floor(p_total_amount / 10000) -- Contoh: 1 poin per Rp10.000
        WHERE id = p_customer_id;
    END IF;

    RETURN new_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk mengisi kolom email di profiles saat user baru dibuat
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger untuk memperbarui kolom updated_at secara otomatis
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Terapkan trigger ke semua tabel yang memiliki kolom updated_at
DO $$
DECLARE
    t_name TEXT;
BEGIN
    FOR t_name IN (SELECT table_name FROM information_schema.columns WHERE column_name = 'updated_at' AND table_schema = 'public')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS set_timestamp ON %I;', t_name);
        EXECUTE format('CREATE TRIGGER set_timestamp BEFORE UPDATE ON %I FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();', t_name);
    END LOOP;
END;
$$;

    