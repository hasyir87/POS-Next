-- =============================================
-- SECTION 1: CLEANUP (DROPPING OBJECTS IN REVERSE DEPENDENCY ORDER)
-- =============================================

-- Drop Policies first, as they depend on functions.
DROP POLICY IF EXISTS "Allow owner and admin access" ON public.aromas;
DROP POLICY IF EXISTS "Allow owner and admin access" ON public.bottle_sizes;
DROP POLICY IF EXISTS "Allow owner and admin access" ON public.categories;
DROP POLICY IF EXISTS "Allow owner and admin access" ON public.customers;
DROP POLICY IF EXISTS "Allow owner and admin access" ON public.expenses;
DROP POLICY IF EXISTS "Allow owner and admin access" ON public.grades;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.organizations;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.products;
DROP POLICY IF EXISTS "Allow users to read their own profile and admins to read all profiles in their org" ON public.profiles;
DROP POLICY IF EXISTS "Allow owner and admin access" ON public.promotions;
DROP POLICY IF EXISTS "Allow owner and admin access" ON public.raw_materials;
DROP POLICY IF EXISTS "Allow access based on linked tables" ON public.recipes;
DROP POLICY IF EXISTS "Allow owner and admin access" ON public.settings;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.transactions;
DROP POLICY IF EXISTS "Allow access based on parent transaction" ON public.transaction_items;

-- Drop Functions now that no policies depend on them.
DROP FUNCTION IF EXISTS public.exec_sql(text);
DROP FUNCTION IF EXISTS public.get_user_role(p_user_id uuid);
DROP FUNCTION IF EXISTS public.get_users_in_organization(p_organization_id uuid);
DROP FUNCTION IF EXISTS public.process_checkout(uuid, uuid, uuid, jsonb, numeric, text);


-- =============================================
-- SECTION 2: TABLE CREATION
-- =============================================

-- Tabel tanpa dependensi eksternal
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    address text,
    phone text,
    logo_url text,
    parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel yang bergantung pada `organizations` atau `auth.users`
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE,
    full_name text,
    avatar_url text,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('owner', 'admin', 'cashier', 'superadmin')),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric NOT NULL,
    stock integer NOT NULL DEFAULT 0,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.raw_materials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    brand text,
    quantity numeric NOT NULL,
    unit text NOT NULL,
    category text,
    purchase_price numeric NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.customers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    loyalty_points integer DEFAULT 0 NOT NULL,
    transaction_count integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cashier_id uuid NOT NULL REFERENCES public.profiles(id),
    customer_id uuid REFERENCES public.customers(id),
    total_amount numeric NOT NULL,
    payment_method text NOT NULL,
    status text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transaction_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id),
    raw_material_id uuid REFERENCES public.raw_materials(id),
    quantity integer NOT NULL,
    price numeric NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.promotions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL,
    value numeric,
    get_product_id uuid REFERENCES public.products(id),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.grades (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    price_multiplier numeric(5,2) DEFAULT 1.00 NOT NULL,
    extra_essence_price numeric DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.aromas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    category text,
    description text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    size numeric NOT NULL,
    unit text NOT NULL,
    price numeric NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    grade_id uuid REFERENCES public.grades(id),
    aroma_id uuid REFERENCES public.aromas(id),
    bottle_size_id uuid REFERENCES public.bottle_sizes(id),
    price numeric NOT NULL,
    instructions text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date date NOT NULL,
    category text NOT NULL,
    description text,
    amount numeric NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key text NOT NULL,
    value jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(organization_id, key)
);

-- =============================================
-- SECTION 3: HELPER FUNCTIONS & TYPES
-- =============================================
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text AS $$
DECLARE
    v_role text;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SECTION 4: RLS (ROW-LEVEL SECURITY) POLICIES
-- =============================================

-- Enable RLS for all tables
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

-- Policies Definition
CREATE POLICY "Allow full access based on organization" ON public.organizations FOR ALL
USING (
    id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ) OR
    parent_organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ) OR
    (get_user_role(auth.uid()) = 'superadmin')
)
WITH CHECK (
     id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ) OR
    parent_organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ) OR
    (get_user_role(auth.uid()) = 'superadmin')
);

CREATE POLICY "Allow users to read their own profile and admins to read all profiles in their org" ON public.profiles FOR SELECT
USING (
    id = auth.uid() OR
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
);

CREATE POLICY "Allow users to update their own profile" ON public.profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Allow owner and admin access" ON public.products FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
);

CREATE POLICY "Allow owner and admin access" ON public.raw_materials FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
);

CREATE POLICY "Allow owner and admin access" ON public.customers FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
);

CREATE POLICY "Allow full access based on organization" ON public.transactions FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
);

CREATE POLICY "Allow access based on parent transaction" ON public.transaction_items FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.transactions t
        WHERE t.id = transaction_id
        AND (
            t.organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
            (get_user_role(auth.uid()) = 'superadmin')
        )
    )
);

CREATE POLICY "Allow owner and admin access" ON public.promotions FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
);

CREATE POLICY "Allow owner and admin access" ON public.categories FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
);

CREATE POLICY "Allow owner and admin access" ON public.grades FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
);

CREATE POLICY "Allow owner and admin access" ON public.aromas FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
);

CREATE POLICY "Allow owner and admin access" ON public.bottle_sizes FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
);

CREATE POLICY "Allow access based on linked tables" ON public.recipes FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
);

CREATE POLICY "Allow owner and admin access" ON public.expenses FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
);

CREATE POLICY "Allow owner and admin access" ON public.settings FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    (get_user_role(auth.uid()) = 'superadmin')
);

-- =============================================
-- SECTION 5: RPC FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.process_checkout(
    p_organization_id uuid,
    p_cashier_id uuid,
    p_customer_id uuid,
    p_items jsonb,
    p_total_amount numeric,
    p_payment_method text
)
RETURNS uuid AS $$
DECLARE
    v_transaction_id uuid;
    item jsonb;
    v_product_id uuid;
    v_quantity int;
    v_price numeric;
BEGIN
    -- Insert transaction header
    INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    -- Loop through items and insert them
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (item->>'product_id')::uuid;
        v_quantity := (item->>'quantity')::int;
        v_price := (item->>'price')::numeric;

        INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
        VALUES (v_transaction_id, v_product_id, v_quantity, v_price);

        -- Update stock
        UPDATE public.products
        SET stock = stock - v_quantity
        WHERE id = v_product_id
        AND products.organization_id = p_organization_id; -- Explicitly qualify the organization_id
    END LOOP;

    -- Update customer transaction count if customer exists
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id
        AND customers.organization_id = p_organization_id; -- Explicitly qualify the organization_id
    END IF;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;
