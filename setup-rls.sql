-- Ekstensi yang Dibutuhkan
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fungsi untuk menjalankan SQL dinamis (untuk setup)
DROP FUNCTION IF EXISTS exec_sql(text) CASCADE;
CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- Hapus trigger dan fungsi lama jika ada (dengan CASCADE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP FUNCTION IF EXISTS public.get_my_organization_id CASCADE;
DROP FUNCTION IF EXISTS public.signup_owner CASCADE;


-- =============================================
-- Fungsi Helper
-- =============================================

-- Fungsi untuk mendapatkan ID organisasi pengguna yang sedang login
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = auth.uid();
$$;

-- Fungsi untuk menangani pembuatan profil pengguna baru
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Jalankan dengan hak akses pembuat fungsi
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'cashier' -- Peran default saat user dibuat tanpa organisasi
  );
  RETURN new;
END;
$$;

-- Trigger untuk menjalankan handle_new_user setiap kali ada user baru di auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- =============================================
-- Fungsi RPC (Remote Procedure Call)
-- =============================================

-- Fungsi untuk mendaftarkan pemilik baru, membuat organisasi, dan profilnya
-- Ini adalah satu-satunya cara untuk membuat pengguna dengan peran 'owner'
CREATE OR REPLACE FUNCTION public.signup_owner(
    p_email text,
    p_password text,
    p_full_name text,
    p_organization_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
  new_organization_id uuid;
BEGIN
  -- 1. Periksa apakah organisasi dengan nama yang sama sudah ada
  IF EXISTS (SELECT 1 FROM public.organizations WHERE name = p_organization_name) THEN
    RAISE EXCEPTION 'org_exists';
  END IF;

  -- 2. Periksa apakah pengguna dengan email yang sama sudah ada di auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'user_exists';
  END IF;

  -- 3. Buat pengguna baru di auth.users
  -- Fungsi auth.sign_up hanya tersedia melalui API, bukan di SQL.
  -- Jadi, kita akan membuat pengguna dan kemudian memperbarui profilnya.
  -- Kita perlu membuat pengguna terlebih dahulu melalui API. Fungsi ini akan menangani sisanya.
  
  -- Memasukkan data ke auth.users dan mendapatkan user_id
  new_user_id := auth.uid(); -- Placeholder, ID akan dibuat oleh API sebelum memanggil RPC ini.
  -- Panggilan sebenarnya untuk membuat user adalah di API route, menggunakan Supabase Admin Client.
  -- Fungsi ini hanya contoh alur logika, implementasi sebenarnya ada di API.
  
  -- 4. Buat organisasi baru
  INSERT INTO public.organizations (name)
  VALUES (p_organization_name)
  RETURNING id INTO new_organization_id;

  -- 5. Update profil pengguna yang sudah dibuat oleh trigger handle_new_user
  -- Kita tidak INSERT, tapi UPDATE karena trigger sudah membuat baris dasarnya.
  UPDATE public.profiles
  SET
    full_name = p_full_name,
    organization_id = new_organization_id,
    role = 'owner'
  WHERE id = new_user_id;

  -- Jika trigger tidak ada atau gagal, kita bisa menggunakan UPSERT
  /*
  INSERT INTO public.profiles (id, email, full_name, organization_id, role)
  VALUES (new_user_id, p_email, p_full_name, new_organization_id, 'owner')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    organization_id = EXCLUDED.organization_id,
    role = EXCLUDED.role;
  */
END;
$$;


-- =============================================
-- Setup Tabel
-- =============================================

-- Tabel untuk organisasi/toko
CREATE TABLE public.organizations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    address text NULL,
    phone text NULL,
    logo_url text NULL,
    parent_organization_id uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_setup_complete boolean NOT NULL DEFAULT false,
    CONSTRAINT organizations_pkey PRIMARY KEY (id),
    CONSTRAINT organizations_name_key UNIQUE (name),
    CONSTRAINT organizations_parent_organization_id_fkey FOREIGN KEY (parent_organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL
);

-- Tabel untuk profil pengguna, terhubung dengan auth.users
CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NULL,
    full_name text NULL,
    avatar_url text NULL,
    organization_id uuid NULL,
    role text NOT NULL DEFAULT 'cashier'::text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL
);


