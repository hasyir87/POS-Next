-- Hapus Kebijakan yang Ada Terlebih Dahulu untuk Menghindari Konflik Dependensi
DROP POLICY IF EXISTS "Allow individual user read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow user to manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin/owner to manage users in their organization" ON public.profiles;

DROP POLICY IF EXISTS "Allow superadmin full access" ON public.organizations;
DROP POLICY IF EXISTS "Allow owner to manage their organization and sub-organizations" ON public.organizations;
DROP POLICY IF EXISTS "Allow user to view their own organization" ON public.organizations;

DROP POLICY IF EXISTS "Allow full access based on organization" ON public.products;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.raw_materials;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.customers;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.transactions;
DROP POLICY IF EXISTS "Allow access for related transactions" ON public.transaction_items;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.promotions;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.categories;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.grades;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.aromas;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.bottle_sizes;
DROP POLICY IF EXISTS "Allow access for related recipe items" ON public.recipes;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.expenses;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.settings;


-- Hapus Fungsi yang Ada untuk Memungkinkan Pembuatan Ulang
DROP FUNCTION IF EXISTS public.exec_sql(text);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.get_users_in_organization(uuid);
DROP FUNCTION IF EXISTS public.process_checkout(uuid, uuid, uuid, jsonb, numeric, text);


-- =================================================================
-- BUAT FUNGSI HELPER
-- =================================================================

CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    EXECUTE sql;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = p_user_id;
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.get_users_in_organization(p_user_id UUID)
RETURNS TABLE(user_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT id
    FROM public.profiles
    WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =================================================================
-- BUAT TABEL
-- =================================================================

-- Tabel Organisasi (Toko Induk & Outlet)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    logo_url TEXT,
    parent_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabel Profil Pengguna
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'cashier', 'superadmin')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabel Kategori Produk
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabel Produk Jadi
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    stock INTEGER NOT NULL,
    category_id UUID REFERENCES public.categories(id),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabel Bahan Baku (Raw Materials)
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brand TEXT,
    quantity NUMERIC(10, 2) NOT NULL,
    unit TEXT NOT NULL,
    category TEXT,
    purchase_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabel Pelanggan (Customers)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    loyalty_points INTEGER DEFAULT 0 NOT NULL,
    transaction_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabel Transaksi
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cashier_id UUID NOT NULL REFERENCES public.profiles(id),
    customer_id UUID REFERENCES public.customers(id),
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer', 'e_wallet', 'qris', 'debit')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabel Item Transaksi
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    raw_material_id UUID REFERENCES public.raw_materials(id),
    quantity NUMERIC(10, 2) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabel Promosi
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Persentase', 'Nominal', 'BOGO')),
    value NUMERIC NOT NULL,
    get_product_id UUID REFERENCES public.products(id),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabel Grade Parfum
CREATE TABLE IF NOT EXISTS public.grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
    extra_essence_price NUMERIC(10, 2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabel Aroma Parfum
CREATE TABLE IF NOT EXISTS public.aromas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabel Ukuran Botol
CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    size INTEGER NOT NULL,
    unit TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabel Resep Parfum
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade_id UUID REFERENCES public.grades(id),
    aroma_id UUID REFERENCES public.aromas(id),
    bottle_size_id UUID REFERENCES public.bottle_sizes(id),
    price NUMERIC(10, 2) NOT NULL,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabel Beban (Expenses)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabel Pengaturan (Settings)
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(organization_id, key)
);


-- =================================================================
-- FUNGSI PROSES CHECKOUT
-- =================================================================

CREATE OR REPLACE FUNCTION public.process_checkout(
    p_organization_id UUID,
    p_cashier_id UUID,
    p_customer_id UUID,
    p_items JSONB,
    p_total_amount NUMERIC,
    p_payment_method TEXT
)
RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_quantity NUMERIC;
BEGIN
    -- Masukkan data transaksi utama
    INSERT INTO public.transactions(organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    -- Loop melalui setiap item dalam pesanan
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::NUMERIC;

        -- Masukkan item transaksi
        INSERT INTO public.transaction_items(transaction_id, product_id, quantity, price)
        VALUES (v_transaction_id, v_product_id, v_quantity, (SELECT price FROM public.products WHERE id = v_product_id));

        -- Update stok produk
        UPDATE public.products
        SET stock = stock - v_quantity
        WHERE id = v_product_id;

    END LOOP;

    -- Jika ada customer, update jumlah transaksinya
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id;
    END IF;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;



-- =================================================================
-- AKTIFKAN RLS & BUAT KEBIJAKAN (POLICIES)
-- =================================================================

-- 1. Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow user to view their own organization" ON public.organizations FOR SELECT USING (id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow owner to manage their organization and sub-organizations" ON public.organizations FOR ALL USING (id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow superadmin full access" ON public.organizations FOR ALL USING ((SELECT get_user_role(auth.uid())) = 'superadmin');

-- 2. Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual user read access" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow user to manage their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow admin/owner to manage users in their organization" ON public.profiles FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));


-- 3. Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.products FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- 4. Raw Materials
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.raw_materials FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- 5. Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.customers FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- 6. Transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.transactions FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- 7. Transaction Items
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow access for related transactions" ON public.transaction_items FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.transactions t
        WHERE t.id = transaction_id AND t.organization_id IN (
            SELECT org.id FROM public.organizations org
            WHERE org.id = (SELECT prof.organization_id FROM public.profiles prof WHERE prof.id = auth.uid())
            OR org.parent_organization_id = (SELECT prof.organization_id FROM public.profiles prof WHERE prof.id = auth.uid())
        )
    )
);

-- 8. Promotions
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.promotions FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- 9. Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.categories FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- 10. Grades
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.grades FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- 11. Aromas
ALTER TABLE public.aromas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.aromas FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- 12. Bottle Sizes
ALTER TABLE public.bottle_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.bottle_sizes FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- 13. Recipes
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow access for related recipe items" ON public.recipes FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- 14. Expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.expenses FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- 15. Settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.settings FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

