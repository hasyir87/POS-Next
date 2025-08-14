-- ------------------------------------------------------------------------------------------------
-- 0. Skema Eksekusi SQL untuk Superadmin
-- ------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS TEXT AS $$
BEGIN
  EXECUTE sql;
  RETURN 'Command executed successfully';
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------------------------
-- 1. Tabel Utama
-- ------------------------------------------------------------------------------------------------

-- Tabel Organisasi (Toko Induk & Outlet)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    logo_url TEXT,
    parent_organization_id UUID REFERENCES public.organizations(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Profil Pengguna (menghubungkan auth.users ke organizations)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    organization_id UUID REFERENCES public.organizations(id),
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'cashier', 'superadmin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Kategori Produk
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Produk Jadi
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    category_id UUID REFERENCES public.categories(id),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Pelanggan
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    loyalty_points INTEGER DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Bahan Baku
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    quantity NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    purchase_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Promosi
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Persentase', 'Nominal', 'BOGO')),
    value NUMERIC NOT NULL,
    get_product_id UUID REFERENCES public.products(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Grade Parfum (untuk sistem Refill)
CREATE TABLE IF NOT EXISTS public.grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name VARCHAR(255) NOT NULL,
    price_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Aroma (untuk sistem Refill)
CREATE TABLE IF NOT EXISTS public.aromas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Ukuran Botol (untuk sistem Refill)
CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    size INTEGER NOT NULL,
    unit VARCHAR(50) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Resep (untuk sistem Refill)
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name VARCHAR(255) NOT NULL,
    grade_id UUID NOT NULL REFERENCES public.grades(id),
    aroma_id UUID NOT NULL REFERENCES public.aromas(id),
    bottle_size_id UUID NOT NULL REFERENCES public.bottle_sizes(id),
    price NUMERIC(10, 2) NOT NULL,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Transaksi
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    cashier_id UUID NOT NULL REFERENCES public.profiles(id),
    customer_id UUID REFERENCES public.customers(id),
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'qris', 'debit', 'card')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Item Transaksi
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    raw_material_id UUID REFERENCES public.raw_materials(id),
    quantity INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Beban/Pengeluaran
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    date DATE NOT NULL,
    category VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Pengaturan
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (organization_id, key)
);


-- ------------------------------------------------------------------------------------------------
-- 2. Fungsi Helper untuk RLS
-- ------------------------------------------------------------------------------------------------

-- Fungsi untuk mendapatkan peran pengguna dari tabel public.profiles
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_role VARCHAR;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = p_user_id;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Fungsi untuk mendapatkan semua ID organisasi yang boleh diakses pengguna (induk + semua anak outlet)
CREATE OR REPLACE FUNCTION get_accessible_organizations(p_user_id UUID)
RETURNS TABLE(organization_id UUID) AS $$
DECLARE
    v_user_org_id UUID;
    v_user_role VARCHAR;
BEGIN
    SELECT organization_id, role INTO v_user_org_id, v_user_role
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_user_role = 'superadmin' THEN
        -- Superadmin bisa akses semua organisasi
        RETURN QUERY SELECT id FROM public.organizations;
    ELSIF v_user_org_id IS NOT NULL THEN
        -- Pengguna lain bisa akses organisasi mereka sendiri dan semua outlet di bawahnya
        RETURN QUERY
        WITH RECURSIVE org_hierarchy AS (
            -- Mulai dari organisasi induk pengguna
            SELECT id FROM public.organizations WHERE id = v_user_org_id
            UNION ALL
            -- Cari semua anak outlet secara rekursif
            SELECT o.id FROM public.organizations o
            INNER JOIN org_hierarchy oh ON o.parent_organization_id = oh.id
        )
        SELECT id FROM org_hierarchy;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------------------------
-- 3. Kebijakan Row-Level Security (RLS)
-- ------------------------------------------------------------------------------------------------

-- Mengaktifkan RLS untuk semua tabel
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aromas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bottle_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;


-- Menghapus kebijakan lama jika ada untuk pembersihan
DROP POLICY IF EXISTS "Allow all access for superadmin" ON public.profiles;
DROP POLICY IF EXISTS "Allow owner/admin to manage users in their org" ON public.profiles;
DROP POLICY IF EXISTS "Allow user to view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow all access based on accessible organizations" ON public.organizations;
DROP POLICY IF EXISTS "Default policy for data tables" ON public.products;
DROP POLICY IF EXISTS "Default policy for data tables" ON public.customers;
-- (tambahkan drop policy untuk tabel lain jika diperlukan)


