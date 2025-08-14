
-- Fungsi helper untuk mengekstrak claim JWT
create or replace function auth.get_user_role()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'user_role', '')::text;
$$;

-- 1. Buat tabel Organisasi (Toko & Outlet)
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

-- 2. Buat tabel Profil Pengguna
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    organization_id UUID REFERENCES public.organizations(id),
    role TEXT, -- 'owner', 'admin', 'cashier', 'superadmin'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Buat tabel Kategori Produk
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Buat tabel Produk Jadi
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    stock INT NOT NULL,
    category_id UUID REFERENCES public.categories(id),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Buat tabel Bahan Baku
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

-- 6. Buat tabel Pelanggan
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    loyalty_points INT DEFAULT 0,
    transaction_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Buat tabel Transaksi
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    cashier_id UUID NOT NULL REFERENCES public.profiles(id),
    customer_id UUID REFERENCES public.customers(id),
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Buat tabel Item Transaksi
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    raw_material_id UUID REFERENCES public.raw_materials(id),
    quantity INT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Buat tabel Promosi
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name VARCHAR(255) NOT NULL,
    type TEXT NOT NULL, -- 'Persentase', 'Nominal', 'BOGO'
    value NUMERIC NOT NULL,
    get_product_id UUID REFERENCES public.products(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Buat tabel Grades (kualitas parfum)
CREATE TABLE IF NOT EXISTS public.grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name VARCHAR(255) NOT NULL,
    price_multiplier NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Buat tabel Aromas
CREATE TABLE IF NOT EXISTS public.aromas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Buat tabel Ukuran Botol
CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    size INT NOT NULL,
    unit VARCHAR(20) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Buat tabel Resep
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name VARCHAR(255) NOT NULL,
    grade_id UUID REFERENCES public.grades(id),
    aroma_id UUID REFERENCES public.aromas(id),
    bottle_size_id UUID REFERENCES public.bottle_sizes(id),
    price NUMERIC(10,2) NOT NULL,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Buat tabel Beban
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    date DATE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Buat tabel Pengaturan
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    key VARCHAR(100) NOT NULL,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, key)
);


-- =================================================================
-- AKTIFKAN ROW LEVEL SECURITY (RLS) UNTUK SETIAP TABEL
-- =================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aromas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bottle_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;


-- Hapus policy lama jika ada untuk menghindari error
DROP POLICY IF EXISTS "Allow all access for superadmins" ON public.organizations;
DROP POLICY IF EXISTS "Allow owner/admin to view their own organization hierarchy" ON public.organizations;
DROP POLICY IF EXISTS "Allow all access for superadmins" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow owner/admin to view users in their organization" ON public.profiles;
DROP POLICY IF EXISTS "General access policy for organization data" ON public.categories;
DROP POLICY IF EXISTS "General access policy for organization data" ON public.products;
DROP POLICY IF EXISTS "General access policy for organization data" ON public.raw_materials;
DROP POLICY IF EXISTS "General access policy for organization data" ON public.customers;
DROP POLICY IF EXISTS "General access policy for organization data" ON public.transactions;
DROP POLICY IF EXISTS "General access policy for organization data" ON public.promotions;
DROP POLICY IF EXISTS "General access policy for organization data" ON public.grades;
DROP POLICY IF EXISTS "General access policy for organization data" ON public.aromas;
DROP POLICY IF EXISTS "General access policy for organization data" ON public.bottle_sizes;
DROP POLICY IF EXISTS "General access policy for organization data" ON public.recipes;
DROP POLICY IF EXISTS "General access policy for organization data" ON public.expenses;
DROP POLICY IF EXISTS "General access policy for organization data" ON public.settings;
DROP POLICY IF EXISTS "Allow read access based on transaction" ON public.transaction_items;


-- =================================================================
-- KEBIJAKAN RLS (ROW LEVEL SECURITY POLICIES)
-- =================================================================

-- Fungsi untuk mendapatkan semua ID outlet di bawah organisasi induk pengguna
CREATE OR REPLACE FUNCTION get_organization_and_its_outlets()
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_parent_org_id UUID;
BEGIN
    -- Dapatkan ID organisasi dari profil pengguna yang sedang login
    SELECT organization_id INTO v_parent_org_id FROM public.profiles WHERE id = auth.uid();

    -- Kembalikan ID organisasi induk DAN semua outlet di bawahnya
    RETURN QUERY
    SELECT id FROM public.organizations
    WHERE public.organizations.id = v_parent_org_id OR public.organizations.parent_organization_id = v_parent_org_id;
END;
$$;

