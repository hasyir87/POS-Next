
-- Hapus semua objek yang ada untuk memastikan skrip bisa dijalankan ulang.
-- Menggunakan CASCADE untuk menghapus objek yang bergantung.
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.signup_owner(text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.process_checkout(uuid, uuid, uuid, jsonb, numeric, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_dashboard_analytics(uuid) CASCADE;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.organizations;
DROP POLICY IF EXISTS "Users can only see their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can only manage their own organization data" ON public.profiles;
DROP POLICY IF EXISTS "Users can only manage data in their own organization" ON public.products;
DROP POLICY IF EXISTS "Users can only manage data in their own organization" ON public.raw_materials;
DROP POLICY IF EXISTS "Users can only manage data in their own organization" ON public.customers;
DROP POLICY IF EXISTS "Users can only manage data in their own organization" ON public.transactions;
DROP POLICY IF EXISTS "Users can only manage data in their own organization" ON public.transaction_items;
DROP POLICY IF EXISTS "Users can only manage data in their own organization" ON public.promotions;
DROP POLICY IF EXISTS "Users can only manage data in their own organization" ON public.categories;
DROP POLICY IF EXISTS "Users can only manage data in their own organization" ON public.grades;
DROP POLICY IF EXISTS "Users can only manage data in their own organization" ON public.aromas;
DROP POLICY IF EXISTS "Users can only manage data in their own organization" ON public.bottle_sizes;
DROP POLICY IF EXISTS "Users can only manage data in their own organization" ON public.recipes;
DROP POLICY IF EXISTS "Users can only manage data in their own organization" ON public.expenses;
DROP POLICY IF EXISTS "Users can only manage data in their own organization" ON public.settings;
DROP TABLE IF EXISTS public.transaction_items CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.promotions CASCADE;
DROP TABLE IF EXISTS public.raw_materials CASCADE;
DROP TABLE IF EXISTS public.recipes CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.grades CASCADE;
DROP TABLE IF EXISTS public.aromas CASCADE;
DROP TABLE IF EXISTS public.bottle_sizes CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.payment_method CASCADE;
DROP TYPE IF EXISTS public.transaction_status CASCADE;
DROP TYPE IF EXISTS public.promotion_type CASCADE;

-- Buat tipe Enum untuk peran pengguna, metode pembayaran, dll.
CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'cashier', 'superadmin');
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'transfer', 'e_wallet', 'qris', 'debit');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE public.promotion_type AS ENUM ('Persentase', 'Nominal', 'BOGO');

-- Tabel untuk organisasi
CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    address text,
    phone text,
    logo_url text,
    parent_organization_id uuid REFERENCES public.organizations(id),
    is_setup_complete boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel untuk profil pengguna
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE,
    full_name text,
    avatar_url text,
    organization_id uuid REFERENCES public.organizations(id),
    role user_role DEFAULT 'cashier'::public.user_role NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel lainnya
CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    name text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    name text NOT NULL,
    description text,
    price numeric NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    category_id uuid REFERENCES public.categories(id),
    image_url text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.raw_materials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    name text NOT NULL,
    brand text,
    quantity numeric DEFAULT 0 NOT NULL,
    unit text NOT NULL,
    category text,
    purchase_price numeric DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    name text NOT NULL,
    email text,
    phone text,
    loyalty_points integer DEFAULT 0 NOT NULL,
    transaction_count integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    cashier_id uuid NOT NULL REFERENCES public.profiles(id),
    customer_id uuid REFERENCES public.customers(id),
    total_amount numeric NOT NULL,
    payment_method payment_method NOT NULL,
    status transaction_status DEFAULT 'completed'::public.transaction_status NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.transaction_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id),
    raw_material_id uuid REFERENCES public.raw_materials(id),
    quantity integer NOT NULL,
    price numeric NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.promotions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    name text NOT NULL,
    type promotion_type NOT NULL,
    value numeric NOT NULL,
    get_product_id uuid REFERENCES public.products(id),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.grades (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    name text NOT NULL,
    price_multiplier numeric DEFAULT 1.0 NOT NULL,
    extra_essence_price numeric DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.aromas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    name text NOT NULL,
    category text,
    description text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.bottle_sizes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    size integer NOT NULL,
    unit text NOT NULL,
    price numeric NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.recipes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    name text NOT NULL,
    grade_id uuid NOT NULL REFERENCES public.grades(id),
    aroma_id uuid NOT NULL REFERENCES public.aromas(id),
    bottle_size_id uuid NOT NULL REFERENCES public.bottle_sizes(id),
    price numeric NOT NULL,
    instructions text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    date date NOT NULL,
    category text NOT NULL,
    description text,
    amount numeric NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    key text NOT NULL,
    value text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (organization_id, key)
);

-- Fungsi untuk menyalin data dari auth.users ke public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger yang memanggil handle_new_user setiap kali ada user baru
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Fungsi untuk mendaftar sebagai pemilik
CREATE OR REPLACE FUNCTION public.signup_owner(
    p_email text,
    p_password text,
    p_full_name text,
    p_organization_name text
)
RETURNS void AS $$
DECLARE
  new_user_id uuid;
  new_org_id uuid;
  existing_org_id uuid;
BEGIN
  -- 1. Periksa apakah nama organisasi sudah ada
  SELECT id INTO existing_org_id FROM public.organizations WHERE name = p_organization_name;
  IF FOUND THEN
    RAISE EXCEPTION 'org_exists: Nama organisasi ini sudah digunakan.';
  END IF;

  -- 2. Buat pengguna baru di auth.users
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_sent_at, confirmed_at)
  VALUES (current_setting('app.instance_id')::uuid, gen_random_uuid(), 'authenticated', 'authenticated', p_email, crypt(p_password, gen_salt('bf')), now(), '', '1970-01-01 00:00:00+00', '1970-01-01 00:00:00+00', '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', p_full_name), now(), now(), '', '', '1970-01-01 00:00:00+00', now())
  RETURNING id INTO new_user_id;

  -- 3. Buat organisasi baru
  INSERT INTO public.organizations (name) VALUES (p_organization_name)
  RETURNING id INTO new_org_id;

  -- 4. Perbarui profil pengguna dengan role 'owner' dan organization_id
  UPDATE public.profiles
  SET role = 'owner', organization_id = new_org_id
  WHERE id = new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Aktifkan RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
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

-- Kebijakan RLS
CREATE POLICY "Enable read access for authenticated users" ON public.organizations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can only see their own organization" ON public.organizations
  FOR SELECT USING (id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can only manage their own organization data" ON public.profiles
  FOR ALL USING (id = auth.uid());

CREATE POLICY "Users can only manage data in their own organization" ON public.products
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can only manage data in their own organization" ON public.raw_materials
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can only manage data in their own organization" ON public.customers
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can only manage data in their own organization" ON public.transactions
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can only manage data in their own organization" ON public.transaction_items
  FOR ALL USING (transaction_id IN (SELECT id FROM public.transactions WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));
  
CREATE POLICY "Users can only manage data in their own organization" ON public.promotions
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can only manage data in their own organization" ON public.categories
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can only manage data in their own organization" ON public.grades
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
  
CREATE POLICY "Users can only manage data in their own organization" ON public.aromas
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can only manage data in their own organization" ON public.bottle_sizes
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can only manage data in their own organization" ON public.recipes
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
  
CREATE POLICY "Users can only manage data in their own organization" ON public.expenses
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
  
CREATE POLICY "Users can only manage data in their own organization" ON public.settings
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