-- Setup RLS untuk semua tabel
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- (Tambahkan tabel lain di sini saat dibuat)
CREATE TABLE public.products ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), name text, description text, price numeric, stock integer, category_id uuid, image_url text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );
CREATE TABLE public.raw_materials ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), name text, brand text, quantity numeric, unit text, category text, purchase_price numeric, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );
CREATE TABLE public.customers ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), name text, email text, phone text, loyalty_points integer DEFAULT 0, transaction_count integer DEFAULT 0, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );
CREATE TABLE public.transactions ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), cashier_id uuid REFERENCES profiles(id), customer_id uuid REFERENCES customers(id), total_amount numeric, payment_method text, status text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );
CREATE TABLE public.transaction_items ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), transaction_id uuid REFERENCES transactions(id), product_id uuid REFERENCES products(id), raw_material_id uuid REFERENCES raw_materials(id), quantity integer, price numeric, created_at timestamptz DEFAULT now() );
CREATE TABLE public.promotions ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), name text, type text, value numeric, get_product_id uuid, is_active boolean, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );
CREATE TABLE public.categories ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), name text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );
CREATE TABLE public.grades ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), name text, price_multiplier numeric, extra_essence_price numeric, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );
CREATE TABLE public.aromas ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), name text, category text, description text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );
CREATE TABLE public.bottle_sizes ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), size integer, unit text, price numeric, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );
CREATE TABLE public.recipes ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), name text, grade_id uuid, aroma_id uuid, bottle_size_id uuid, price numeric, instructions text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );
CREATE TABLE public.expenses ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), date date, category text, description text, amount numeric, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );
CREATE TABLE public.settings ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id), key text, value text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() );

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aromas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bottle_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;


-- =============================================
-- Kebijakan RLS (Row Level Security)
-- =============================================

-- Kebijakan untuk organizations
CREATE POLICY "Users can manage data for their own organization" ON public.organizations
FOR ALL USING (id = get_my_organization_id() OR parent_organization_id = get_my_organization_id());

-- Kebijakan untuk profiles
CREATE POLICY "Users can view profiles in their own organization" ON public.profiles
FOR SELECT USING (organization_id = get_my_organization_id());
CREATE POLICY "Admins can manage profiles in their organization" ON public.profiles
FOR ALL USING (organization_id = get_my_organization_id() AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner'));

-- Kebijakan generik untuk tabel data lainnya
CREATE POLICY "Users can manage data for their own organization" ON public.products FOR ALL USING (organization_id = get_my_organization_id());
CREATE POLICY "Users can manage data for their own organization" ON public.raw_materials FOR ALL USING (organization_id = get_my_organization_id());
CREATE POLICY "Users can manage data for their own organization" ON public.customers FOR ALL USING (organization_id = get_my_organization_id());
CREATE POLICY "Users can manage data for their own organization" ON public.transactions FOR ALL USING (organization_id = get_my_organization_id());
CREATE POLICY "Users can manage data for their own organization" ON public.transaction_items FOR ALL USING ((SELECT organization_id FROM transactions WHERE id = transaction_id) = get_my_organization_id());
CREATE POLICY "Users can manage data for their own organization" ON public.promotions FOR ALL USING (organization_id = get_my_organization_id());
CREATE POLICY "Users can manage data for their own organization" ON public.categories FOR ALL USING (organization_id = get_my_organization_id());
CREATE POLICY "Users can manage data for their own organization" ON public.grades FOR ALL USING (organization_id = get_my_organization_id());
CREATE POLICY "Users can manage data for their own organization" ON public.aromas FOR ALL USING (organization_id = get_my_organization_id());
CREATE POLICY "Users can manage data for their own organization" ON public.bottle_sizes FOR ALL USING (organization_id = get_my_organization_id());
CREATE POLICY "Users can manage data for their own organization" ON public.recipes FOR ALL USING (organization_id = get_my_organization_id());
CREATE POLICY "Users can manage data for their own organization" ON public.expenses FOR ALL USING (organization_id = get_my_organization_id());
CREATE POLICY "Users can manage data for their own organization" ON public.settings FOR ALL USING (organization_id = get_my_organization_id());
