-- Hapus trigger dan fungsi lama jika ada untuk memastikan skrip bisa dijalankan ulang
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user;

DROP FUNCTION IF EXISTS public.get_my_organization_id();

DROP FUNCTION IF EXISTS public.signup_owner(text, text, text, text);

DROP FUNCTION IF EXISTS public.exec_sql(text);

-- Fungsi untuk mengeksekusi SQL dinamis (diperlukan untuk menjalankan sisa skrip ini dari Node.js)
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE sql;
END;
$$;


-- Fungsi untuk membuat profil pengguna secara otomatis saat user baru mendaftar di Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert a new row into the public.profiles table
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger yang memanggil fungsi handle_new_user setiap kali user baru dibuat
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fungsi helper untuk mendapatkan organization_id dari pengguna yang sedang login
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id
    FROM public.profiles
    WHERE id = auth.uid();
    RETURN org_id;
END;
$$;


-- Fungsi RPC untuk mendaftarkan pemilik baru, membuat organisasi, dan menautkan profil
CREATE OR REPLACE FUNCTION public.signup_owner(
    p_email text,
    p_password text,
    p_full_name text,
    p_organization_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Jalankan dengan hak akses penuh untuk membuat user
SET search_path = public
AS $$
DECLARE
    new_user_id uuid;
    new_organization_id uuid;
BEGIN
    -- 1. Periksa apakah email sudah ada di auth.users
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RAISE EXCEPTION 'user_exists';
    END IF;

    -- 2. Periksa apakah nama organisasi sudah ada (opsional, tapi bagus untuk dimiliki)
    IF EXISTS (SELECT 1 FROM organizations WHERE name = p_organization_name) THEN
        RAISE EXCEPTION 'org_exists';
    END IF;

    -- 3. Buat pengguna baru di Supabase Auth menggunakan auth.sign_up
    new_user_id := (auth.sign_up(json_build_object(
        'email', p_email,
        'password', p_password,
        'options', json_build_object(
            'data', json_build_object(
                'full_name', p_full_name
            )
        )
    ))).id;

    -- Jika new_user_id null setelah pendaftaran, berarti gagal
    IF new_user_id IS NULL THEN
        RAISE EXCEPTION 'user_creation_failed';
    END IF;

    -- 4. Buat organisasi baru
    INSERT INTO public.organizations (name)
    VALUES (p_organization_name)
    RETURNING id INTO new_organization_id;

    -- 5. Tautkan pengguna yang baru dibuat ke organisasi dan set peran sebagai 'owner'
    -- Trigger on_auth_user_created akan membuat profil dasar, kita hanya perlu mengupdatenya
    UPDATE public.profiles
    SET
        organization_id = new_organization_id,
        role = 'owner',
        full_name = p_full_name -- Pastikan full_name juga diupdate di profil
    WHERE id = new_user_id;

    RETURN new_user_id;
END;
$$;


-- 1. Aktifkan Row Level Security (RLS) untuk semua tabel
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

-- 2. Hapus kebijakan lama sebelum membuat yang baru untuk menghindari error 'already exists'
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.products;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.raw_materials;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.customers;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.transactions;
DROP POLICY IF EXISTS "Users can view transaction items linked to their organization" ON public.transaction_items;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.promotions;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.categories;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.grades;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.aromas;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.bottle_sizes;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.recipes;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.expenses;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.settings;

-- 3. Buat kebijakan RLS

-- Tabel 'profiles'
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage profiles in their organization"
  ON public.profiles FOR ALL
  USING (organization_id = public.get_my_organization_id())
  WITH CHECK (organization_id = public.get_my_organization_id());


-- Tabel 'organizations'
CREATE POLICY "Users can view organizations they belong to"
  ON public.organizations FOR SELECT
  USING (id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ) OR parent_organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));


-- Kebijakan Umum untuk Sebagian Besar Tabel Data
CREATE POLICY "Users can manage data for their own organization"
  ON public.products FOR ALL
  USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.raw_materials FOR ALL
  USING (organization_id = public.get_my_organization_id());
  
CREATE POLICY "Users can manage data for their own organization"
  ON public.customers FOR ALL
  USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.transactions FOR ALL
  USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Users can view transaction items linked to their organization"
  ON public.transaction_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_items.transaction_id
      AND transactions.organization_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "Users can manage data for their own organization"
  ON public.promotions FOR ALL
  USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.categories FOR ALL
  USING (organization_id = public.get_my_organization_id());
  
CREATE POLICY "Users can manage data for their own organization"
  ON public.grades FOR ALL
  USING (organization_id = public.get_my_organization_id());
  
CREATE POLICY "Users can manage data for their own organization"
  ON public.aromas FOR ALL
  USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.bottle_sizes FOR ALL
  USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization"
  ON public.recipes FOR ALL
  USING (organization_id = public.get_my_organization_id());
  
CREATE POLICY "Users can manage data for their own organization"
  ON public.expenses FOR ALL
  USING (organization_id = public.get_my_organization_id());
  
CREATE POLICY "Users can manage data for their own organization"
  ON public.settings FOR ALL
  USING (organization_id = public.get_my_organization_id());