-- Kebijakan untuk tabel organizations
CREATE POLICY "Allow all access based on accessible organizations"
ON public.organizations FOR ALL
USING (id IN (SELECT get_accessible_organizations.organization_id FROM get_accessible_organizations(auth.uid())));

-- Kebijakan untuk tabel profiles
CREATE POLICY "Allow superadmin full access" ON public.profiles
FOR ALL USING (get_user_role(auth.uid()) = 'superadmin');

CREATE POLICY "Allow owner/admin to manage users in their org" ON public.profiles
FOR ALL USING (organization_id IN (SELECT get_accessible_organizations.organization_id FROM get_accessible_organizations(auth.uid())))
WITH CHECK (organization_id IN (SELECT get_accessible_organizations.organization_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Allow user to view their own profile" ON public.profiles
FOR SELECT USING (id = auth.uid());


-- Kebijakan generik untuk semua tabel data lainnya
CREATE POLICY "Default policy for data tables"
ON public.products FOR ALL
USING (organization_id IN (SELECT get_accessible_organizations.organization_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Default policy for data tables"
ON public.customers FOR ALL
USING (organization_id IN (SELECT get_accessible_organizations.organization_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Default policy for data tables"
ON public.raw_materials FOR ALL
USING (organization_id IN (SELECT get_accessible_organizations.organization_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Default policy for data tables"
ON public.promotions FOR ALL
USING (organization_id IN (SELECT get_accessible_organizations.organization_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Default policy for data tables"
ON public.categories FOR ALL
USING (organization_id IN (SELECT get_accessible_organizations.organization_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Default policy for data tables"
ON public.grades FOR ALL
USING (organization_id IN (SELECT get_accessible_organizations.organization_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Default policy for data tables"
ON public.aromas FOR ALL
USING (organization_id IN (SELECT get_accessible_organizations.organization_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Default policy for data tables"
ON public.bottle_sizes FOR ALL
USING (organization_id IN (SELECT get_accessible_organizations.organization_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Default policy for data tables"
ON public.recipes FOR ALL
USING (organization_id IN (SELECT get_accessible_organizations.organization_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Default policy for data tables"
ON public.transactions FOR ALL
USING (organization_id IN (SELECT get_accessible_organizations.organization_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Default policy for data tables"
ON public.expenses FOR ALL
USING (organization_id IN (SELECT get_accessible_organizations.organization_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Default policy for data tables"
ON public.settings FOR ALL
USING (organization_id IN (SELECT get_accessible_organizations.organization_id FROM get_accessible_organizations(auth.uid())));

-- Kebijakan spesifik untuk transaction_items (berdasarkan transaksi induk)
CREATE POLICY "Allow access based on parent transaction"
ON public.transaction_items FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.id = transaction_id AND t.organization_id IN (SELECT get_accessible_organizations.organization_id FROM get_accessible_organizations(auth.uid()))
  )
);


-- ------------------------------------------------------------------------------------------------
-- 4. Fungsi RPC (Remote Procedure Call)
-- ------------------------------------------------------------------------------------------------

-- Fungsi untuk memproses checkout
CREATE OR REPLACE FUNCTION process_checkout(
    p_organization_id UUID,
    p_cashier_id UUID,
    p_customer_id UUID,
    p_items JSONB,
    p_total_amount NUMERIC,
    p_payment_method VARCHAR
) RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    item RECORD;
BEGIN
    -- 1. Buat record transaksi baru
    INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    -- 2. Loop melalui item di keranjang dan masukkan ke transaction_items & update stok
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER, price NUMERIC)
    LOOP
        -- Masukkan item ke transaction_items
        INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
        VALUES (v_transaction_id, item.product_id, item.quantity, item.price);

        -- Update stok produk
        UPDATE public.products
        SET stock = stock - item.quantity
        WHERE id = item.product_id;
    END LOOP;

    -- 3. Update data pelanggan jika ada
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id;
    END IF;

    -- 4. Kembalikan ID transaksi yang baru dibuat
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;
