-- 1. Buat custom type untuk peran pengguna agar konsisten
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('owner', 'admin', 'cashier', 'superadmin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer', 'e_wallet', 'qris', 'debit');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
        CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotion_type') THEN
        CREATE TYPE promotion_type AS ENUM ('Persentase', 'Nominal', 'BOGO');
    END IF;
END$$;


-- 2. Buat tabel utama tanpa relasi terlebih dahulu
-- Tabel Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name character varying NOT NULL,
    address text,
    phone character varying,
    logo_url text,
    parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.organizations IS 'Tabel untuk menyimpan data organisasi atau toko.';

-- Tabel Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email character varying,
    full_name text,
    avatar_url text,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    role user_role DEFAULT 'cashier'::user_role,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.profiles IS 'Tabel untuk menyimpan data profil pengguna, menghubungkan ke auth.users dan organizations.';

-- 3. Buat tabel-tabel data lainnya yang memiliki foreign key ke organizations
-- Tabel Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Products
CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    description text,
    price numeric NOT NULL,
    stock integer NOT NULL,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Raw Materials
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    brand character varying,
    quantity numeric NOT NULL,
    unit character varying NOT NULL,
    category character varying,
    purchase_price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    email character varying,
    phone character varying,
    loyalty_points integer DEFAULT 0 NOT NULL,
    transaction_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cashier_id uuid NOT NULL REFERENCES public.profiles(id),
    customer_id uuid REFERENCES public.customers(id),
    total_amount numeric NOT NULL,
    payment_method payment_method NOT NULL,
    status transaction_status DEFAULT 'completed'::transaction_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Transaction Items
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id),
    raw_material_id uuid REFERENCES public.raw_materials(id),
    quantity numeric NOT NULL,
    price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Promotions
CREATE TABLE IF NOT EXISTS public.promotions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    type promotion_type NOT NULL,
    value numeric NOT NULL,
    get_product_id uuid REFERENCES public.products(id),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Grades
CREATE TABLE IF NOT EXISTS public.grades (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    price_multiplier numeric DEFAULT 1.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Aromas
CREATE TABLE IF NOT EXISTS public.aromas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    category character varying,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Bottle Sizes
CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    size integer NOT NULL,
    unit character varying NOT NULL,
    price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Recipes
CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    grade_id uuid NOT NULL REFERENCES public.grades(id),
    aroma_id uuid NOT NULL REFERENCES public.aromas(id),
    bottle_size_id uuid NOT NULL REFERENCES public.bottle_sizes(id),
    instructions text,
    price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date date NOT NULL,
    category character varying NOT NULL,
    description text,
    amount numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Settings
CREATE TABLE IF NOT EXISTS public.settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key character varying NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (organization_id, key)
);


-- 4. Buat fungsi-fungsi helper untuk RLS
-- Fungsi untuk mendapatkan peran pengguna dari tabel profiles
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT role::text FROM public.profiles WHERE id = p_user_id
  );
END;
$$;

-- Fungsi untuk mendapatkan daftar organisasi yang bisa diakses user
CREATE OR REPLACE FUNCTION get_accessible_organizations(p_user_id uuid)
RETURNS TABLE(org_id uuid)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_role TEXT;
    v_organization_id UUID;
BEGIN
    SELECT role, organization_id INTO v_user_role, v_organization_id
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_user_role = 'superadmin' THEN
        RETURN QUERY SELECT id FROM public.organizations;
    ELSIF v_user_role = 'owner' THEN
        -- Owner bisa akses organisasi induknya dan semua anakannya
        RETURN QUERY
        WITH RECURSIVE org_hierarchy AS (
            SELECT id FROM public.organizations WHERE id = v_organization_id
            UNION
            SELECT o.id FROM public.organizations o
            INNER JOIN org_hierarchy oh ON o.parent_organization_id = oh.id
        )
        SELECT id FROM org_hierarchy;
    ELSE
        -- Admin & Cashier hanya bisa akses organisasi mereka sendiri
        RETURN QUERY SELECT id FROM public.organizations WHERE id = v_organization_id;
    END IF;
END;
$$;


-- 5. Aktifkan RLS untuk semua tabel
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

