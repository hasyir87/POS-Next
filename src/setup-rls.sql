-- Hapus trigger dan fungsi lama jika ada, untuk memastikan eksekusi bersih
DROP TRIGGER IF EXISTS on_profile_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;

-- Hapus fungsi RPC lama jika ada
DROP FUNCTION IF EXISTS signup_owner(text,text,text,text);

-- Hapus fungsi helper lama jika ada
DROP FUNCTION IF EXISTS get_user_role(uuid);
DROP FUNCTION IF EXISTS get_my_organization_id();
DROP FUNCTION IF EXISTS exec_sql(text);

-- 1. Fungsi untuk mengeksekusi SQL dinamis
-- Digunakan oleh script setup-database.js untuk menjalankan seluruh file ini sebagai satu perintah.
CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- 2. Fungsi untuk mengambil role pengguna
-- Mengambil role dari tabel 'profiles' berdasarkan user id yang sedang login.
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = p_user_id;
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fungsi untuk mengambil ID organisasi pengguna
-- Mengambil ID organisasi dari tabel 'profiles' berdasarkan user id yang sedang login.
-- Ini penting untuk kebijakan RLS agar tidak terjadi rekursi.
CREATE OR REPLACE FUNCTION get_my_organization_id()
RETURNS uuid AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organization_id INTO org_id FROM public.profiles WHERE id = auth.uid();
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Fungsi untuk menangani pembuatan profil baru
-- Trigger ini akan berjalan setiap kali ada pengguna baru dibuat di Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Cek jika profil sudah ada
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;
  
  -- Masukkan baris baru ke public.profiles
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger untuk handle_new_user
-- Menghubungkan fungsi handle_new_user ke event pembuatan pengguna di Supabase Auth.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 6. Fungsi RPC untuk pendaftaran pemilik
-- Menggabungkan pembuatan pengguna, organisasi, dan profil dalam satu transaksi.
CREATE OR REPLACE FUNCTION signup_owner(
  p_email text,
  p_password text,
  p_full_name text,
  p_organization_name text
) RETURNS uuid AS $$
DECLARE
  new_user_id uuid;
  new_organization_id uuid;
BEGIN
  -- Cek apakah nama organisasi sudah ada
  IF EXISTS (SELECT 1 FROM public.organizations WHERE name = p_organization_name) THEN
    RAISE EXCEPTION 'org_exists';
  END IF;

  -- Buat pengguna di auth.users
  new_user_id := auth.uid();
  
  -- Buat organisasi baru
  INSERT INTO public.organizations (name)
  VALUES (p_organization_name)
  RETURNING id INTO new_organization_id;

  -- Buat profil untuk pengguna baru
  -- Langsung set role sebagai 'owner' dan hubungkan ke organisasi baru.
  UPDATE public.profiles
  SET 
    full_name = p_full_name,
    role = 'owner',
    organization_id = new_organization_id
  WHERE id = new_user_id;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- AKTIFKAN ROW LEVEL SECURITY (RLS)
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

-- HAPUS KEBIJAKAN LAMA JIKA ADA
-- Ini membuat skrip dapat dijalankan berulang kali tanpa error.
DROP POLICY IF EXISTS "Allow public read access" ON public.organizations;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.products;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.raw_materials;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.customers;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.transactions;
DROP POLICY IF EXISTS "Users can view items in their organization's transactions" ON public.transaction_items;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.promotions;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.categories;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.grades;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.aromas;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.bottle_sizes;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.recipes;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.expenses;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.settings;

-- BUAT KEBIJAKAN RLS BARU

-- Kebijakan untuk 'organizations'
-- Pengguna hanya bisa melihat/mengelola organisasi mereka sendiri.
CREATE POLICY "Users can manage data for their own organization" ON public.organizations
  FOR ALL USING (id = get_my_organization_id() OR parent_organization_id = get_my_organization_id());

-- Kebijakan untuk 'profiles'
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- **PERBAIKAN UTAMA**: Menggunakan fungsi helper `get_my_organization_id` untuk mencegah rekursi.
CREATE POLICY "Admins can manage profiles in their organization" ON public.profiles
  FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'owner') AND organization_id = get_my_organization_id());


-- Kebijakan Generik untuk Tabel Lainnya
-- Pola ini digunakan untuk semua tabel data lainnya.
CREATE POLICY "Users can manage data for their own organization" ON public.products
  FOR ALL USING (organization_id = get_my_organization_id());
  
CREATE POLICY "Users can manage data for their own organization" ON public.raw_materials
  FOR ALL USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization" ON public.customers
  FOR ALL USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization" ON public.transactions
  FOR ALL USING (organization_id = get_my_organization_id());
  
-- Untuk transaction_items, kita cek berdasarkan organisasi dari transaksi induknya.
CREATE POLICY "Users can view items in their organization's transactions" ON public.transaction_items
  FOR ALL USING (
    (SELECT organization_id FROM public.transactions WHERE id = transaction_id) = get_my_organization_id()
  );

CREATE POLICY "Users can manage data for their own organization" ON public.promotions
  FOR ALL USING (organization_id = get_my_organization_id());
  
CREATE POLICY "Users can manage data for their own organization" ON public.categories
  FOR ALL USING (organization_id = get_my_organization_id());
  
CREATE POLICY "Users can manage data for their own organization" ON public.grades
  FOR ALL USING (organization_id = get_my_organization_id());
  
CREATE POLICY "Users can manage data for their own organization" ON public.aromas
  FOR ALL USING (organization_id = get_my_organization_id());
  
CREATE POLICY "Users can manage data for their own organization" ON public.bottle_sizes
  FOR ALL USING (organization_id = get_my_organization_id());
  
CREATE POLICY "Users can manage data for their own organization" ON public.recipes
  FOR ALL USING (organization_id = get_my_organization_id());
  
CREATE POLICY "Users can manage data for their own organization" ON public.expenses
  FOR ALL USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization" ON public.settings
  FOR ALL USING (organization_id = get_my_organization_id());