-- Fungsi untuk mendapatkan daftar pengguna yang absah dalam satu organisasi (untuk admin/owner)
CREATE OR REPLACE FUNCTION get_users_in_organization(org_id UUID)
RETURNS TABLE(user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id FROM public.profiles p WHERE p.organization_id = org_id;
END;
$$;


-- Kebijakan untuk tabel ORGANIZATIONS
CREATE POLICY "Allow all access for superadmins" ON public.organizations FOR ALL
    USING (auth.get_user_role() = 'superadmin');
CREATE POLICY "Allow owner/admin to view their own organization hierarchy" ON public.organizations FOR SELECT
    USING (id IN (SELECT get_organization_and_its_outlets()));

-- Kebijakan untuk tabel PROFILES
CREATE POLICY "Allow all access for superadmins" ON public.profiles FOR ALL
    USING (auth.get_user_role() = 'superadmin');
CREATE POLICY "Allow users to view their own profile" ON public.profiles FOR SELECT
    USING (id = auth.uid());
CREATE POLICY "Allow owner/admin to view users in their organization" ON public.profiles FOR SELECT
    USING (organization_id IN (SELECT get_organization_and_its_outlets()));


-- Kebijakan umum untuk tabel data yang lain
CREATE POLICY "General access policy for organization data" ON public.categories FOR ALL
    USING (organization_id IN (SELECT get_organization_and_its_outlets()));
CREATE POLICY "General access policy for organization data" ON public.products FOR ALL
    USING (organization_id IN (SELECT get_organization_and_its_outlets()));
CREATE POLICY "General access policy for organization data" ON public.raw_materials FOR ALL
    USING (organization_id IN (SELECT get_organization_and_its_outlets()));
CREATE POLICY "General access policy for organization data" ON public.customers FOR ALL
    USING (organization_id IN (SELECT get_organization_and_its_outlets()));
CREATE POLICY "General access policy for organization data" ON public.transactions FOR ALL
    USING (organization_id IN (SELECT get_organization_and_its_outlets()));
CREATE POLICY "General access policy for organization data" ON public.promotions FOR ALL
    USING (organization_id IN (SELECT get_organization_and_its_outlets()));
CREATE POLICY "General access policy for organization data" ON public.grades FOR ALL
    USING (organization_id IN (SELECT get_organization_and_its_outlets()));
CREATE POLICY "General access policy for organization data" ON public.aromas FOR ALL
    USING (organization_id IN (SELECT get_organization_and_its_outlets()));
CREATE POLICY "General access policy for organization data" ON public.bottle_sizes FOR ALL
    USING (organization_id IN (SELECT get_organization_and_its_outlets()));
CREATE POLICY "General access policy for organization data" ON public.recipes FOR ALL
    USING (organization_id IN (SELECT get_organization_and_its_outlets()));
CREATE POLICY "General access policy for organization data" ON public.expenses FOR ALL
    USING (organization_id IN (SELECT get_organization_and_its_outlets()));
CREATE POLICY "General access policy for organization data" ON public.settings FOR ALL
    USING (organization_id IN (SELECT get_organization_and_its_outlets()));


-- Kebijakan untuk TRANSACTION_ITEMS (sedikit lebih kompleks, hanya bisa dilihat jika bisa melihat transaksi induknya)
CREATE POLICY "Allow read access based on transaction" ON public.transaction_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.transactions t
            WHERE t.id = transaction_id
            -- RLS pada tabel transactions akan otomatis diterapkan di subquery ini
        )
    );
-- Untuk INSERT/UPDATE/DELETE, kita asumsikan itu ditangani oleh fungsi RPC atau dari backend yang terpercaya.


-- =================================================================
-- FUNGSI RPC (REMOTE PROCEDURE CALL)
-- =================================================================

-- Fungsi untuk memproses checkout sebagai satu transaksi atomik
CREATE OR REPLACE FUNCTION public.process_checkout(
    p_organization_id UUID,
    p_cashier_id UUID,
    p_customer_id UUID,
    p_items JSONB,
    p_total_amount NUMERIC,
    p_payment_method TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_quantity INT;
BEGIN
    -- 1. Buat record transaksi baru
    INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    -- 2. Loop melalui item di keranjang dan masukkan ke transaction_items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::INT;

        INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
        VALUES (v_transaction_id, v_product_id, v_quantity, (SELECT price FROM public.products WHERE id = v_product_id));

        -- 3. Kurangi stok produk
        UPDATE public.products
        SET stock = stock - v_quantity
        WHERE id = v_product_id;
    END LOOP;

    -- 4. Update transaction_count untuk customer jika ada
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id;
    END IF;

    RETURN v_transaction_id;
END;
$$;