-- Hapus kebijakan yang mungkin sudah ada sebelumnya untuk pembersihan
DROP POLICY IF EXISTS "Allow full access for superadmins" ON public.organizations;
DROP POLICY IF EXISTS "Allow users to view their own organization and its children" ON public.organizations;
DROP POLICY IF EXISTS "Allow full access for superadmins" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow organization members to manage profiles within their hierarchy" ON public.profiles;
DROP POLICY IF EXISTS "Allow organization members to manage data in their accessible orgs" ON public.products;
DROP POLICY IF EXISTS "Allow organization members to manage data in their accessible orgs" ON public.raw_materials;
DROP POLICY IF EXISTS "Allow organization members to manage data in their accessible orgs" ON public.customers;
DROP POLICY IF EXISTS "Allow organization members to manage data in their accessible orgs" ON public.transactions;
DROP POLICY IF EXISTS "Allow related users to view transaction items" ON public.transaction_items;
DROP POLICY IF EXISTS "Allow organization members to manage data in their accessible orgs" ON public.promotions;
DROP POLICY IF EXISTS "Allow organization members to manage data in their accessible orgs" ON public.categories;
DROP POLICY IF EXISTS "Allow organization members to manage data in their accessible orgs" ON public.grades;
DROP POLICY IF EXISTS "Allow organization members to manage data in their accessible orgs" ON public.aromas;
DROP POLICY IF EXISTS "Allow organization members to manage data in their accessible orgs" ON public.bottle_sizes;
DROP POLICY IF EXISTS "Allow organization members to manage data in their accessible orgs" ON public.recipes;
DROP POLICY IF EXISTS "Allow organization members to manage data in their accessible orgs" ON public.expenses;
DROP POLICY IF EXISTS "Allow organization members to manage data in their accessible orgs" ON public.settings;


-- 6. Buat kebijakan RLS
-- Kebijakan untuk Organizations
CREATE POLICY "Allow full access for superadmins" ON public.organizations FOR ALL USING (get_user_role(auth.uid()) = 'superadmin');
CREATE POLICY "Allow users to view their own organization and its children" ON public.organizations FOR SELECT USING (id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())));

-- Kebijakan untuk Profiles
CREATE POLICY "Allow full access for superadmins" ON public.profiles FOR ALL USING (get_user_role(auth.uid()) = 'superadmin');
CREATE POLICY "Allow users to view their own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Allow organization members to manage profiles within their hierarchy" ON public.profiles FOR ALL
    USING (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())))
    WITH CHECK (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())));

-- Buat satu kebijakan generik untuk semua tabel data lainnya
CREATE POLICY "Allow organization members to manage data in their accessible orgs" ON public.products FOR ALL
    USING (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())))
    WITH CHECK (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Allow organization members to manage data in their accessible orgs" ON public.raw_materials FOR ALL
    USING (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())))
    WITH CHECK (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Allow organization members to manage data in their accessible orgs" ON public.customers FOR ALL
    USING (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())))
    WITH CHECK (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Allow organization members to manage data in their accessible orgs" ON public.transactions FOR ALL
    USING (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())))
    WITH CHECK (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Allow related users to view transaction items" ON public.transaction_items FOR SELECT
    USING (
        (SELECT organization_id FROM public.transactions WHERE id = transaction_id)
        IN (SELECT org_id FROM get_accessible_organizations(auth.uid()))
    );

CREATE POLICY "Allow organization members to manage data in their accessible orgs" ON public.promotions FOR ALL
    USING (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())))
    WITH CHECK (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Allow organization members to manage data in their accessible orgs" ON public.categories FOR ALL
    USING (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())))
    WITH CHECK (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Allow organization members to manage data in their accessible orgs" ON public.grades FOR ALL
    USING (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())))
    WITH CHECK (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Allow organization members to manage data in their accessible orgs" ON public.aromas FOR ALL
    USING (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())))
    WITH CHECK (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Allow organization members to manage data in their accessible orgs" ON public.bottle_sizes FOR ALL
    USING (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())))
    WITH CHECK (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Allow organization members to manage data in their accessible orgs" ON public.recipes FOR ALL
    USING (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())))
    WITH CHECK (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Allow organization members to manage data in their accessible orgs" ON public.expenses FOR ALL
    USING (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())))
    WITH CHECK (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())));

CREATE POLICY "Allow organization members to manage data in their accessible orgs" ON public.settings FOR ALL
    USING (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())))
    WITH CHECK (organization_id IN (SELECT org_id FROM get_accessible_organizations(auth.uid())));


-- 7. Fungsi untuk proses checkout (RPC)
CREATE OR REPLACE FUNCTION process_checkout(
    p_organization_id uuid,
    p_cashier_id uuid,
    p_customer_id uuid,
    p_items json,
    p_total_amount numeric,
    p_payment_method payment_method
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_transaction_id uuid;
    v_item json;
BEGIN
    -- 1. Buat record transaksi baru
    INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    -- 2. Loop melalui item di keranjang dan masukkan ke transaction_items
    FOR v_item IN SELECT * FROM json_array_elements(p_items)
    LOOP
        INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
        VALUES (
            v_transaction_id,
            (v_item->>'product_id')::uuid,
            (v_item->>'quantity')::numeric,
            (v_item->>'price')::numeric
        );

        -- 3. Update stok produk
        UPDATE public.products
        SET stock = stock - (v_item->>'quantity')::integer
        WHERE id = (v_item->>'product_id')::uuid;
    END LOOP;

    -- 4. Update data pelanggan jika ada
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id;
    END IF;

    RETURN v_transaction_id;
END;
$$;
