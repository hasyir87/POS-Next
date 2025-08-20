
-- Hapus semua objek yang ada untuk memastikan skrip bisa dijalankan ulang
DROP TABLE IF EXISTS public.transaction_items CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.promotions CASCADE;
DROP TABLE IF EXISTS public.recipes CASCADE;
DROP TABLE IF EXISTS public.raw_materials CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.grades CASCADE;
DROP TABLE IF EXISTS public.aromas CASCADE;
DROP TABLE IF EXISTS public.bottle_sizes CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.promotion_type CASCADE;
DROP TYPE IF EXISTS public.transaction_status CASCADE;
DROP TYPE IF EXISTS public.payment_method CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.signup_owner(text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.update_product_stock(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.process_checkout(uuid, uuid, uuid, jsonb, numeric, text) CASCADE;
DROP FUNCTION IF EXISTS public.exec_sql(text) CASCADE;


-- 1. BUAT TIPE ENUM
CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'cashier', 'superadmin');
CREATE TYPE public.promotion_type AS ENUM ('Persentase', 'Nominal', 'BOGO');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'transfer', 'e_wallet', 'qris', 'debit');


-- 2. BUAT TABEL
CREATE TABLE public.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    address text,
    phone text,
    logo_url text,
    parent_organization_id uuid REFERENCES public.organizations(id),
    is_setup_complete boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.organizations IS 'Menyimpan data setiap entitas bisnis (toko induk atau cabang).';

CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL,
    full_name text,
    avatar_url text,
    organization_id uuid REFERENCES public.organizations(id),
    role user_role NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.profiles IS 'Menghubungkan pengguna di auth.users dengan organisasi dan peran mereka.';

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  category_id uuid REFERENCES public.categories(id),
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.raw_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL,
  category text,
  purchase_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  loyalty_points integer NOT NULL DEFAULT 0,
  transaction_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cashier_id uuid NOT NULL REFERENCES public.profiles(id),
  customer_id uuid REFERENCES public.customers(id),
  total_amount numeric NOT NULL,
  payment_method payment_method NOT NULL,
  status transaction_status NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  raw_material_id uuid REFERENCES public.raw_materials(id),
  quantity integer NOT NULL,
  price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type promotion_type NOT NULL,
  value numeric NOT NULL,
  get_product_id uuid REFERENCES public.products(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_multiplier numeric NOT NULL DEFAULT 1.0,
  extra_essence_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.aromas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bottle_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  size integer NOT NULL,
  unit text NOT NULL,
  price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  grade_id uuid NOT NULL REFERENCES public.grades(id),
  aroma_id uuid NOT NULL REFERENCES public.aromas(id),
  bottle_size_id uuid NOT NULL REFERENCES public.bottle_sizes(id),
  price numeric NOT NULL,
  instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date date NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, key)
);


-- 3. AKTIFKAN RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aromas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bottle_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 4. BUAT FUNGSI HELPER
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role::text INTO v_role FROM public.profiles WHERE id = p_user_id;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'cashier'); -- Default role
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. BUAT KEBIJAKAN RLS
-- Organisasi: Pengguna hanya bisa melihat organisasi mereka sendiri atau anak organisasinya
CREATE POLICY select_own_organization ON public.organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ) OR
    parent_organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Profil: Pengguna bisa melihat profil mereka sendiri, dan pemilik/admin bisa melihat profil di organisasi mereka
CREATE POLICY select_profiles ON public.profiles
  FOR SELECT
  USING (
    id = auth.uid() OR
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );
  
CREATE POLICY update_own_profile ON public.profiles
  FOR UPDATE
  USING (id = auth.uid());


-- Kebijakan Umum: Pengguna hanya dapat berinteraksi dengan data di organisasi mereka sendiri
CREATE POLICY manage_own_organization_data ON public.products FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY manage_own_organization_data ON public.transactions FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY manage_own_organization_data ON public.transaction_items FOR ALL USING (transaction_id IN (SELECT id FROM public.transactions WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));
CREATE POLICY manage_own_organization_data ON public.customers FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY manage_own_organization_data ON public.raw_materials FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY manage_own_organization_data ON public.promotions FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY manage_own_organization_data ON public.grades FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY manage_own_organization_data ON public.aromas FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY manage_own_organization_data ON public.bottle_sizes FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY manage_own_organization_data ON public.recipes FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY manage_own_organization_data ON public.expenses FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY manage_own_organization_data ON public.settings FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY manage_own_organization_data ON public.categories FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));


-- 6. BUAT TRIGGER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 7. BUAT FUNGSI RPC
CREATE OR REPLACE FUNCTION public.signup_owner(
    p_email text,
    p_password text,
    p_full_name text,
    p_organization_name text
)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_existing_org_id uuid;
  v_existing_user_id uuid;
BEGIN
  -- 1. Periksa apakah nama organisasi sudah ada
  SELECT id INTO v_existing_org_id FROM public.organizations WHERE name = p_organization_name;
  IF FOUND THEN
    RAISE EXCEPTION 'org_exists: Nama organisasi ini sudah digunakan.';
  END IF;

  -- 2. Periksa apakah email pengguna sudah ada di auth.users
  SELECT id INTO v_existing_user_id FROM auth.users WHERE email = p_email;
  IF FOUND THEN
    RAISE EXCEPTION 'user_exists: Pengguna dengan email ini sudah terdaftar.';
  END IF;

  -- 3. Buat pengguna baru di auth.users
  v_user_id := auth.uid() FROM auth.users WHERE auth.uid() = (
    SELECT id FROM auth.users WHERE email = p_email
  );
  
  INSERT INTO auth.users (id, email, password, raw_user_meta_data)
  VALUES (gen_random_uuid(), p_email, crypt(p_password, gen_salt('bf')), jsonb_build_object('full_name', p_full_name))
  RETURNING id INTO v_user_id;

  -- 4. Buat organisasi baru
  INSERT INTO public.organizations (name)
  VALUES (p_organization_name)
  RETURNING id INTO v_org_id;

  -- 5. Buat profil untuk pengguna baru sebagai 'owner'
  INSERT INTO public.profiles (id, email, full_name, organization_id, role)
  VALUES (v_user_id, p_email, p_full_name, v_org_id, 'owner');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.update_product_stock(p_product_id uuid, p_quantity_sold integer)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET stock = stock - p_quantity_sold
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.process_checkout(
    p_organization_id uuid,
    p_cashier_id uuid,
    p_customer_id uuid,
    p_items jsonb,
    p_total_amount numeric,
    p_payment_method text
)
RETURNS uuid AS $$
DECLARE
  v_transaction_id uuid;
  v_item jsonb;
BEGIN
  -- 1. Buat record transaksi baru
  INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
  VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method::payment_method, 'completed')
  RETURNING id INTO v_transaction_id;

  -- 2. Loop melalui item dan masukkan ke transaction_items & update stok
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
    VALUES (
      v_transaction_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::integer,
      (v_item->>'price')::numeric
    );

    -- Update stok produk
    PERFORM public.update_product_stock(
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::integer
    );
  END LOOP;
  
  -- 3. Update transaction_count untuk customer jika ada
  IF p_customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET transaction_count = transaction_count + 1
    WHERE id = p_customer_id;
  END IF;

  -- 4. Kembalikan ID transaksi yang baru dibuat
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    EXECUTE sql;
END;
$$;
