
-- =================================================================
-- BAGIAN 1: PEMBERSIHAN (HAPUS KEBIJAKAN & FUNGSI YANG ADA)
-- Menghapus semua kebijakan terlebih dahulu untuk menghilangkan dependensi
-- =================================================================

-- Tabel Organizations
DROP POLICY IF EXISTS "Allow individual read access" ON public.organizations;
DROP POLICY IF EXISTS "Allow owner and superadmin full access" ON public.organizations;

-- Tabel Profiles
DROP POLICY IF EXISTS "Allow individual read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow owner and superadmin full access" ON public.profiles;

-- Tabel Products
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.products;

-- Tabel Raw Materials
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.raw_materials;

-- Tabel Customers
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.customers;

-- Tabel Transactions
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.transactions;

-- Tabel Transaction Items
DROP POLICY IF EXISTS "Allow full access based on parent transaction" ON public.transaction_items;

-- Tabel Promotions
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.promotions;

-- Tabel Categories
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.categories;

-- Tabel Grades
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.grades;

-- Tabel Aromas
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.aromas;

-- Tabel Bottle Sizes
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.bottle_sizes;

-- Tabel Recipes
DROP POLICY IF EXISTS "Allow full access based on related tables" ON public.recipes;

-- Tabel Expenses
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.expenses;

-- Tabel Settings
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.settings;

-- Setelah semua kebijakan dihapus, fungsi dapat dihapus dengan aman
DROP FUNCTION IF EXISTS public.exec_sql(text);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.get_users_in_organization(uuid);
DROP FUNCTION IF EXISTS public.process_checkout(uuid, uuid, uuid, jsonb, numeric, text);
DROP FUNCTION IF EXISTS public.update_product_stock(uuid, integer);


-- =================================================================
-- BAGIAN 2: PEMBUATAN TABEL
-- =================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    address text,
    phone text,
    logo_url text,
    parent_organization_id uuid REFERENCES public.organizations(id),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE,
    full_name text,
    avatar_url text,
    organization_id uuid REFERENCES public.organizations(id),
    role text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    name text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    name text NOT NULL,
    description text,
    price numeric NOT NULL,
    stock integer NOT NULL,
    category_id uuid REFERENCES public.categories(id),
    image_url text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.raw_materials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
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
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
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
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
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
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    name text NOT NULL,
    type text NOT NULL,
    value numeric NOT NULL,
    get_product_id uuid REFERENCES public.products(id),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.grades (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    name text NOT NULL,
    price_multiplier numeric DEFAULT 1.0 NOT NULL,
    extra_essence_price numeric DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.aromas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    name text NOT NULL,
    category text,
    description text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    size integer NOT NULL,
    unit text NOT NULL,
    price numeric NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    name text NOT NULL,
    grade_id uuid NOT NULL REFERENCES public.grades(id),
    aroma_id uuid NOT NULL REFERENCES public.aromas(id),
    bottle_size_id uuid NOT NULL REFERENCES public.bottle_sizes(id),
    price numeric NOT NULL,
    instructions text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    date date NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    amount numeric NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id),
    key text NOT NULL,
    value text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);


-- =================================================================
-- BAGIAN 3: PEMBUATAN FUNGSI
-- =================================================================

CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_users_in_organization(p_user_id uuid)
RETURNS TABLE(id uuid, email text, full_name text, role text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT p.id, p.email, p.full_name, p.role
  FROM public.profiles p
  WHERE p.organization_id = (SELECT organization_id FROM public.profiles WHERE id = p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.update_product_stock(p_product_id uuid, p_quantity_sold integer)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.products
  SET stock = stock - p_quantity_sold
  WHERE id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_checkout(p_organization_id uuid, p_cashier_id uuid, p_customer_id uuid, p_items jsonb, p_total_amount numeric, p_payment_method text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_transaction_id uuid;
  item jsonb;
BEGIN
  INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
  VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
  RETURNING id INTO v_transaction_id;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
    VALUES (v_transaction_id, (item->>'product_id')::uuid, (item->>'quantity')::integer, (item->>'price')::numeric);

    -- Update stock
    PERFORM update_product_stock((item->>'product_id')::uuid, (item->>'quantity')::integer);
  END LOOP;
  
  -- Update customer transaction count if customer is specified
  IF p_customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET transaction_count = transaction_count + 1
    WHERE id = p_customer_id;
  END IF;

  RETURN v_transaction_id;
END;
$$;

-- =================================================================
-- BAGIAN 4: PENGAKTIFAN RLS DAN PEMBUATAN KEBIJAKAN
-- =================================================================

-- Helper function to get organization_id from profiles
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual read access" ON public.organizations FOR SELECT USING (id = get_my_org_id() OR parent_organization_id = get_my_org_id());
CREATE POLICY "Allow owner and superadmin full access" ON public.organizations FOR ALL USING (get_user_role(auth.uid()) IN ('owner', 'superadmin'));

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual access to own profile" ON public.profiles FOR ALL USING (id = auth.uid());
CREATE POLICY "Allow owner and admin to view users in their org" ON public.profiles FOR SELECT USING (organization_id = get_my_org_id() AND get_user_role(auth.uid()) IN ('owner', 'admin', 'superadmin'));

-- Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.products FOR ALL USING (organization_id = get_my_org_id());

-- Raw Materials
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.raw_materials FOR ALL USING (organization_id = get_my_org_id());

-- Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.customers FOR ALL USING (organization_id = get_my_org_id());

-- Transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.transactions FOR ALL USING (organization_id = get_my_org_id());

-- Transaction Items (depends on parent transaction)
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on parent transaction" ON public.transaction_items FOR ALL USING (
    (SELECT organization_id FROM public.transactions WHERE id = transaction_id) = get_my_org_id()
);

-- Promotions
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.promotions FOR ALL USING (organization_id = get_my_org_id());

-- Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.categories FOR ALL USING (organization_id = get_my_org_id());

-- Grades
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.grades FOR ALL USING (organization_id = get_my_org_id());

-- Aromas
ALTER TABLE public.aromas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.aromas FOR ALL USING (organization_id = get_my_org_id());

-- Bottle Sizes
ALTER TABLE public.bottle_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.bottle_sizes FOR ALL USING (organization_id = get_my_org_id());

-- Recipes
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.recipes FOR ALL USING (organization_id = get_my_org_id());

-- Expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.expenses FOR ALL USING (organization_id = get_my_org_id());

-- Settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access based on organization" ON public.settings FOR ALL USING (organization_id = get_my_org_id());
