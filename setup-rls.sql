
-- ### SETUP DATABASE & ROW LEVEL SECURITY (RLS) ###
-- Dokumen ini berisi semua perintah SQL yang diperlukan untuk menginisialisasi
-- skema database, fungsi, dan kebijakan keamanan untuk aplikasi ScentPOS.
-- Aman untuk dijalankan beberapa kali.

-- =============================================================================
-- Bagian 1: EXTENSIONS & HELPER FUNCTIONS
-- =============================================================================

-- Mengaktifkan ekstensi yang diperlukan jika belum ada.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fungsi untuk mengeksekusi SQL dinamis (digunakan oleh setup script)
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT) RETURNS VOID AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- Fungsi untuk mendapatkan peran pengguna dari tabel `profiles`.
-- Aman karena tidak mengakses skema `auth`.
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = p_user_id;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Fungsi untuk mendapatkan semua organisasi yang dapat diakses oleh pengguna.
-- Termasuk organisasi mereka sendiri dan semua sub-organisasi (outlet).
CREATE OR REPLACE FUNCTION get_organizations_for_user(p_user_id UUID)
RETURNS TABLE(org_id UUID) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE org_hierarchy AS (
    -- Basis rekursi: organisasi tempat pengguna terdaftar
    SELECT id
    FROM public.organizations o
    JOIN public.profiles p ON o.id = p.organization_id
    WHERE p.id = p_user_id

    UNION

    -- Langkah rekursi: temukan semua sub-organisasi
    SELECT o.id
    FROM public.organizations o
    INNER JOIN org_hierarchy oh ON o.parent_organization_id = oh.id
  )
  SELECT id FROM org_hierarchy;
END;
$$ LANGUAGE plpgsql STABLE;

-- Fungsi untuk mendapatkan daftar ID pengguna dalam satu organisasi.
-- Disesuaikan untuk keamanan dan hierarki peran.
CREATE OR REPLACE FUNCTION get_users_in_organization(p_requesting_user_id UUID)
RETURNS TABLE(user_id UUID) AS $$
DECLARE
  v_user_role TEXT;
  v_organization_id UUID;
BEGIN
  -- Dapatkan peran dan ID organisasi dari pengguna yang membuat permintaan
  SELECT role, organization_id INTO v_user_role, v_organization_id
  FROM public.profiles
  WHERE id = p_requesting_user_id;

  -- Logika berdasarkan peran
  IF v_user_role = 'superadmin' THEN
    -- Superadmin dapat melihat semua pengguna
    RETURN QUERY SELECT id FROM public.profiles;
  ELSE
    -- Owner dan Admin dapat melihat semua pengguna di organisasi mereka
    RETURN QUERY
    SELECT p.id
    FROM public.profiles p
    WHERE p.organization_id = v_organization_id;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- Bagian 2: DEFINISI TABEL
-- =============================================================================

-- Tabel untuk menyimpan data organisasi/toko dan outlet
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    logo_url TEXT,
    parent_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabel untuk menyimpan profil pengguna, terhubung ke auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    role TEXT NOT NULL DEFAULT 'cashier',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabel untuk kategori produk
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabel untuk produk jadi
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    category_id UUID REFERENCES public.categories(id),
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabel untuk bahan baku (refill)
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brand TEXT,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    category TEXT,
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabel untuk data pelanggan/anggota
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone VARCHAR(20),
    loyalty_points INTEGER DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabel untuk menyimpan data grade/kualitas parfum
CREATE TABLE IF NOT EXISTS public.grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabel untuk menyimpan data aroma
CREATE TABLE IF NOT EXISTS public.aromas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabel untuk ukuran botol
CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    size INTEGER NOT NULL,
    unit VARCHAR(10) NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabel untuk resep racikan parfum
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade_id UUID REFERENCES public.grades(id) ON DELETE CASCADE,
    aroma_id UUID REFERENCES public.aromas(id) ON DELETE CASCADE,
    bottle_size_id UUID REFERENCES public.bottle_sizes(id) ON DELETE CASCADE,
    price NUMERIC(12, 2) NOT NULL,
    instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabel untuk promosi
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'Persentase', 'Nominal', 'BOGO'
    value NUMERIC(10, 2) NOT NULL,
    get_product_id UUID REFERENCES public.products(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabel untuk mencatat beban/pengeluaran
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabel untuk pengaturan aplikasi per organisasi
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, key)
);

-- Tabel untuk transaksi
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cashier_id UUID NOT NULL REFERENCES public.profiles(id),
    customer_id UUID REFERENCES public.customers(id),
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL, -- 'completed', 'pending', 'cancelled'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabel untuk item dalam setiap transaksi
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    raw_material_id UUID REFERENCES public.raw_materials(id),
    quantity INTEGER NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- Bagian 3: FUNGSI RPC (Remote Procedure Call)
-- =============================================================================

