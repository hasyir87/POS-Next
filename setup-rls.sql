-- Fungsi untuk mengeksekusi SQL dinamis (jika belum ada)
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT) RETURNS VOID AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- 1. Buat tabel organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    logo_url text,
    parent_organization_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.organizations ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);
ALTER TABLE public.organizations ADD CONSTRAINT organizations_parent_organization_id_fkey FOREIGN KEY (parent_organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Buat tabel profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    updated_at timestamp with time zone,
    full_name text,
    avatar_url text,
    organization_id uuid,
    role text DEFAULT 'cashier'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email text
);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Buat tabel categories
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    organization_id uuid NOT NULL
);
ALTER TABLE public.categories ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
ALTER TABLE public.categories ADD CONSTRAINT categories_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

-- 4. Buat tabel products
CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    price real DEFAULT '0'::real NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    category_id uuid,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.products ADD CONSTRAINT products_pkey PRIMARY KEY (id);
ALTER TABLE public.products ADD CONSTRAINT products_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.products ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

-- 5. Buat tabel promotions
CREATE TABLE IF NOT EXISTS public.promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    value real NOT NULL,
    get_product_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.promotions ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);
ALTER TABLE public.promotions ADD CONSTRAINT promotions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.promotions ADD CONSTRAINT promotions_get_product_id_fkey FOREIGN KEY (get_product_id) REFERENCES public.products(id) ON DELETE SET NULL;


-- 6. Buat tabel customers
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    loyalty_points integer DEFAULT 0 NOT NULL,
    transaction_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.customers ADD CONSTRAINT customers_pkey PRIMARY KEY (id);
ALTER TABLE public.customers ADD CONSTRAINT customers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

-- 7. Buat tabel raw_materials
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    brand text,
    quantity real DEFAULT '0'::real NOT NULL,
    unit text NOT NULL,
    category text,
    purchase_price real DEFAULT '0'::real NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.raw_materials ADD CONSTRAINT raw_materials_pkey PRIMARY KEY (id);
ALTER TABLE public.raw_materials ADD CONSTRAINT raw_materials_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


-- 8. Buat tabel grades
CREATE TABLE IF NOT EXISTS public.grades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    price_multiplier real DEFAULT '1'::real NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.grades ADD CONSTRAINT grades_pkey PRIMARY KEY (id);
ALTER TABLE public.grades ADD CONSTRAINT grades_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

-- 9. Buat tabel aromas
CREATE TABLE IF NOT EXISTS public.aromas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    category text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.aromas ADD CONSTRAINT aromas_pkey PRIMARY KEY (id);
ALTER TABLE public.aromas ADD CONSTRAINT aromas_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

-- 10. Buat tabel bottle_sizes
CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    size real NOT NULL,
    unit text NOT NULL,
    price real DEFAULT '0'::real NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.bottle_sizes ADD CONSTRAINT bottle_sizes_pkey PRIMARY KEY (id);
ALTER TABLE public.bottle_sizes ADD CONSTRAINT bottle_sizes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

-- 11. Buat tabel recipes
CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    grade_id uuid NOT NULL,
    aroma_id uuid NOT NULL,
    bottle_size_id uuid NOT NULL,
    instructions text,
    price real NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.recipes ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);
ALTER TABLE public.recipes ADD CONSTRAINT recipes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.recipes ADD CONSTRAINT recipes_grade_id_fkey FOREIGN KEY (grade_id) REFERENCES public.grades(id) ON DELETE CASCADE;
ALTER TABLE public.recipes ADD CONSTRAINT recipes_aroma_id_fkey FOREIGN KEY (aroma_id) REFERENCES public.aromas(id) ON DELETE CASCADE;
ALTER TABLE public.recipes ADD CONSTRAINT recipes_bottle_size_id_fkey FOREIGN KEY (bottle_size_id) REFERENCES public.bottle_sizes(id) ON DELETE CASCADE;

-- 12. Buat tabel expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    date date NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    amount real NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.expenses ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);
ALTER TABLE public.expenses ADD CONSTRAINT expenses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

-- 13. Buat tabel settings
CREATE TABLE IF NOT EXISTS public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    key text NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.settings ADD CONSTRAINT settings_pkey PRIMARY KEY (id);
ALTER TABLE public.settings ADD CONSTRAINT settings_organization_id_key_key UNIQUE (organization_id, key);
ALTER TABLE public.settings ADD CONSTRAINT settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

-- 14. Buat tabel transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    cashier_id uuid NOT NULL,
    customer_id uuid,
    total_amount real NOT NULL,
    payment_method text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.transactions ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);
ALTER TABLE public.transactions ADD CONSTRAINT transactions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
ALTER TABLE public.transactions ADD CONSTRAINT transactions_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.profiles(id);
ALTER TABLE public.transactions ADD CONSTRAINT transactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


-- 15. Buat tabel transaction_items
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid NOT NULL,
    product_id uuid,
    raw_material_id uuid,
    quantity real NOT NULL,
    price real NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.transaction_items ADD CONSTRAINT transaction_items_pkey PRIMARY KEY (id);
