-- setup-rls.sql

-- Pastikan ekstensi yang dibutuhkan aktif
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Hapus fungsi dan trigger lama jika ada untuk pembersihan
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(p_user_id uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_organization_id(p_user_id uuid) CASCADE;

-- Hapus tabel yang ada untuk memulai dari awal (urutan penting karena ada foreign key)
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.transaction_items CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.recipes CASCADE;
DROP TABLE IF EXISTS public.promotions CASCADE;
DROP TABLE IF EXISTS public.raw_materials CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.bottle_sizes CASCADE;
DROP TABLE IF EXISTS public.aromas CASCADE;
DROP TABLE IF EXISTS public.grades CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- Hapus tipe data custom jika ada
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.promotion_type CASCADE;
DROP TYPE IF EXISTS public.transaction_status CASCADE;
DROP TYPE IF EXISTS public.payment_method CASCADE;


-- Buat tipe data ENUM untuk peran, promosi, dll.
CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'cashier', 'superadmin');
CREATE TYPE public.promotion_type AS ENUM ('Persentase', 'Nominal', 'BOGO');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash', 'qris', 'debit');

-- Tabel organizations
CREATE TABLE public.organizations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    address text,
    phone text,
    logo_url text,
    parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.organizations IS 'Tabel untuk menyimpan data organisasi atau outlet.';

-- Tabel profiles, terhubung ke auth.users
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE,
    full_name text,
    avatar_url text,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    role user_role NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.profiles IS 'Tabel profil pengguna yang terhubung dengan auth.users dan organizations.';

-- Tabel categories
CREATE TABLE public.categories (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel products
CREATE TABLE public.products (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric(10, 2) NOT NULL CHECK (price >= 0),
    stock integer NOT NULL DEFAULT 0,
    category_id uuid REFERENCES public.categories(id),
    image_url text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel customers
CREATE TABLE public.customers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    loyalty_points integer DEFAULT 0,
    transaction_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel transactions
CREATE TABLE public.transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cashier_id uuid NOT NULL REFERENCES public.profiles(id),
    customer_id uuid REFERENCES public.customers(id),
    total_amount numeric(10, 2) NOT NULL,
    payment_method payment_method NOT NULL,
    status transaction_status NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel transaction_items
CREATE TABLE public.transaction_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id),
    raw_material_id uuid, -- akan dihubungkan jika ada tabel raw_materials
    quantity integer NOT NULL,
    price numeric(10, 2) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel promotions
CREATE TABLE public.promotions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    type promotion_type NOT NULL,
    value numeric NOT NULL,
    get_product_id uuid REFERENCES public.products(id),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel Grades (untuk refill)
CREATE TABLE public.grades (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
    extra_essence_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabel Aromas (untuk refill)
CREATE TABLE public.aromas (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabel Bottle Sizes (untuk refill)
CREATE TABLE public.bottle_sizes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    size INT NOT NULL,
    unit VARCHAR(10) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabel Recipes (untuk refill)
CREATE TABLE public.recipes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade_id uuid NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
    aroma_id uuid NOT NULL REFERENCES public.aromas(id) ON DELETE CASCADE,
    bottle_size_id uuid NOT NULL REFERENCES public.bottle_sizes(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);


---
--- RLS (ROW LEVEL SECURITY)
---

-- Aktifkan RLS untuk semua tabel
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aromas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bottle_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;


-- 1. Fungsi untuk sinkronisasi profil dan menambahkan custom claims ke JWT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- penting untuk bisa mengakses auth.users
SET search_path = public
AS $$
BEGIN
  -- Sisipkan baris baru ke tabel profiles
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'cashier'); -- Default role

  -- Tambahkan role dan organization_id ke custom claims di JWT
  -- Asumsikan organization_id akan diisi manual setelahnya oleh admin
  PERFORM set_claim(new.id, 'user_role', '"cashier"');
  PERFORM set_claim(new.id, 'organization_id', 'null');
  RETURN new;
END;
$$;

-- Trigger yang akan memanggil handle_new_user setiap kali ada user baru di auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. Fungsi untuk mengeksekusi SQL secara dinamis (untuk seeding)
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE sql;
END;
$$;


---
--- KEBIJAKAN RLS (POLICIES)
---

-- Hapus kebijakan lama jika ada
DROP POLICY IF EXISTS "Allow individual access" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow superadmin full access" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read organizations" ON public.organizations;
DROP POLICY IF EXISTS "Allow owners/admins to manage their organization data" ON public.organizations;
DROP POLICY IF EXISTS "Allow superadmin full access" ON public.organizations;
DROP POLICY IF EXISTS "Allow read access based on organization" ON public.products;
DROP POLICY IF EXISTS "Allow full access for org members" ON public.products;
-- (tambahkan drop policy lain jika diperlukan)


-- A. Kebijakan untuk `profiles`
CREATE POLICY "Allow individual read access" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Allow individual update access" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow admin to view users in their organization" ON public.profiles
  FOR SELECT USING (
    (auth.jwt() ->> 'user_role')::text IN ('admin', 'owner') AND
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
  );

CREATE POLICY "Allow owner to manage users in their organization" ON public.profiles
  FOR ALL USING (
    (auth.jwt() ->> 'user_role')::text = 'owner' AND
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
  );

CREATE POLICY "Allow superadmin full access" ON public.profiles
  FOR ALL USING ((auth.jwt() ->> 'user_role')::text = 'superadmin');


-- B. Kebijakan untuk `organizations`
CREATE POLICY "Allow users to see their own organization" ON public.organizations
  FOR SELECT USING (id = (auth.jwt() ->> 'organization_id')::uuid);
  
CREATE POLICY "Allow users to see child organizations" ON public.organizations
  FOR SELECT USING (parent_organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Allow owner to update their organization" ON public.organizations
  FOR UPDATE USING (
    (auth.jwt() ->> 'user_role')::text = 'owner' AND
    id = (auth.jwt() ->> 'organization_id')::uuid
  );
  
CREATE POLICY "Allow owner to create child organizations" ON public.organizations
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'user_role')::text = 'owner' AND
    parent_organization_id = (auth.jwt() ->> 'organization_id')::uuid
  );

CREATE POLICY "Allow superadmin full access" ON public.organizations
  FOR ALL USING ((auth.jwt() ->> 'user_role')::text = 'superadmin');


-- C. Kebijakan untuk tabel data lainnya (Contoh untuk products, bisa diterapkan ke yang lain)
CREATE POLICY "Allow read access based on organization" ON public.products
  FOR SELECT USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Allow full access for org members" ON public.products
  FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid)
  WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- Terapkan kebijakan serupa untuk tabel-tabel berikut:
