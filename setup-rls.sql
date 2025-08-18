-- Fungsi untuk menjalankan SQL secara dinamis
DROP FUNCTION IF EXISTS exec_sql(text);
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- Hapus trigger dan fungsi lama jika ada (dengan CASCADE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Buat fungsi baru untuk menangani pengguna baru
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Fungsi ini sekarang hanya sebagai placeholder atau untuk logika masa depan
  -- Logika utama pembuatan profil dipindahkan ke fungsi signup_owner
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Buat trigger untuk menjalankan fungsi handle_new_user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fungsi untuk mendapatkan ID organisasi pengguna
DROP FUNCTION IF EXISTS public.get_my_organization_id() CASCADE;
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS uuid AS $$
DECLARE
    org_id uuid;
BEGIN
    SELECT organization_id INTO org_id FROM public.profiles WHERE id = auth.uid();
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Fungsi utama untuk signup owner (Idempotent dan Aman)
DROP FUNCTION IF EXISTS public.signup_owner(text, text, text, text);
CREATE OR REPLACE FUNCTION public.signup_owner(
  p_email text,
  p_password text,
  p_full_name text,
  p_organization_name text
) RETURNS void AS $$
DECLARE
  new_user_id uuid;
  new_organization_id uuid;
BEGIN
  -- 1. Validasi duplikasi email
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'user_exists';
  END IF;

  -- 2. Validasi duplikasi nama organisasi
  IF EXISTS (SELECT 1 FROM public.organizations WHERE name = p_organization_name) THEN
    RAISE EXCEPTION 'org_exists';
  END IF;

  -- 3. Buat pengguna baru di auth.users
  new_user_id := auth.uid(p_email, p_password);

  -- 4. Buat organisasi baru
  INSERT INTO public.organizations (name)
  VALUES (p_organization_name)
  RETURNING id INTO new_organization_id;

  -- 5. Buat profil untuk pengguna baru
  INSERT INTO public.profiles (id, email, full_name, role, organization_id)
  VALUES (new_user_id, p_email, p_full_name, 'owner', new_organization_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Aktifkan RLS untuk semua tabel
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

-- Hapus kebijakan lama jika ada sebelum membuat yang baru
DROP POLICY IF EXISTS "Public access for all" ON public.organizations;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles in their organization" ON public.profiles;
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


-- Kebijakan RLS
-- Organizations: Pengguna dapat melihat data organisasi mereka sendiri
CREATE POLICY "Users can manage data for their own organization" ON public.organizations FOR ALL
USING (id = public.get_my_organization_id() OR parent_organization_id = public.get_my_organization_id())
WITH CHECK (id = public.get_my_organization_id() OR parent_organization_id = public.get_my_organization_id());

-- Profiles: Pengguna dapat melihat dan mengedit profil mereka sendiri
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Profiles: Admin dapat mengelola profil dalam organisasi mereka
CREATE POLICY "Admins can manage profiles in their organization" ON public.profiles FOR ALL
USING (get_my_organization_id() = organization_id);

-- Kebijakan umum untuk tabel data lainnya
CREATE POLICY "Users can manage data for their own organization" ON public.products FOR ALL
USING (public.get_my_organization_id() = organization_id);

CREATE POLICY "Users can manage data for their own organization" ON public.raw_materials FOR ALL
USING (public.get_my_organization_id() = organization_id);

CREATE POLICY "Users can manage data for their own organization" ON public.customers FOR ALL
USING (public.get_my_organization_id() = organization_id);

CREATE POLICY "Users can manage data for their own organization" ON public.transactions FOR ALL
USING (public.get_my_organization_id() = organization_id);

CREATE POLICY "Users can manage data for their own organization" ON public.transaction_items FOR ALL
USING (EXISTS (SELECT 1 FROM transactions WHERE id = transaction_id AND organization_id = public.get_my_organization_id()));

CREATE POLICY "Users can manage data for their own organization" ON public.promotions FOR ALL
USING (public.get_my_organization_id() = organization_id);

CREATE POLICY "Users can manage data for their own organization" ON public.categories FOR ALL
USING (public.get_my_organization_id() = organization_id);

CREATE POLICY "Users can manage data for their own organization" ON public.grades FOR ALL
USING (public.get_my_organization_id() = organization_id);

CREATE POLICY "Users can manage data for their own organization" ON public.aromas FOR ALL
USING (public.get_my_organization_id() = organization_id);

CREATE POLICY "Users can manage data for their own organization" ON public.bottle_sizes FOR ALL
USING (public.get_my_organization_id() = organization_id);

CREATE POLICY "Users can manage data for their own organization" ON public.recipes FOR ALL
USING (public.get_my_organization_id() = organization_id);

CREATE POLICY "Users can manage data for their own organization" ON public.expenses FOR ALL
USING (public.get_my_organization_id() = organization_id);

CREATE POLICY "Users can manage data for their own organization" ON public.settings FOR ALL
USING (public.get_my_organization_id() = organization_id);
