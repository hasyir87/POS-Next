-- Fungsi untuk mengeksekusi SQL dinamis
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT) RETURNS VOID AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- Hapus trigger dan fungsi yang ada jika ada untuk memastikan setup yang bersih
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Buat ulang fungsi untuk menangani user baru
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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

-- Buat ulang trigger pada tabel auth.users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Fungsi untuk membuat owner, organisasi, dan profilnya dalam satu transaksi
DROP FUNCTION IF EXISTS signup_owner(text, text, text, text) CASCADE;
CREATE OR REPLACE FUNCTION signup_owner(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_organization_name TEXT
) RETURNS VOID AS $$
DECLARE
  new_user_id UUID;
  new_organization_id UUID;
BEGIN
  -- Periksa apakah nama organisasi sudah ada
  IF EXISTS (SELECT 1 FROM public.organizations WHERE name = p_organization_name) THEN
    RAISE EXCEPTION 'org_exists: Nama organisasi ini sudah digunakan.';
  END IF;

  -- Buat pengguna baru di auth.users
  -- Catatan: Fungsi ini harus dijalankan dengan hak akses yang memadai
  new_user_id := auth.uid(); -- Placeholder, will be replaced by the actual user creation logic in the app or a service role call
  
  -- Masukkan pengguna baru secara manual (membutuhkan hak akses admin)
  -- Ini hanya contoh; dalam praktiknya, Anda akan memanggil createUser dari backend.
  -- Asumsi user sudah dibuat di auth.users oleh backend sebelum memanggil fungsi ini jika menggunakan RLS.
  -- Untuk tujuan setup, kita akan men-skip pembuatan user di sini dan mengasumsikan ID sudah ada.
  
  -- Buat organisasi baru
  INSERT INTO public.organizations (name)
  VALUES (p_organization_name)
  RETURNING id INTO new_organization_id;

  -- Perbarui profil pengguna yang ada dengan organization_id dan role 'owner'
  -- Trigger `handle_new_user` akan membuat profil dasar, kita tinggal update.
  UPDATE public.profiles
  SET 
    organization_id = new_organization_id,
    role = 'owner',
    full_name = p_full_name -- Pastikan nama lengkap juga di-set
  WHERE id = new_user_id;

END;
$$ LANGUAGE plpgsql;


-- Aktifkan Row Level Security (RLS) untuk semua tabel
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

-- Hapus kebijakan yang ada sebelum membuat yang baru
DROP POLICY IF EXISTS "Allow public read access" ON public.organizations;
DROP POLICY IF EXISTS "Users can manage their own organization" ON public.organizations;

DROP POLICY IF EXISTS "Allow public read access for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins/Owners can view profiles in their organization" ON public.profiles;


-- Kebijakan untuk ORGANIZATIONS
CREATE POLICY "Allow public read access" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Users can manage their own organization" ON public.organizations
  FOR ALL
  USING (
    id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
  );


-- Kebijakan untuk PROFILES
CREATE POLICY "Allow public read access for profiles" ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
  
CREATE POLICY "Admins/Owners can view profiles in their organization" ON public.profiles
  FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner')
  );


-- Kebijakan umum untuk tabel data (produk, bahan baku, pelanggan, dll.)
-- Fungsi helper untuk mendapatkan organization_id pengguna saat ini
CREATE OR REPLACE FUNCTION get_current_user_org_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id FROM public.profiles WHERE id = auth.uid();
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Kebijakan generik untuk tabel data utama
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.products;
CREATE POLICY "Users can manage data for their own organization" ON public.products
  FOR ALL
  USING (organization_id = get_current_user_org_id())
  WITH CHECK (organization_id = get_current_user_org_id());
  
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.raw_materials;
CREATE POLICY "Users can manage data for their own organization" ON public.raw_materials
  FOR ALL
  USING (organization_id = get_current_user_org_id())
  WITH CHECK (organization_id = get_current_user_org_id());

DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.customers;
CREATE POLICY "Users can manage data for their own organization" ON public.customers
  FOR ALL
  USING (organization_id = get_current_user_org_id())
  WITH CHECK (organization_id = get_current_user_org_id());

DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.transactions;
CREATE POLICY "Users can manage data for their own organization" ON public.transactions
  FOR ALL
  USING (organization_id = get_current_user_org_id())
  WITH CHECK (organization_id = get_current_user_org_id());
  
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.transaction_items;
CREATE POLICY "Users can manage data for their own organization" ON public.transaction_items
  FOR ALL
  USING (
    (SELECT organization_id FROM public.transactions WHERE id = transaction_id) = get_current_user_org_id()
  )
  WITH CHECK (
    (SELECT organization_id FROM public.transactions WHERE id = transaction_id) = get_current_user_org_id()
  );

DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.promotions;
CREATE POLICY "Users can manage data for their own organization" ON public.promotions
  FOR ALL
  USING (organization_id = get_current_user_org_id())
  WITH CHECK (organization_id = get_current_user_org_id());
  
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.categories;
CREATE POLICY "Users can manage data for their own organization" ON public.categories
  FOR ALL
  USING (organization_id = get_current_user_org_id())
  WITH CHECK (organization_id = get_current_user_org_id());

DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.grades;
CREATE POLICY "Users can manage data for their own organization" ON public.grades
  FOR ALL
  USING (organization_id = get_current_user_org_id())
  WITH CHECK (organization_id = get_current_user_org_id());

DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.aromas;
CREATE POLICY "Users can manage data for their own organization" ON public.aromas
  FOR ALL
  USING (organization_id = get_current_user_org_id())
  WITH CHECK (organization_id = get_current_user_org_id());

DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.bottle_sizes;
CREATE POLICY "Users can manage data for their own organization" ON public.bottle_sizes
  FOR ALL
  USING (organization_id = get_current_user_org_id())
  WITH CHECK (organization_id = get_current_user_org_id());

DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.recipes;
CREATE POLICY "Users can manage data for their own organization" ON public.recipes
  FOR ALL
  USING (organization_id = get_current_user_org_id())
  WITH CHECK (organization_id = get_current_user_org_id());
  
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.expenses;
CREATE POLICY "Users can manage data for their own organization" ON public.expenses
  FOR ALL
  USING (organization_id = get_current_user_org_id())
  WITH CHECK (organization_id = get_current_user_org_id());
  
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.settings;
CREATE POLICY "Users can manage data for their own organization" ON public.settings
  FOR ALL
  USING (organization_id = get_current_user_org_id())
  WITH CHECK (organization_id = get_current_user_org_id());
