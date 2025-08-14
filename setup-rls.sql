-- Fungsi untuk mengeksekusi SQL dinamis
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT) RETURNS VOID AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- 1. Buat tabel Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name character varying NOT NULL,
    address text,
    phone character varying,
    logo_url text,
    parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.organizations IS 'Tabel untuk menyimpan data organisasi (toko utama) dan outlet (cabang).';

-- 2. Buat tabel Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email character varying,
    full_name text,
    avatar_url text,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    role public.user_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.profiles IS 'Tabel untuk menyimpan data profil pengguna, termasuk peran dan afiliasi organisasi.';

-- 3. Buat tabel Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.categories IS 'Tabel untuk kategori produk.';

-- 4. Buat tabel Products
CREATE TABLE IF NOT EXISTS public.products (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    description text,
    price numeric NOT NULL DEFAULT 0,
    stock integer NOT NULL DEFAULT 0,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.products IS 'Tabel untuk menyimpan produk jadi.';

-- 5. Buat tabel Raw Materials
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    brand character varying,
    quantity numeric NOT NULL DEFAULT 0,
    unit character varying NOT NULL,
    category character varying,
    purchase_price numeric NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.raw_materials IS 'Tabel untuk bahan baku parfum.';

-- 6. Buat tabel Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    email character varying,
    phone character varying,
    loyalty_points integer NOT NULL DEFAULT 0,
    transaction_count integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.customers IS 'Tabel untuk menyimpan data pelanggan.';

-- 7. Buat tabel Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cashier_id uuid NOT NULL REFERENCES public.profiles(id),
    customer_id uuid REFERENCES public.customers(id),
    total_amount numeric NOT NULL,
    payment_method public.payment_method NOT NULL,
    status public.transaction_status NOT NULL DEFAULT 'completed',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.transactions IS 'Tabel untuk menyimpan data transaksi.';

-- 8. Buat tabel Transaction Items
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id),
    raw_material_id uuid REFERENCES public.raw_materials(id),
    quantity integer NOT NULL,
    price numeric NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.transaction_items IS 'Tabel untuk menyimpan item dalam setiap transaksi.';

-- 9. Buat tabel Promotions
CREATE TABLE IF NOT EXISTS public.promotions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    type public.promotion_type NOT NULL,
    value numeric NOT NULL,
    get_product_id uuid REFERENCES public.products(id),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.promotions IS 'Tabel untuk promosi.';

-- 10. Buat tabel Grades
CREATE TABLE IF NOT EXISTS public.grades (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    price_multiplier numeric NOT NULL DEFAULT 1,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.grades IS 'Tabel untuk tingkatan kualitas parfum.';

-- 11. Buat tabel Aromas
CREATE TABLE IF NOT EXISTS public.aromas (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    category character varying,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.aromas IS 'Tabel untuk jenis-jenis aroma parfum.';

-- 12. Buat tabel Bottle Sizes
CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    size integer NOT NULL,
    unit character varying NOT NULL,
    price numeric NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.bottle_sizes IS 'Tabel untuk ukuran botol yang tersedia.';

-- 13. Buat tabel Recipes
CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    grade_id uuid NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
    aroma_id uuid NOT NULL REFERENCES public.aromas(id) ON DELETE CASCADE,
    bottle_size_id uuid NOT NULL REFERENCES public.bottle_sizes(id) ON DELETE CASCADE,
    price numeric NOT NULL,
    instructions text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(organization_id, grade_id, aroma_id, bottle_size_id)
);
COMMENT ON TABLE public.recipes IS 'Tabel untuk menyimpan resep atau formula racikan parfum.';

-- 14. Buat tabel Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date date NOT NULL,
    category character varying NOT NULL,
    description text NOT NULL,
    amount numeric NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.expenses IS 'Tabel untuk mencatat beban atau pengeluaran.';

-- 15. Buat tabel Settings
CREATE TABLE IF NOT EXISTS public.settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key character varying NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(organization_id, key)
);
COMMENT ON TABLE public.settings IS 'Tabel untuk pengaturan spesifik per-organisasi.';

