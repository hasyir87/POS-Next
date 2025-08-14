
-- Ekstensi yang diperlukan
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fungsi helper untuk mengekstrak claim dari JWT
CREATE OR REPLACE FUNCTION auth.get_user_role(p_user_id uuid)
RETURNS TEXT AS $$
DECLARE
  role TEXT;
BEGIN
  SELECT r.rolname INTO role
  FROM pg_catalog.pg_roles r
  JOIN pg_catalog.pg_auth_members m ON (m.roleid = r.oid)
  JOIN pg_catalog.pg_authid u ON (m.member = u.oid)
  WHERE u.rolname = p_user_id::text;
  
  IF role IS NULL THEN
    -- Fallback ke tabel profiles jika tidak ditemukan di pg_roles
     SELECT p.role INTO role
     FROM public.profiles p
     WHERE p.id = p_user_id;
  END IF;

  RETURN role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Fungsi untuk mendapatkan semua pengguna dalam satu organisasi (termasuk sub-outlet)
CREATE OR REPLACE FUNCTION get_users_in_organization(p_organization_id uuid)
RETURNS TABLE(user_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT id
  FROM public.profiles
  WHERE organization_id IN (
    WITH RECURSIVE org_hierarchy AS (
      SELECT id FROM public.organizations WHERE id = p_organization_id
      UNION ALL
      SELECT o.id FROM public.organizations o JOIN org_hierarchy oh ON o.parent_organization_id = oh.id
    )
    SELECT id FROM org_hierarchy
  );
END;
$$ LANGUAGE plpgsql;

-- 1. Tabel Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name character varying NOT NULL,
    address character varying,
    phone character varying,
    logo_url character varying,
    parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual read access" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Allow owner/superadmin to manage" ON public.organizations FOR ALL
USING (
    auth.get_user_role(auth.uid()) = 'superadmin' OR
    id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role = 'owner'
    )
);


-- 2. Tabel Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email character varying,
    full_name character varying,
    avatar_url character varying,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    role public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual access to their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow owners/admins to view users in their org" ON public.profiles FOR SELECT
USING (
    auth.get_user_role(auth.uid()) IN ('owner', 'admin', 'superadmin') AND
    organization_id IN (
        SELECT org.id FROM public.organizations org
        JOIN public.profiles p ON p.organization_id = org.id
        WHERE p.id = auth.uid()
    )
);

-- 3. Tabel Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access based on organization" ON public.categories FOR SELECT
USING (organization_id IN (SELECT id FROM public.organizations));
CREATE POLICY "Allow full access based on user role" ON public.categories FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- 4. Tabel Products
CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    description text,
    price numeric NOT NULL,
    stock integer NOT NULL,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access based on organization" ON public.products FOR SELECT
USING (organization_id IN (SELECT id FROM public.organizations));
CREATE POLICY "Allow full access based on user role" ON public.products FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- 5. Tabel Raw Materials
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
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
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access based on organization" ON public.raw_materials FOR SELECT
USING (organization_id IN (SELECT id FROM public.organizations));
CREATE POLICY "Allow full access based on user role" ON public.raw_materials FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- 6. Tabel Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    email character varying,
    phone character varying,
    loyalty_points integer DEFAULT 0 NOT NULL,
    transaction_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access based on organization" ON public.customers FOR SELECT
USING (organization_id IN (SELECT id FROM public.organizations));
CREATE POLICY "Allow full access based on user role" ON public.customers FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));


-- 7. Tabel Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cashier_id uuid NOT NULL REFERENCES public.profiles(id),
    customer_id uuid REFERENCES public.customers(id),
    total_amount numeric NOT NULL,
    payment_method public.payment_method NOT NULL,
    status public.transaction_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access based on organization" ON public.transactions FOR SELECT
USING (organization_id IN (SELECT id FROM public.organizations));
CREATE POLICY "Allow full access based on user role" ON public.transactions FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- 8. Tabel Transaction Items
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id),
    raw_material_id uuid REFERENCES public.raw_materials(id),
    quantity integer NOT NULL,
    price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access based on organization" ON public.transaction_items FOR SELECT