ALTER TABLE public.transaction_items ADD CONSTRAINT transaction_items_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;
ALTER TABLE public.transaction_items ADD CONSTRAINT transaction_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);
ALTER TABLE public.transaction_items ADD CONSTRAINT transaction_items_raw_material_id_fkey FOREIGN KEY (raw_material_id) REFERENCES public.raw_materials(id);


-- Aktifkan RLS untuk semua tabel
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aromas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bottle_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- Fungsi Helper untuk RLS
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS text AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION get_user_organization_id(p_user_id uuid)
RETURNS uuid AS $$
BEGIN
  RETURN (SELECT organization_id FROM public.profiles WHERE id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION get_users_in_organization(p_organization_id uuid)
RETURNS TABLE(user_id uuid) AS $$
BEGIN
  RETURN QUERY SELECT id FROM public.profiles WHERE organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kebijakan RLS

-- Organizations
DROP POLICY IF EXISTS "Allow ALL for superadmin" ON public.organizations;
CREATE POLICY "Allow ALL for superadmin" ON public.organizations FOR ALL USING (get_user_role(auth.uid()) = 'superadmin');

DROP POLICY IF EXISTS "Allow read access to owner and their outlet members" ON public.organizations;
CREATE POLICY "Allow read access to owner and their outlet members" ON public.organizations FOR SELECT USING (id = get_user_organization_id(auth.uid()) OR parent_organization_id = get_user_organization_id(auth.uid()));

DROP POLICY IF EXISTS "Allow owner to manage their own outlets" ON public.organizations;
CREATE POLICY "Allow owner to manage their own outlets" ON public.organizations FOR ALL USING (get_user_role(auth.uid()) = 'owner' AND parent_organization_id = get_user_organization_id(auth.uid())) WITH CHECK (get_user_role(auth.uid()) = 'owner' AND parent_organization_id = get_user_organization_id(auth.uid()));


-- Profiles
DROP POLICY IF EXISTS "Allow ALL for superadmin" ON public.profiles;
CREATE POLICY "Allow ALL for superadmin" ON public.profiles FOR ALL USING (get_user_role(auth.uid()) = 'superadmin');

DROP POLICY IF EXISTS "Allow users to view their own profile" ON public.profiles;
CREATE POLICY "Allow users to view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow owner/admin to view users in their organization" ON public.profiles;
CREATE POLICY "Allow owner/admin to view users in their organization" ON public.profiles FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()) AND get_user_role(auth.uid()) IN ('owner', 'admin'));

DROP POLICY IF EXISTS "Allow owner/admin to update users in their organization" ON public.profiles;
CREATE POLICY "Allow owner/admin to update users in their organization" ON public.profiles FOR UPDATE USING (organization_id = get_user_organization_id(auth.uid()) AND get_user_role(auth.uid()) IN ('owner', 'admin')) WITH CHECK (organization_id = get_user_organization_id(auth.uid()));


-- Generic Policies for Data Tables
CREATE OR REPLACE FUNCTION create_generic_policies(table_name text) RETURNS void AS $$
BEGIN
    -- Policy untuk Superadmin
    EXECUTE format('DROP POLICY IF EXISTS "Allow ALL for superadmin" ON public.%I;', table_name);
    EXECUTE format('CREATE POLICY "Allow ALL for superadmin" ON public.%I FOR ALL USING (get_user_role(auth.uid()) = ''superadmin'');', table_name);

    -- Policy untuk Owner/Admin/Cashier
    EXECUTE format('DROP POLICY IF EXISTS "Allow access to organization members" ON public.%I;', table_name);
    EXECUTE format('CREATE POLICY "Allow access to organization members" ON public.%I FOR ALL USING (organization_id = get_user_organization_id(auth.uid())) WITH CHECK (organization_id = get_user_organization_id(auth.uid()));', table_name);
END;
$$ LANGUAGE plpgsql;

-- Terapkan generic policies ke semua tabel data
SELECT create_generic_policies('products');
SELECT create_generic_policies('categories');
SELECT create_generic_policies('promotions');
SELECT create_generic_policies('customers');
SELECT create_generic_policies('raw_materials');
SELECT create_generic_policies('grades');
SELECT create_generic_policies('aromas');
SELECT create_generic_policies('bottle_sizes');
SELECT create_generic_policies('recipes');
SELECT create_generic_policies('expenses');
SELECT create_generic_policies('settings');
SELECT create_generic_policies('transactions');

-- Kebijakan khusus untuk transaction_items
DROP POLICY IF EXISTS "Allow access based on transaction" ON public.transaction_items;
CREATE POLICY "Allow access based on transaction" ON public.transaction_items FOR ALL
USING (
    (SELECT organization_id FROM public.transactions WHERE id = transaction_id) = get_user_organization_id(auth.uid()) OR get_user_role(auth.uid()) = 'superadmin'
)
WITH CHECK (
    (SELECT organization_id FROM public.transactions WHERE id = transaction_id) = get_user_organization_id(auth.uid()) OR get_user_role(auth.uid()) = 'superadmin'
);