-- AKTIFKAN RLS UNTUK SEMUA TABEL
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


-- FUNGSI HELPER
-- Fungsi untuk mendapatkan ID organisasi pengguna
CREATE OR REPLACE FUNCTION get_my_organization_id()
RETURNS uuid AS $$
DECLARE
    org_id uuid;
BEGIN
    SELECT organization_id INTO org_id
    FROM public.profiles
    WHERE id = auth.uid();
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fungsi untuk mendapatkan peran pengguna
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid();
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- KEBIJAKAN RLS
-- Kebijakan untuk organizations
DROP POLICY IF EXISTS "Users can see their own organization and its children" ON public.organizations;
CREATE POLICY "Users can see their own organization and its children" ON public.organizations FOR SELECT USING (
    id = get_my_organization_id() OR parent_organization_id = get_my_organization_id()
);
DROP POLICY IF EXISTS "Owners can create outlets for their organization" ON public.organizations;
CREATE POLICY "Owners can create outlets for their organization" ON public.organizations FOR INSERT WITH CHECK (
    get_my_role() IN ('owner', 'superadmin') AND parent_organization_id = get_my_organization_id()
);

-- Kebijakan untuk profiles
DROP POLICY IF EXISTS "Users can see and edit their own profile" ON public.profiles;
CREATE POLICY "Users can see and edit their own profile" ON public.profiles FOR ALL USING (
    id = auth.uid()
);
DROP POLICY IF EXISTS "Admins and owners can see profiles in their organization" ON public.profiles;
CREATE POLICY "Admins and owners can see profiles in their organization" ON public.profiles FOR SELECT USING (
    get_my_role() IN ('admin', 'owner', 'superadmin') AND organization_id = get_my_organization_id()
);


-- Kebijakan Umum untuk tabel data
DO $$
DECLARE
    t_name TEXT;
BEGIN
    FOR t_name IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name IN (
            'products', 'raw_materials', 'customers', 'transactions', 'promotions', 'categories',
            'grades', 'aromas', 'bottle_sizes', 'recipes', 'expenses', 'settings'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Users can manage data in their own organization" ON public.%I;', t_name);
        EXECUTE format(
            'CREATE POLICY "Users can manage data in their own organization" ON public.%I FOR ALL
            USING (organization_id = get_my_organization_id())
            WITH CHECK (organization_id = get_my_organization_id());',
            t_name
        );
    END LOOP;
END;
$$;

-- Kebijakan untuk transaction_items (berdasarkan transaction_id)
DROP POLICY IF EXISTS "Users can manage items of their own transactions" ON public.transaction_items;
CREATE POLICY "Users can manage items of their own transactions" ON public.transaction_items FOR ALL USING (
    (SELECT organization_id FROM public.transactions WHERE id = transaction_id) = get_my_organization_id()
);


-- FUNGSI RPC untuk proses checkout
CREATE OR REPLACE FUNCTION public.process_checkout(
    p_organization_id uuid,
    p_cashier_id uuid,
    p_customer_id uuid,
    p_items json,
    p_total_amount numeric,
    p_payment_method public.payment_method
)
RETURNS uuid AS $$
DECLARE
    new_transaction_id uuid;
    item record;
BEGIN
    -- 1. Buat transaksi baru
    INSERT INTO public.transactions(organization_id, cashier_id, customer_id, total_amount, payment_method)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method)
    RETURNING id INTO new_transaction_id;

    -- 2. Loop melalui item dan masukkan ke transaction_items
    FOR item IN SELECT * FROM json_to_recordset(p_items) AS x(product_id uuid, quantity int, price numeric)
    LOOP
        INSERT INTO public.transaction_items(transaction_id, product_id, quantity, price)
        VALUES (new_transaction_id, item.product_id, item.quantity, item.price);

        -- 3. Kurangi stok produk
        UPDATE public.products
        SET stock = stock - item.quantity
        WHERE id = item.product_id;
    END LOOP;

    -- 4. Update jumlah transaksi pelanggan jika ada
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id;
    END IF;

    RETURN new_transaction_id;
END;
$$ LANGUAGE plpgsql;
