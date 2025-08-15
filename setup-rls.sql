
-- Hapus Kebijakan yang Ada Terlebih Dahulu untuk Menghindari Konflik Dependensi
DROP POLICY IF EXISTS "Allow individual read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow user to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin full access" ON public.profiles;
DROP POLICY IF EXISTS "Allow owner full access" ON public.profiles;
DROP POLICY IF EXISTS "Allow superadmin full access" ON public.profiles;

DROP POLICY IF EXISTS "Allow read access based on organization" ON public.organizations;
DROP POLICY IF EXISTS "Allow full access to own organization" ON public.organizations;
DROP POLICY IF EXISTS "Allow admin full access" ON public.organizations;
DROP POLICY IF EXISTS "Allow superadmin full access" ON public.organizations;

DROP POLICY IF EXISTS "Allow full access based on organization" ON public.products;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.raw_materials;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.customers;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.promotions;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.categories;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.grades;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.aromas;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.bottle_sizes;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.recipes;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.expenses;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.settings;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.transactions;
DROP POLICY IF EXISTS "Allow access based on linked transaction" ON public.transaction_items;


-- Hapus Fungsi yang Ada Setelah Kebijakan Dihapus
DROP FUNCTION IF EXISTS public.exec_sql(text);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.get_users_in_organization(uuid);
DROP FUNCTION IF EXISTS public.process_checkout(uuid, uuid, uuid, jsonb, numeric, text);


-- Buat Fungsi untuk eksekusi SQL dinamis (untuk setup)
CREATE OR REPLACE FUNCTION public.exec_sql(sql text) RETURNS void AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql;


-- Buat ulang tabel-tabel (IF NOT EXISTS untuk keamanan)
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    address text,
    phone text,
    logo_url text,
    parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE,
    full_name text,
    avatar_url text,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric(10, 2) NOT NULL,
    stock integer NOT NULL DEFAULT 0,
    category_id uuid,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.raw_materials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    brand text,
    quantity numeric NOT NULL,
    unit text NOT NULL,
    category text,
    purchase_price numeric(10, 2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.customers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    loyalty_points integer NOT NULL DEFAULT 0,
    transaction_count integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cashier_id uuid NOT NULL REFERENCES public.profiles(id),
    customer_id uuid REFERENCES public.customers(id),
    total_amount numeric(10, 2) NOT NULL,
    payment_method text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transaction_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id),
    raw_material_id uuid REFERENCES public.raw_materials(id),
    quantity integer NOT NULL,
    price numeric(10, 2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.promotions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL,
    value numeric NOT NULL,
    get_product_id uuid REFERENCES public.products(id),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.grades (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    price_multiplier numeric(5, 2) NOT NULL DEFAULT 1.0,
    extra_essence_price numeric(10, 2) NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.aromas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    category text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    size integer NOT NULL,
    unit text NOT NULL,
    price numeric(10, 2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    grade_id uuid NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
    aroma_id uuid NOT NULL REFERENCES public.aromas(id) ON DELETE CASCADE,
    bottle_size_id uuid NOT NULL REFERENCES public.bottle_sizes(id) ON DELETE CASCADE,
    price numeric(10, 2) NOT NULL,
    instructions text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date date NOT NULL,
    category text NOT NULL,
    description text,
    amount numeric(10, 2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key text NOT NULL UNIQUE,
    value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tambahkan foreign key constraint untuk products.category_id
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


-- Buat ulang fungsi-fungsi Helper
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = p_user_id;
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_users_in_organization(p_org_id uuid)
RETURNS TABLE(user_id uuid, user_email text, user_role text) AS $$
BEGIN
    RETURN QUERY
    SELECT id, email, role FROM public.profiles WHERE organization_id = p_org_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.process_checkout(
    p_organization_id uuid,
    p_cashier_id uuid,
    p_customer_id uuid,
    p_items jsonb,
    p_total_amount numeric,
    p_payment_method text
) RETURNS uuid AS $$
DECLARE
    new_transaction_id uuid;
    item record;
BEGIN
    INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
    RETURNING id INTO new_transaction_id;

    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity int, price numeric)
    LOOP
        INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
        VALUES (new_transaction_id, item.product_id, item.quantity, item.price);

        UPDATE public.products
        SET stock = stock - item.quantity
        WHERE id = item.product_id AND products.organization_id = p_organization_id;
    END LOOP;

    RETURN new_transaction_id;
END;
$$ LANGUAGE plpgsql;


-- Aktifkan RLS untuk semua tabel
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

-- Buat ulang kebijakan-kebijakan RLS

-- Kebijakan untuk `profiles`
CREATE POLICY "Allow individual read access" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow user to update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow admin full access" ON public.profiles FOR ALL USING (
    get_user_role(auth.uid()) IN ('admin', 'owner') AND
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Allow owner full access" ON public.profiles FOR ALL USING (
    get_user_role(auth.uid()) = 'owner' AND
    organization_id IN (SELECT id FROM public.organizations WHERE parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "Allow superadmin full access" ON public.profiles FOR ALL USING (get_user_role(auth.uid()) = 'superadmin');

-- Kebijakan untuk `organizations`
CREATE POLICY "Allow read access based on organization" ON public.organizations FOR SELECT USING (
    id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Allow full access to own organization" ON public.organizations FOR ALL USING (
    get_user_role(auth.uid()) IN ('owner', 'admin') AND id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Allow superadmin full access" ON public.organizations FOR ALL USING (get_user_role(auth.uid()) = 'superadmin');


-- Kebijakan generik untuk tabel data utama
CREATE POLICY "Allow full access based on organization" ON public.products FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.raw_materials FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.customers FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.promotions FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.categories FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.grades FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.aromas FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.bottle_sizes FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.recipes FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.expenses FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.settings FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.transactions FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan khusus untuk `transaction_items`
CREATE POLICY "Allow access based on linked transaction" ON public.transaction_items FOR ALL USING (
    (SELECT organization_id FROM public.transactions WHERE id = transaction_id) = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