-- categories, customers, transactions, transaction_items, promotions, grades, aromas, bottle_sizes, recipes
CREATE POLICY "Allow read access based on organization" ON public.categories FOR SELECT USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);
CREATE POLICY "Allow full access for org members" ON public.categories FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid) WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Allow read access based on organization" ON public.customers FOR SELECT USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);
CREATE POLICY "Allow full access for org members" ON public.customers FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid) WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Allow read access based on organization" ON public.transactions FOR SELECT USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);
CREATE POLICY "Allow full access for org members" ON public.transactions FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid) WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- Untuk transaction_items, kita cek berdasarkan transaction_id nya.
CREATE POLICY "Allow access based on parent transaction" ON public.transaction_items
  FOR ALL USING (
    (SELECT organization_id FROM transactions WHERE id = transaction_id) = (auth.jwt() ->> 'organization_id')::uuid
  );

CREATE POLICY "Allow read access based on organization" ON public.promotions FOR SELECT USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);
CREATE POLICY "Allow full access for org members" ON public.promotions FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid) WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Allow read access based on organization" ON public.grades FOR SELECT USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);
CREATE POLICY "Allow full access for org members" ON public.grades FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid) WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Allow read access based on organization" ON public.aromas FOR SELECT USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);
CREATE POLICY "Allow full access for org members" ON public.aromas FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid) WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Allow read access based on organization" ON public.bottle_sizes FOR SELECT USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);
CREATE POLICY "Allow full access for org members" ON public.bottle_sizes FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid) WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

CREATE POLICY "Allow read access based on organization" ON public.recipes FOR SELECT USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);
CREATE POLICY "Allow full access for org members" ON public.recipes FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid) WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::uuid);
