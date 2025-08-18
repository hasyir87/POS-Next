-- Fungsi untuk mengeksekusi SQL dinamis.
-- Berguna untuk menjalankan skrip setup dalam satu panggilan RPC.
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS TEXT AS $$
BEGIN
    EXECUTE sql;
    RETURN 'SUCCESS';
END;
$$ LANGUAGE plpgsql;


-- Fungsi untuk mendapatkan organization_id pengguna yang sedang login
-- Menggunakan CASCADE untuk memastikan bisa di-drop meskipun ada policy yang bergantung
DROP FUNCTION IF EXISTS get_my_organization_id() CASCADE;
CREATE OR REPLACE FUNCTION get_my_organization_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1;
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 1. Hapus trigger dan fungsi lama jika ada (Idempotency)
-- Menggunakan CASCADE untuk memastikan bisa di-drop meskipun ada trigger yang bergantung
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 2. Buat fungsi untuk menyalin user baru dari auth.users ke public.profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Buat trigger yang akan menjalankan fungsi di atas setiap kali user baru dibuat
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- Fungsi untuk mendaftar sebagai Owner
-- Ini akan membuat user, organisasi, dan profil dalam satu transaksi
DROP FUNCTION IF EXISTS signup_owner(text, text, text, text);
CREATE OR REPLACE FUNCTION signup_owner(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_organization_name TEXT
)
RETURNS JSONB AS $$
DECLARE
    new_user_id UUID;
    new_org_id UUID;
    user_data JSONB;
BEGIN
    -- Periksa apakah email sudah ada
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RAISE EXCEPTION 'user_exists';
    END IF;

    -- Periksa apakah nama organisasi sudah ada
    IF EXISTS (SELECT 1 FROM public.organizations WHERE name = p_organization_name) THEN
        RAISE EXCEPTION 'org_exists';
    END IF;

    -- Buat user baru di auth.users menggunakan fungsi auth.sign_up
    -- raw_user_meta_data akan digunakan oleh trigger handle_new_user
    user_data := jsonb_build_object('full_name', p_full_name);
    
    SELECT auth.sign_up(
      email := p_email,
      password := p_password,
      options := jsonb_build_object('data', user_data)
    ) INTO new_user_id;

    -- Jika new_user_id null, berarti pembuatan user gagal (meskipun ini seharusnya tidak terjadi jika tidak ada exception)
    IF new_user_id IS NULL THEN
        RAISE EXCEPTION 'user_creation_failed';
    END IF;

    -- Buat organisasi baru
    INSERT INTO public.organizations (name)
    VALUES (p_organization_name)
    RETURNING id INTO new_org_id;

    -- Update profil yang sudah dibuat oleh trigger, set organization_id dan role
    UPDATE public.profiles
    SET
        organization_id = new_org_id,
        role = 'owner'
    WHERE id = new_user_id;

    RETURN jsonb_build_object('user_id', new_user_id, 'organization_id', new_org_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==== RLS POLICIES ====

-- Pastikan RLS diaktifkan untuk semua tabel
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

-- Hapus kebijakan lama jika ada
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.organizations;
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
-- 1. Pengguna bisa melihat dan mengupdate profil mereka sendiri.
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
  
-- 2. Admin/Owner bisa melihat dan mengelola semua profil di dalam organisasi mereka.
CREATE POLICY "Admins can manage profiles in their organization"
  ON public.profiles FOR ALL
  USING (role IN ('admin', 'owner') AND organization_id = get_my_organization_id())
  WITH CHECK (role IN ('admin', 'owner') AND organization_id = get_my_organization_id());


-- Kebijakan umum untuk tabel data lainnya
-- Pengguna hanya bisa mengakses data yang sesuai dengan organization_id mereka.
CREATE POLICY "Users can manage data for their own organization"
  ON public.organizations FOR SELECT
  USING (id = get_my_organization_id() OR parent_organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.products FOR ALL
  USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.raw_materials FOR ALL
  USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.customers FOR ALL
  USING (organization_id = get_my_organization_id());
  
CREATE POLICY "Users can manage data for their own organization"
  ON public.transactions FOR ALL
  USING (organization_id = get_my_organization_id());
  
CREATE POLICY "Users can manage data for their own organization"
  ON public.transaction_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = transaction_id AND t.organization_id = get_my_organization_id()
  ));

CREATE POLICY "Users can manage data for their own organization"
  ON public.promotions FOR ALL
  USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.categories FOR ALL
  USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.grades FOR ALL
  USING (organization_id = get_my_organization_id());
  
CREATE POLICY "Users can manage data for their own organization"
  ON public.aromas FOR ALL
  USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.bottle_sizes FOR ALL
  USING (organization_id = get_my_organization_id());
  
CREATE POLICY "Users can manage data for their own organization"
  ON public.recipes FOR ALL
  USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.expenses FOR ALL
  USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.settings FOR ALL
  USING (organization_id = get_my_organization_id());
