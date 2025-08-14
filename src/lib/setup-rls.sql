-- setup-rls.sql

-- Ekstensi yang Diperlukan
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Buat Tabel tanpa foreign key atau yang tidak memiliki dependensi
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name character varying NOT NULL,
    address text,
    phone character varying,
    logo_url text,
    parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.grades (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    price_multiplier numeric(5,2) NOT NULL DEFAULT 1.00,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.aromas (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    category character varying,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    size integer NOT NULL,
    unit character varying NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.categories (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date date NOT NULL,
    category character varying NOT NULL,
    description text NOT NULL,
    amount numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.settings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key character varying NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(organization_id, key)
);

CREATE TABLE IF NOT EXISTS public.customers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    email character varying,
    phone character varying,
    loyalty_points integer DEFAULT 0 NOT NULL,
    transaction_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.raw_materials (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    brand character varying,
    quantity integer NOT NULL,
    unit character varying NOT NULL,
    category character varying,
    purchase_price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Buat tabel yang memiliki dependensi
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email character varying,
    full_name character varying,
    avatar_url text,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    role character varying DEFAULT 'cashier'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.products (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    stock integer NOT NULL,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.promotions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    type character varying NOT NULL,
    value numeric(10, 2) NOT NULL,
    get_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cashier_id uuid NOT NULL REFERENCES public.profiles(id),
    customer_id uuid REFERENCES public.customers(id),
    total_amount numeric(10,2) NOT NULL,
    payment_method character varying NOT NULL,
    status character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transaction_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id),
    raw_material_id uuid REFERENCES public.raw_materials(id),
    quantity integer NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    grade_id uuid NOT NULL REFERENCES public.grades(id),
    aroma_id uuid NOT NULL REFERENCES public.aromas(id),
    bottle_size_id uuid NOT NULL REFERENCES public.bottle_sizes(id),
    price numeric(10,2) NOT NULL,
    instructions text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(organization_id, grade_id, aroma_id, bottle_size_id)
);


-- 3. Fungsi Helper untuk RLS
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_users_in_organization(p_user_id uuid)
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role text;
    v_organization_id uuid;
BEGIN
    SELECT role, organization_id INTO v_user_role, v_organization_id FROM public.profiles WHERE id = p_user_id;

    IF v_user_role = 'superadmin' THEN
        RETURN QUERY SELECT id FROM public.profiles;
    ELSIF v_user_role IN ('owner', 'admin') THEN
        RETURN QUERY
        WITH RECURSIVE org_hierarchy AS (
            SELECT id FROM public.organizations WHERE id = v_organization_id
            UNION
            SELECT o.id FROM public.organizations o
            INNER JOIN org_hierarchy oh ON o.parent_organization_id = oh.id
        )
        SELECT p.id FROM public.profiles p WHERE p.organization_id IN (SELECT id FROM org_hierarchy);
    ELSE
        RETURN QUERY SELECT p_user_id;
    END IF;
END;
$$;


-- 4. Aktifkan RLS dan Buat Kebijakan
-- Fungsi untuk mengaktifkan RLS pada tabel jika ada
CREATE OR REPLACE PROCEDURE public.enable_rls_if_exists(p_table_name text)
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = p_table_name) THEN
        EXECUTE 'ALTER TABLE public.' || quote_ident(p_table_name) || ' ENABLE ROW LEVEL SECURITY;';
        EXECUTE 'ALTER TABLE public.' || quote_ident(p_table_name) || ' FORCE ROW LEVEL SECURITY;';
    END IF;
END;
$$;

DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        CALL public.enable_rls_if_exists(t_name);
    END LOOP;
END;
$$;


-- Kebijakan RLS
-- Kebijakan untuk 'organizations'
CREATE POLICY "Allow read access to all authenticated users" ON public.organizations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow owner/superadmin to manage organizations" ON public.organizations FOR ALL USING (public.get_user_role(auth.uid()) IN ('owner', 'superadmin'));

-- Kebijakan untuk 'profiles'
CREATE POLICY "Allow users to read their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow users in same org hierarchy to see each other" ON public.profiles FOR SELECT USING (id IN (SELECT user_id FROM public.get_users_in_organization(auth.uid())));
CREATE POLICY "Allow owner/admin/superadmin to update profiles in their org" ON public.profiles FOR UPDATE USING (id IN (SELECT user_id FROM public.get_users_in_organization(auth.uid())));

-- Kebijakan generik untuk tabel data utama
DO $$
DECLARE
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['products', 'raw_materials', 'customers', 'transactions', 'transaction_items', 'promotions', 'categories', 'grades', 'aromas', 'bottle_sizes', 'recipes', 'expenses', 'settings']
    LOOP
        EXECUTE format('
            CREATE POLICY "Allow read access based on organization" ON public.%I
            FOR SELECT
            USING (
                organization_id IN (
                    SELECT org.id FROM public.organizations org
                    JOIN public.profiles p ON org.id = p.organization_id
                    WHERE p.id = auth.uid()
                ) OR
                organization_id IN (
                    SELECT org.id FROM public.organizations org
                    JOIN public.profiles p ON org.parent_organization_id = p.organization_id
                    WHERE p.id = auth.uid() AND p.role IN (''owner'', ''superadmin'')
                )
            );
        ', table_name);

        EXECUTE format('
            CREATE POLICY "Allow full access based on organization" ON public.%I
            FOR ALL
            USING (
                organization_id IN (
                    SELECT org.id FROM public.organizations org
                    JOIN public.profiles p ON org.id = p.organization_id
                    WHERE p.id = auth.uid()
                ) OR
                organization_id IN (
                    SELECT org.id FROM public.organizations org
                    JOIN public.profiles p ON org.parent_organization_id = p.organization_id
                    WHERE p.id = auth.uid() AND p.role IN (''owner'', ''superadmin'')
                )
            );
        ', table_name);
    END LOOP;
END;
$$;

-- 5. Fungsi RPC (Remote Procedure Call)
CREATE OR REPLACE FUNCTION public.process_checkout(
    p_organization_id uuid,
    p_cashier_id uuid,
    p_customer_id uuid,
    p_items jsonb,
    p_total_amount numeric,
    p_payment_method text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_id uuid;
    v_item record;
BEGIN
    -- 1. Buat record transaksi baru
    INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    -- 2. Loop melalui item dan masukkan ke transaction_items & update stok
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity integer, price numeric)
    LOOP
        -- Masukkan ke transaction_items
        INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
        VALUES (v_transaction_id, v_item.product_id, v_item.quantity, v_item.price);

        -- Update stok produk
        UPDATE public.products
        SET stock = stock - v_item.quantity
        WHERE id = v_item.product_id;
    END LOOP;

    -- 3. Update data pelanggan jika ada
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1,
            loyalty_points = loyalty_points + floor(p_total_amount / 10000) -- Contoh: 1 poin per 10rb
        WHERE id = p_customer_id;
    END IF;

    RETURN v_transaction_id;
END;
$$;

-- Beri izin pada peran 'authenticated' untuk menjalankan fungsi RPC
GRANT EXECUTE ON FUNCTION public.process_checkout(uuid, uuid, uuid, jsonb, numeric, text) TO authenticated;
