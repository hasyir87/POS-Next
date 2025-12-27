
-- Fungsi untuk menjalankan SQL dinamis. Penting untuk setup.
DROP FUNCTION IF EXISTS exec_sql;
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT) RETURNS VOID AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- Hapus trigger dan fungsi lama jika ada untuk memastikan idempotensi
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user;
-- Hapus fungsi signup_owner lama jika ada
DROP FUNCTION IF EXISTS signup_owner(text, text, text, text);

-- 1. Fungsi untuk menangani pengguna baru
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Fungsi ini sekarang kosong karena logika dipindahkan ke signup_owner
  -- Kita biarkan ada untuk kompatibilitas jika diperlukan di masa depan
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger yang memanggil fungsi handle_new_user setiap kali user baru dibuat di auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Fungsi RPC untuk pendaftaran owner
CREATE OR REPLACE FUNCTION public.signup_owner(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_organization_name TEXT
) RETURNS VOID AS $$
DECLARE
  new_user_id UUID;
  new_organization_id UUID;
  org_exists BOOLEAN;
BEGIN
  -- Periksa apakah nama organisasi sudah ada
  SELECT EXISTS (SELECT 1 FROM public.organizations WHERE name = p_organization_name) INTO org_exists;
  IF org_exists THEN
    RAISE EXCEPTION 'org_exists';
  END IF;

  -- Buat pengguna baru di auth.users
  new_user_id := auth.uid();
  IF new_user_id IS NULL THEN
    -- Jika tidak dalam konteks trigger, buat pengguna secara manual
    -- Ini adalah fallback jika fungsi dipanggil di luar alur auth standar
     INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_sent_at, confirmed_at)
     VALUES (
        '00000000-0000-0000-0000-000000000000',
        uuid_generate_v4(),
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        current_timestamp,
        '',
        NULL,
        NULL,
        '{"provider": "email", "providers": ["email"]}',
        '{}',
        current_timestamp,
        current_timestamp,
        NULL,
        '',
        NULL,
        current_timestamp
     ) RETURNING id INTO new_user_id;
  END IF;

  -- Buat organisasi baru
  INSERT INTO public.organizations (name)
  VALUES (p_organization_name)
  RETURNING id INTO new_organization_id;

  -- Buat profil untuk pengguna baru
  INSERT INTO public.profiles (id, email, full_name, role, organization_id)
  VALUES (new_user_id, p_email, p_full_name, 'owner', new_organization_id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- AKTIFKAN RLS UNTUK SEMUA TABEL YANG MEMERLUKANNYA
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
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- HAPUS KEBIJAKAN LAMA JIKA ADA (untuk idempotensi)
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.products;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.raw_materials;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.customers;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.transactions;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.transaction_items;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.promotions;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.categories;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.grades;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.aromas;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.bottle_sizes;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.recipes;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.expenses;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.settings;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins/Owners can view all profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Admins/Owners can update profiles in their organization" ON public.profiles;


-- BUAT KEBIJAKAN RLS

-- Generic policy for most tables
CREATE POLICY "Users can manage data for their own organization"
ON public.products
FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage data for their own organization"
ON public.raw_materials
FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage data for their own organization"
ON public.customers
FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage data for their own organization"
ON public.transactions
FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage data for their own organization"
ON public.transaction_items
FOR ALL
USING (EXISTS (
  SELECT 1 FROM transactions t
  JOIN profiles p ON t.organization_id = p.organization_id
  WHERE transaction_items.transaction_id = t.id AND p.id = auth.uid()
));

CREATE POLICY "Users can manage data for their own organization"
ON public.promotions
FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage data for their own organization"
ON public.categories
FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage data for their own organization"
ON public.grades
FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage data for their own organization"
ON public.aromas
FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage data for their own organization"
ON public.bottle_sizes
FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage data for their own organization"
ON public.recipes
FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage data for their own organization"
ON public.expenses
FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage data for their own organization"
ON public.settings
FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));


-- Policies for profiles table
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admins/Owners can view all profiles in their organization"
ON public.profiles
FOR SELECT
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner')
    AND
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins/Owners can update profiles in their organization"
ON public.profiles
FOR UPDATE
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner')
    AND
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner')
    AND
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
