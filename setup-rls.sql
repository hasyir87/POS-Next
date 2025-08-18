-- Pastikan schema auth ada
CREATE SCHEMA IF NOT EXISTS auth;

-- Buat fungsi untuk mengeksekusi SQL dinamis.
-- Ini jauh lebih andal daripada mem-parsing SQL di sisi klien.
DROP FUNCTION IF EXISTS exec_sql(text) CASCADE;
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql;


-------------------------------------------------------------------------------
-- Manajamen Pengguna & Profil
-------------------------------------------------------------------------------

-- Fungsi untuk menangani pembuatan profil pengguna baru secara otomatis
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger yang memanggil handle_new_user setiap kali user baru dibuat di auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fungsi untuk pendaftaran Owner baru (membuat user, organisasi, dan profil)
DROP FUNCTION IF EXISTS public.signup_owner(text, text, text, text) CASCADE;
CREATE OR REPLACE FUNCTION public.signup_owner(
    p_email text,
    p_password text,
    p_full_name text,
    p_organization_name text
)
RETURNS uuid AS $$
DECLARE
  new_user_id uuid;
  new_organization_id uuid;
BEGIN
  -- 1. Periksa apakah email sudah ada
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'user_exists';
  END IF;

  -- 2. Periksa apakah nama organisasi sudah ada (lebih baik unik)
  IF EXISTS (SELECT 1 FROM public.organizations WHERE name = p_organization_name) THEN
    RAISE EXCEPTION 'org_exists';
  END IF;

  -- 3. Buat user baru di Supabase Auth
  new_user_id := auth.sign_up(
    json_build_object(
        'email', p_email,
        'password', p_password,
        'options', json_build_object(
            'data', json_build_object(
                'full_name', p_full_name
            )
        )
    )
  );

  -- 4. Buat organisasi baru
  INSERT INTO public.organizations (name, owner_id)
  VALUES (p_organization_name, new_user_id)
  RETURNING id INTO new_organization_id;

  -- 5. Perbarui profil yang dibuat oleh trigger untuk menambahkan peran dan organization_id
  UPDATE public.profiles
  SET 
    role = 'owner',
    organization_id = new_organization_id,
    full_name = p_full_name
  WHERE id = new_user_id;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-------------------------------------------------------------------------------
-- Row-Level Security (RLS)
-------------------------------------------------------------------------------

-- Fungsi helper untuk mengambil organization_id pengguna yang sedang login
DROP FUNCTION IF EXISTS public.get_my_organization_id() CASCADE;
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id
    FROM public.profiles
    WHERE id = auth.uid();
    RETURN org_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Aktifkan RLS untuk semua tabel yang relevan
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

-- Hapus kebijakan yang ada sebelum membuat yang baru untuk idempotensi
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles in their organization" ON public.profiles;

DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;

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


-- Kebijakan untuk tabel PROFILES
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage profiles in their organization"
  ON public.profiles FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    (get_my_organization_id() IS NOT NULL) AND
    organization_id = get_my_organization_id() AND
    (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
    )
  )
  WITH CHECK (
    organization_id = get_my_organization_id() AND
    (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
    )
  );

-- Kebijakan untuk tabel ORGANIZATIONS
CREATE POLICY "Users can view organizations they belong to"
  ON public.organizations FOR SELECT
  USING (id = get_my_organization_id() OR parent_organization_id = get_my_organization_id());


-- Kebijakan umum untuk semua tabel data
CREATE POLICY "Users can manage data for their own organization"
  ON public.products FOR ALL
  USING (organization_id = get_my_organization_id())
  WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.raw_materials FOR ALL
  USING (organization_id = get_my_organization_id())
  WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.customers FOR ALL
  USING (organization_id = get_my_organization_id())
  WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.transactions FOR ALL
  USING (organization_id = get_my_organization_id())
  WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.transaction_items FOR ALL
  USING ( EXISTS(SELECT 1 FROM transactions WHERE id = transaction_id AND organization_id = get_my_organization_id()) )
  WITH CHECK ( EXISTS(SELECT 1 FROM transactions WHERE id = transaction_id AND organization_id = get_my_organization_id()) );

CREATE POLICY "Users can manage data for their own organization"
  ON public.promotions FOR ALL
  USING (organization_id = get_my_organization_id())
  WITH CHECK (organization_id = get_my_organization_id());
  
CREATE POLICY "Users can manage data for their own organization"
  ON public.categories FOR ALL
  USING (organization_id = get_my_organization_id())
  WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.grades FOR ALL
  USING (organization_id = get_my_organization_id())
  WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.aromas FOR ALL
  USING (organization_id = get_my_organization_id())
  WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.bottle_sizes FOR ALL
  USING (organization_id = get_my_organization_id())
  WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.recipes FOR ALL
  USING (organization_id = get_my_organization_id())
  WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.expenses FOR ALL
  USING (organization_id = get_my_organization_id())
  WITH CHECK (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.settings FOR ALL
  USING (organization_id = get_my_organization_id())
  WITH CHECK (organization_id = get_my_organization_id());
