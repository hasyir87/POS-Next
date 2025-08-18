-- Hilangkan semua kebijakan yang ada untuk memulai dari awal
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.settings;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.expenses;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.recipes;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.bottle_sizes;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.aromas;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.grades;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.categories;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.promotions;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.transaction_items;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.transactions;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.customers;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.raw_materials;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.products;
DROP POLICY IF EXISTS "Admins can manage profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage data for their own organization" ON public.organizations;


-- Hilangkan fungsi dan trigger yang ada untuk memastikan skrip bisa dijalankan ulang
DROP FUNCTION IF EXISTS public.get_my_organization_id() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

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


-- FUNCTIONS
--------------------------------------------------------------------------------

-- Fungsi untuk mendapatkan organization_id dari user yang sedang login
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT organization_id
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;


-- Fungsi untuk menyalin data dari auth.users ke public.profiles saat user baru mendaftar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Logika ini hanya sebagai fallback jika profil tidak dibuat oleh API
  -- Idealnya, profil dibuat secara eksplisit saat pendaftaran
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;


-- TRIGGERS
--------------------------------------------------------------------------------

-- Trigger yang memanggil handle_new_user setiap kali user baru dibuat di auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- RLS POLICIES
--------------------------------------------------------------------------------

-- PROFILES Table
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage profiles in their organization"
  ON public.profiles FOR ALL
  USING (get_my_organization_id() = organization_id)
  WITH CHECK (get_my_organization_id() = organization_id);

-- ORGANIZATIONS Table
CREATE POLICY "Users can manage data for their own organization"
  ON public.organizations FOR ALL
  USING (get_my_organization_id() = id OR get_my_organization_id() = parent_organization_id)
  WITH CHECK (get_my_organization_id() = id OR get_my_organization_id() = parent_organization_id);

-- PRODUCTS Table
CREATE POLICY "Users can manage data for their own organization"
  ON public.products FOR ALL
  USING (get_my_organization_id() = organization_id)
  WITH CHECK (get_my_organization_id() = organization_id);

-- RAW_MATERIALS Table
CREATE POLICY "Users can manage data for their own organization"
  ON public.raw_materials FOR ALL
  USING (get_my_organization_id() = organization_id)
  WITH CHECK (get_my_organization_id() = organization_id);

-- CUSTOMERS Table
CREATE POLICY "Users can manage data for their own organization"
  ON public.customers FOR ALL
  USING (get_my_organization_id() = organization_id)
  WITH CHECK (get_my_organization_id() = organization_id);

-- TRANSACTIONS Table
CREATE POLICY "Users can manage data for their own organization"
  ON public.transactions FOR ALL
  USING (get_my_organization_id() = organization_id)
  WITH CHECK (get_my_organization_id() = organization_id);

-- TRANSACTION_ITEMS Table
CREATE POLICY "Users can manage data for their own organization"
  ON public.transaction_items FOR ALL
  USING (
    (SELECT organization_id FROM public.transactions WHERE id = transaction_id) = get_my_organization_id()
  );

-- PROMOTIONS Table
CREATE POLICY "Users can manage data for their own organization"
  ON public.promotions FOR ALL
  USING (get_my_organization_id() = organization_id)
  WITH CHECK (get_my_organization_id() = organization_id);
  
-- CATEGORIES Table
CREATE POLICY "Users can manage data for their own organization"
  ON public.categories FOR ALL
  USING (get_my_organization_id() = organization_id)
  WITH CHECK (get_my_organization_id() = organization_id);

-- GRADES Table
CREATE POLICY "Users can manage data for their own organization"
  ON public.grades FOR ALL
  USING (get_my_organization_id() = organization_id)
  WITH CHECK (get_my_organization_id() = organization_id);

-- AROMAS Table
CREATE POLICY "Users can manage data for their own organization"
  ON public.aromas FOR ALL
  USING (get_my_organization_id() = organization_id)
  WITH CHECK (get_my_organization_id() = organization_id);

-- BOTTLE_SIZES Table
CREATE POLICY "Users can manage data for their own organization"
  ON public.bottle_sizes FOR ALL
  USING (get_my_organization_id() = organization_id)
  WITH CHECK (get_my_organization_id() = organization_id);

-- RECIPES Table
CREATE POLICY "Users can manage data for their own organization"
  ON public.recipes FOR ALL
  USING (get_my_organization_id() = organization_id)
  WITH CHECK (get_my_organization_id() = organization_id);

-- EXPENSES Table
CREATE POLICY "Users can manage data for their own organization"
  ON public.expenses FOR ALL
  USING (get_my_organization_id() = organization_id)
  WITH CHECK (get_my_organization_id() = organization_id);

-- SETTINGS Table
CREATE POLICY "Users can manage data for their own organization"
  ON public.settings FOR ALL
  USING (get_my_organization_id() = organization_id)
  WITH CHECK (get_my_organization_id() = organization_id);
