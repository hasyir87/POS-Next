
-- Hapus fungsi yang ada untuk menghindari error saat pembuatan ulang
DROP FUNCTION IF EXISTS public.exec_sql(text);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.get_users_in_organization(uuid);
DROP FUNCTION IF EXISTS public.process_checkout(uuid, uuid, uuid, jsonb, numeric, text);


-- Fungsi untuk mengeksekusi SQL dinamis (diperlukan untuk membuat kebijakan RLS)
CREATE OR REPLACE FUNCTION public.exec_sql(sql text) RETURNS void AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- 1. Tabel Organisasi (Induk & Outlet)
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name character varying NOT NULL,
    address text,
    phone character varying,
    logo_url text,
    parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Tabel Profil Pengguna (menghubungkan auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email character varying,
    full_name character varying,
    avatar_url text,
    organization_id uuid REFERENCES public.organizations(id),
    role text CHECK (role IN ('owner', 'admin', 'cashier', 'superadmin')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Tabel Kategori Produk
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 4. Tabel Produk Jadi
CREATE TABLE IF NOT EXISTS public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    description text,
    price numeric NOT NULL,
    stock integer NOT NULL DEFAULT 0,
    category_id uuid REFERENCES public.categories(id),
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 5. Tabel Bahan Baku
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 6. Tabel Pelanggan
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    email character varying UNIQUE,
    phone character varying,
    loyalty_points integer DEFAULT 0,
    transaction_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 7. Tabel Transaksi
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cashier_id uuid NOT NULL REFERENCES public.profiles(id),
    customer_id uuid REFERENCES public.customers(id),
    total_amount numeric NOT NULL,
    payment_method text NOT NULL,
    status text NOT NULL DEFAULT 'completed',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 8. Tabel Item Transaksi
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id),
    raw_material_id uuid REFERENCES public.raw_materials(id),
    quantity integer NOT NULL,
    price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- 9. Tabel Promosi
CREATE TABLE IF NOT EXISTS public.promotions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    type text NOT NULL CHECK (type IN ('Persentase', 'Nominal', 'BOGO')),
    value numeric NOT NULL,
    get_product_id uuid REFERENCES public.products(id),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- 10. Tabel Grade Parfum
CREATE TABLE IF NOT EXISTS public.grades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    price_multiplier numeric DEFAULT 1.0,
    extra_essence_price numeric DEFAULT 0, -- Harga tambahan per ml bibit
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- 11. Tabel Aroma Parfum
CREATE TABLE IF NOT EXISTS public.aromas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    category character varying,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.aromas ENABLE ROW LEVEL SECURITY;

-- 12. Tabel Ukuran Botol
CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    size integer NOT NULL,
    unit character varying NOT NULL,
    price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.bottle_sizes ENABLE ROW LEVEL SECURITY;

-- 13. Tabel Resep Parfum
CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    grade_id uuid NOT NULL REFERENCES public.grades(id),
    aroma_id uuid NOT NULL REFERENCES public.aromas(id),
    bottle_size_id uuid NOT NULL REFERENCES public.bottle_sizes(id),
    price numeric NOT NULL, -- Harga dasar resep
    instructions text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- 14. Tabel Beban/Pengeluaran
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date date NOT NULL,
    category character varying NOT NULL,
    description text,
    amount numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 15. Tabel Pengaturan
CREATE TABLE IF NOT EXISTS public.settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key character varying NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- === FUNGSI HELPER ===
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid) RETURNS text AS $$
DECLARE
    v_role text;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_users_in_organization(p_organization_id uuid) RETURNS TABLE(user_id uuid, user_role text) AS $$
BEGIN
    RETURN QUERY SELECT id, role FROM public.profiles WHERE organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql;

-- === RLS POLICIES ===
-- Membuat kebijakan RLS untuk setiap tabel
DO $$
DECLARE
    table_name text;
    policy_sql text;
BEGIN
    FOR table_name IN
        SELECT t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
          AND t.table_name IN (
            'organizations', 'profiles', 'products', 'raw_materials', 
            'customers', 'transactions', 'promotions', 'grades', 
            'aromas', 'bottle_sizes', 'expenses', 'settings', 'categories', 'recipes'
          )
    LOOP
        -- Hapus kebijakan yang ada untuk menghindari error
        EXECUTE 'DROP POLICY IF EXISTS "Allow full access based on organization" ON public.' || quote_ident(table_name);

        -- Kebijakan RLS generik berdasarkan organization_id
        policy_sql := format(
            'CREATE POLICY "Allow full access based on organization" ON public.%I FOR ALL
            USING (
                organization_id IN (
                    SELECT id FROM public.organizations WHERE id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
                )
            )
            WITH CHECK (
                organization_id IN (
                    SELECT id FROM public.organizations WHERE id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
                )
            );',
            table_name
        );
        PERFORM exec_sql(policy_sql);
    END LOOP;
END;
$$;


-- Kebijakan khusus untuk TRANSACTION_ITEMS
DROP POLICY IF EXISTS "Allow full access based on parent transaction" ON public.transaction_items;
CREATE POLICY "Allow full access based on parent transaction" ON public.transaction_items FOR ALL
USING (
    (SELECT organization_id FROM public.transactions WHERE id = transaction_id) IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
)
WITH CHECK (
    (SELECT organization_id FROM public.transactions WHERE id = transaction_id) IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- === FUNGSI CHECKOUT ===
CREATE OR REPLACE FUNCTION public.process_checkout(
    p_organization_id uuid,
    p_cashier_id uuid,
    p_customer_id uuid,
    p_items jsonb,
    p_total_amount numeric,
    p_payment_method text
) RETURNS uuid AS $$
DECLARE
    v_transaction_id uuid;
    item jsonb;
BEGIN
    -- 1. Buat record transaksi baru
    INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    -- 2. Loop melalui item dan masukkan ke transaction_items & perbarui stok
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Masukkan ke transaction_items
        INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
        VALUES (v_transaction_id, (item->>'product_id')::uuid, (item->>'quantity')::integer, (item->>'price')::numeric);

        -- Perbarui stok di tabel products
        UPDATE public.products
        SET stock = stock - (item->>'quantity')::integer
        WHERE id = (item->>'product_id')::uuid
        AND products.organization_id = p_organization_id; -- Kualifikasi eksplisit
    END LOOP;

    -- 3. Perbarui jumlah transaksi pelanggan jika ada
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id
        AND customers.organization_id = p_organization_id; -- Kualifikasi eksplisit
    END IF;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;