USING (transaction_id IN (SELECT id FROM public.transactions));
CREATE POLICY "Allow full access based on user role" ON public.transaction_items FOR ALL
USING (transaction_id IN (SELECT id FROM public.transactions WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));


-- 9. Tabel Promotions
CREATE TABLE IF NOT EXISTS public.promotions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    type public.promotion_type NOT NULL,
    value numeric NOT NULL,
    get_product_id uuid REFERENCES public.products(id),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access based on organization" ON public.promotions FOR SELECT
USING (organization_id IN (SELECT id FROM public.organizations));
CREATE POLICY "Allow full access based on user role" ON public.promotions FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- 10. Tabel Grades
CREATE TABLE IF NOT EXISTS public.grades (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    price_multiplier numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access based on organization" ON public.grades FOR SELECT
USING (organization_id IN (SELECT id FROM public.organizations));
CREATE POLICY "Allow full access based on user role" ON public.grades FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- 11. Tabel Aromas
CREATE TABLE IF NOT EXISTS public.aromas (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    category character varying,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.aromas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access based on organization" ON public.aromas FOR SELECT
USING (organization_id IN (SELECT id FROM public.organizations));
CREATE POLICY "Allow full access based on user role" ON public.aromas FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- 12. Tabel Bottle Sizes
CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    size integer NOT NULL,
    unit character varying NOT NULL,
    price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.bottle_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access based on organization" ON public.bottle_sizes FOR SELECT
USING (organization_id IN (SELECT id FROM public.organizations));
CREATE POLICY "Allow full access based on user role" ON public.bottle_sizes FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- 13. Tabel Recipes
CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    grade_id uuid NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
    aroma_id uuid NOT NULL REFERENCES public.aromas(id) ON DELETE CASCADE,
    bottle_size_id uuid NOT NULL REFERENCES public.bottle_sizes(id) ON DELETE CASCADE,
    price numeric NOT NULL,
    instructions text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access based on organization" ON public.recipes FOR SELECT
USING (organization_id IN (SELECT id FROM public.organizations));
CREATE POLICY "Allow full access based on user role" ON public.recipes FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- 14. Tabel Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date date NOT NULL,
    category character varying NOT NULL,
    description text NOT NULL,
    amount numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access based on organization" ON public.expenses FOR SELECT
USING (organization_id IN (SELECT id FROM public.organizations));
CREATE POLICY "Allow full access based on user role" ON public.expenses FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- 15. Tabel Settings
CREATE TABLE IF NOT EXISTS public.settings (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key character varying NOT NULL,
    value character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(organization_id, key)
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access based on organization" ON public.settings FOR SELECT
USING (organization_id IN (SELECT id FROM public.organizations));
CREATE POLICY "Allow full access based on user role" ON public.settings FOR ALL
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));


-- Fungsi RPC untuk checkout
CREATE OR REPLACE FUNCTION public.process_checkout(
    p_organization_id uuid,
    p_cashier_id uuid,
    p_customer_id uuid,
    p_items json,
    p_total_amount numeric,
    p_payment_method public.payment_method
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_id uuid;
    v_item json;
BEGIN
    -- 1. Buat record transaksi baru
    INSERT INTO public.transactions(organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    -- 2. Loop melalui item dan masukkan ke transaction_items & update stok
    FOR v_item IN SELECT * FROM json_array_elements(p_items)
    LOOP
        INSERT INTO public.transaction_items(transaction_id, product_id, quantity, price)
        VALUES (v_transaction_id, (v_item->>'product_id')::uuid, (v_item->>'quantity')::integer, (v_item->>'price')::numeric);

        -- Update stok produk
        UPDATE public.products
        SET stock = stock - (v_item->>'quantity')::integer
        WHERE id = (v_item->>'product_id')::uuid;
    END LOOP;

    -- 3. Update data pelanggan jika ada
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id;
    END IF;

    RETURN v_transaction_id;
END;
$$;