-- Fungsi untuk memproses checkout secara atomik
CREATE OR REPLACE FUNCTION public.process_checkout(
    p_organization_id uuid,
    p_cashier_id uuid,
    p_customer_id uuid,
    p_total_amount numeric,
    p_payment_method text,
    p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_id uuid;
    v_item jsonb;
    v_product_id uuid;
    v_quantity int;
    v_price numeric;
BEGIN
    -- 1. Buat record transaksi baru
    INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    -- 2. Loop melalui setiap item dalam pesanan
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::uuid;
        v_quantity   := (v_item->>'quantity')::int;
        v_price      := (v_item->>'price')::numeric;

        -- Masukkan ke transaction_items
        INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
        VALUES (v_transaction_id, v_product_id, v_quantity, v_price);

        -- Perbarui stok produk jadi
        UPDATE public.products
        SET stock = stock - v_quantity
        WHERE id = v_product_id
          AND products.organization_id = p_organization_id; -- Menghilangkan ambiguitas
          
        -- TODO: Tambahkan logika untuk mengurangi stok bahan baku jika item adalah produk refill

    END LOOP;

    -- 3. Update jumlah transaksi pelanggan jika ada
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id
          AND customers.organization_id = p_organization_id; -- Menghilangkan ambiguitas
    END IF;

    RETURN v_transaction_id;
END;
$$;


-- =============================================================================
-- Bagian 4: ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Aktifkan RLS untuk semua tabel
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aromas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bottle_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- Hapus kebijakan yang ada untuk memastikan idempotensi
DROP POLICY IF EXISTS "Allow all access for superadmin" ON public.organizations;
DROP POLICY IF EXISTS "Allow read access to members of the same organization tree" ON public.organizations;
DROP POLICY IF EXISTS "Allow all access to own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow superadmin to see all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admins/owners to see profiles in their org" ON public.profiles;
DROP POLICY IF EXISTS "Allow access for organization members" ON public.categories;
DROP POLICY IF EXISTS "Allow access for organization members" ON public.products;
DROP POLICY IF EXISTS "Allow access for organization members" ON public.raw_materials;
DROP POLICY IF EXISTS "Allow access for organization members" ON public.customers;
DROP POLICY IF EXISTS "Allow access for organization members" ON public.grades;
DROP POLICY IF EXISTS "Allow access for organization members" ON public.aromas;
DROP POLICY IF EXISTS "Allow access for organization members" ON public.bottle_sizes;
DROP POLICY IF EXISTS "Allow access for organization members" ON public.recipes;
DROP POLICY IF EXISTS "Allow access for organization members" ON public.promotions;
DROP POLICY IF EXISTS "Allow access for organization members" ON public.expenses;
DROP POLICY IF EXISTS "Allow access for organization members" ON public.settings;
DROP POLICY IF EXISTS "Allow access for organization members" ON public.transactions;
DROP POLICY IF EXISTS "Allow access based on transaction" ON public.transaction_items;

-- ### Kebijakan untuk `organizations` ###
CREATE POLICY "Allow all access for superadmin"
ON public.organizations FOR ALL
USING (get_user_role(auth.uid()) = 'superadmin');

CREATE POLICY "Allow read access to members of the same organization tree"
ON public.organizations FOR SELECT
USING (id IN (SELECT unnest(get_organizations_for_user(auth.uid()))));


-- ### Kebijakan untuk `profiles` ###
CREATE POLICY "Allow all access to own profile"
ON public.profiles FOR ALL
USING (id = auth.uid());

CREATE POLICY "Allow superadmin to see all profiles"
ON public.profiles FOR SELECT
USING (get_user_role(auth.uid()) = 'superadmin');

CREATE POLICY "Allow admins/owners to see profiles in their org"
ON public.profiles FOR SELECT
USING (organization_id IN (SELECT unnest(get_organizations_for_user(auth.uid()))));


-- ### Kebijakan Generik untuk Sebagian Besar Tabel ###
-- Fungsi untuk membuat kebijakan generik
CREATE OR REPLACE FUNCTION create_generic_policies(p_table_name TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE format('
    CREATE POLICY "Allow access for organization members"
    ON public.%I FOR ALL
    USING (
      organization_id IN (
        SELECT unnest(get_organizations_for_user(auth.uid()))
      )
    )
    WITH CHECK (
      organization_id IN (
        SELECT unnest(get_organizations_for_user(auth.uid()))
      )
    );',
    p_table_name
  );
END;
$$ LANGUAGE plpgsql;

-- Terapkan kebijakan generik ke tabel yang relevan
SELECT create_generic_policies(table_name)
FROM unnest(ARRAY[
  'categories', 'products', 'raw_materials', 'customers', 'grades',
  'aromas', 'bottle_sizes', 'recipes', 'promotions', 'expenses',
  'settings', 'transactions'
]);

-- ### Kebijakan Khusus untuk `transaction_items` ###
-- Pengguna dapat melihat item transaksi jika mereka memiliki akses ke transaksinya.
CREATE POLICY "Allow access based on transaction"
ON public.transaction_items FOR ALL
USING (
  transaction_id IN (
    SELECT id FROM public.transactions
  )
);

-- Memberikan izin kepada peran 'postgres' untuk memanggil fungsi yang dibuat
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.get_organizations_for_user(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.get_users_in_organization(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.process_checkout(uuid, uuid, uuid, numeric, text, jsonb) TO postgres;

-- Memberikan izin kepada peran 'authenticated' (pengguna yang login)
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organizations_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_in_organization(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_checkout(uuid, uuid, uuid, numeric, text, jsonb) TO authenticated;
