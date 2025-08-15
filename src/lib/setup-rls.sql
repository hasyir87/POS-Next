-- Hapus semua kebijakan yang ada terlebih dahulu untuk menghindari konflik dependensi
DROP POLICY IF EXISTS "Allow full access to own organization" ON public.organizations;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.profiles;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.products;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.raw_materials;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.customers;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.transactions;
DROP POLICY IF EXISTS "Allow full access based on transaction" ON public.transaction_items;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.promotions;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.categories;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.grades;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.aromas;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.bottle_sizes;
DROP POLICY IF EXISTS "Allow access based on related data" ON public.recipes;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.expenses;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.settings;

-- Hapus semua fungsi yang ada
DROP FUNCTION IF EXISTS public.exec_sql(text);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.get_users_in_organization(uuid);
DROP FUNCTION IF EXISTS public.process_checkout(uuid, uuid, uuid, jsonb, numeric, text);
DROP FUNCTION IF EXISTS public.update_product_stock(uuid, integer);


-- Buat ulang tabel untuk memastikan skema terbaru
-- Tabel Organisasi
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name character varying NOT NULL,
    address text,
    phone character varying,
    logo_url text,
    parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Profil Pengguna
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email character varying,
    full_name text,
    avatar_url text,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    role text DEFAULT 'cashier'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Kategori Produk
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Produk
CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    description text,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Bahan Baku
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    brand text,
    quantity numeric(10,2) NOT NULL,
    unit character varying NOT NULL,
    category text,
    purchase_price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Pelanggan
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

-- Tabel Transaksi
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cashier_id uuid NOT NULL REFERENCES public.profiles(id),
    customer_id uuid REFERENCES public.customers(id),
    total_amount numeric(10,2) NOT NULL,
    payment_method text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Item Transaksi
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id),
    raw_material_id uuid REFERENCES public.raw_materials(id),
    quantity integer NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Promosi
CREATE TABLE IF NOT EXISTS public.promotions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    type text NOT NULL,
    value numeric,
    get_product_id uuid REFERENCES public.products(id),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Grade Parfum
CREATE TABLE IF NOT EXISTS public.grades (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    price_multiplier numeric(5,2) DEFAULT 1.0 NOT NULL,
    extra_essence_price numeric(10, 2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Aroma Parfum
CREATE TABLE IF NOT EXISTS public.aromas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    category text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Ukuran Botol
CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    size integer NOT NULL,
    unit character varying NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Resep
CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    grade_id uuid NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
    aroma_id uuid NOT NULL REFERENCES public.aromas(id) ON DELETE CASCADE,
    bottle_size_id uuid NOT NULL REFERENCES public.bottle_sizes(id) ON DELETE CASCADE,
    price numeric(10, 2) NOT NULL,
    instructions text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Biaya
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date date NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    amount numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Pengaturan
CREATE TABLE IF NOT EXISTS public.settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key character varying NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Buat ulang fungsi
CREATE OR REPLACE FUNCTION public.exec_sql(sql text) RETURNS void AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = p_user_id;
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_users_in_organization(p_organization_id uuid)
RETURNS TABLE(user_id uuid, user_email text, user_role text) AS $$
BEGIN
    RETURN QUERY
    SELECT id, email, role FROM public.profiles WHERE organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_product_stock(p_product_id uuid, p_quantity_sold integer)
RETURNS void AS $$
BEGIN
    UPDATE public.products
    SET stock = stock - p_quantity_sold
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

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
BEGIN
    INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
        VALUES (v_transaction_id, (item->>'product_id')::uuid, (item->>'quantity')::integer, (item->>'price')::numeric);

        PERFORM public.update_product_stock((item->>'product_id')::uuid, (item->>'quantity')::integer);
    END LOOP;

    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id;
    END IF;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Terapkan kembali kebijakan keamanan (RLS)
-- Aktifkan RLS untuk setiap tabel
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

-- Kebijakan untuk Organizations
CREATE POLICY "Allow full access to own organization" ON public.organizations FOR ALL
USING (
    id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Kebijakan untuk Profiles
CREATE POLICY "Allow full access based on organization" ON public.profiles FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk Products
CREATE POLICY "Allow full access based on organization" ON public.products FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk Raw Materials
CREATE POLICY "Allow full access based on organization" ON public.raw_materials FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk Customers
CREATE POLICY "Allow full access based on organization" ON public.customers FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk Transactions
CREATE POLICY "Allow full access based on organization" ON public.transactions FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk Transaction Items
CREATE POLICY "Allow access based on transaction" ON public.transaction_items FOR ALL
USING (
    (SELECT organization_id FROM public.transactions WHERE id = transaction_id) = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    (SELECT organization_id FROM public.transactions WHERE id = transaction_id) = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Kebijakan untuk Promotions
CREATE POLICY "Allow full access based on organization" ON public.promotions FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk Categories
CREATE POLICY "Allow full access based on organization" ON public.categories FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk Grades
CREATE POLICY "Allow full access based on organization" ON public.grades FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk Aromas
CREATE POLICY "Allow full access based on organization" ON public.aromas FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk Bottle Sizes
CREATE POLICY "Allow full access based on organization" ON public.bottle_sizes FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk Recipes
CREATE POLICY "Allow access based on related data" ON public.recipes FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Kebijakan untuk Expenses
CREATE POLICY "Allow full access based on organization" ON public.expenses FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk Settings
CREATE POLICY "Allow full access based on organization" ON public.settings FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
