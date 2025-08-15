-- Fungsi untuk mengeksekusi SQL dinamis, diperlukan jika Anda ingin menjalankan file ini melalui RPC.
-- Hapus fungsi jika sudah ada untuk menghindari error saat menjalankan ulang
DROP FUNCTION IF EXISTS public.exec_sql(text);

CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;

-- Membuat tabel 'organizations' untuk menyimpan data toko/organisasi
-- Tabel ini adalah induk dari banyak data lain dan tidak memiliki RLS yang membatasi SELECT,
-- agar nama organisasi dapat ditampilkan di berbagai tempat.
-- Namun, INSERT, UPDATE, DELETE dibatasi hanya untuk superadmin.
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    name character varying NOT NULL,
    address text NULL,
    phone character varying NULL,
    logo_url text NULL,
    parent_organization_id uuid NULL,
    CONSTRAINT organizations_pkey PRIMARY KEY (id),
    CONSTRAINT organizations_parent_organization_id_fkey FOREIGN KEY (parent_organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Membuat tabel 'profiles' untuk menyimpan data pengguna yang terhubung ke 'auth.users'
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    email character varying NOT NULL,
    full_name character varying NULL,
    avatar_url text NULL,
    organization_id uuid NOT NULL,
    role text NOT NULL DEFAULT 'cashier'::text,
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
    CONSTRAINT profiles_email_key UNIQUE (email)
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tabel untuk Kategori Produk
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT categories_pkey PRIMARY KEY (id),
    CONSTRAINT categories_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Membuat tabel 'products' untuk produk jadi
CREATE TABLE IF NOT EXISTS public.products (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    description text NULL,
    price numeric NOT NULL DEFAULT 0,
    stock integer NOT NULL DEFAULT 0,
    category_id uuid NULL,
    image_url text NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT products_pkey PRIMARY KEY (id),
    CONSTRAINT products_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
    CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;


-- Membuat tabel 'raw_materials' untuk bahan baku
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    brand character varying NULL,
    quantity double precision NOT NULL DEFAULT 0,
    unit character varying NOT NULL,
    category text NULL,
    purchase_price numeric NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT raw_materials_pkey PRIMARY KEY (id),
    CONSTRAINT raw_materials_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;

-- Membuat tabel 'customers' untuk data pelanggan
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    email character varying NULL,
    phone character varying NULL,
    loyalty_points integer NOT NULL DEFAULT 0,
    transaction_count integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT customers_pkey PRIMARY KEY (id),
    CONSTRAINT customers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Membuat tabel 'transactions' untuk mencatat setiap transaksi
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    cashier_id uuid NOT NULL,
    customer_id uuid NULL,
    total_amount numeric NOT NULL,
    payment_method text NOT NULL,
    status text NOT NULL DEFAULT 'completed'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT transactions_pkey PRIMARY KEY (id),
    CONSTRAINT transactions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
    CONSTRAINT transactions_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
    CONSTRAINT transactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Membuat tabel 'transaction_items' untuk detail item dalam transaksi
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    transaction_id uuid NOT NULL,
    product_id uuid NULL,
    raw_material_id uuid NULL,
    quantity integer NOT NULL,
    price numeric NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT transaction_items_pkey PRIMARY KEY (id),
    CONSTRAINT transaction_items_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE,
    CONSTRAINT transaction_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL,
    CONSTRAINT transaction_items_raw_material_id_fkey FOREIGN KEY (raw_material_id) REFERENCES public.raw_materials(id) ON DELETE SET NULL
);
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- Tabel untuk Promosi
CREATE TABLE IF NOT EXISTS public.promotions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    type text NOT NULL,
    value numeric NOT NULL,
    get_product_id uuid NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT promotions_pkey PRIMARY KEY (id),
    CONSTRAINT promotions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
    CONSTRAINT promotions_get_product_id_fkey FOREIGN KEY (get_product_id) REFERENCES public.products(id) ON DELETE SET NULL
);
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Tabel untuk Grades (tingkatan kualitas parfum)
CREATE TABLE IF NOT EXISTS public.grades (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    price_multiplier numeric NOT NULL DEFAULT 1.0,
    extra_essence_price numeric NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT grades_pkey PRIMARY KEY (id),
    CONSTRAINT grades_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- Tabel untuk Aroma
CREATE TABLE IF NOT EXISTS public.aromas (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    category text NULL,
    description text NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT aromas_pkey PRIMARY KEY (id),
    CONSTRAINT aromas_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);
ALTER TABLE public.aromas ENABLE ROW LEVEL SECURITY;

-- Tabel untuk Ukuran Botol
CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    size integer NOT NULL,
    unit character varying NOT NULL,
    price numeric NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT bottle_sizes_pkey PRIMARY KEY (id),
    CONSTRAINT bottle_sizes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);
ALTER TABLE public.bottle_sizes ENABLE ROW LEVEL SECURITY;

-- Tabel untuk Resep
CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    grade_id uuid NOT NULL,
    aroma_id uuid NOT NULL,
    bottle_size_id uuid NOT NULL,
    price numeric NOT NULL,
    instructions text NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT recipes_pkey PRIMARY KEY (id),
    CONSTRAINT recipes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
    CONSTRAINT recipes_grade_id_fkey FOREIGN KEY (grade_id) REFERENCES public.grades(id) ON DELETE CASCADE,
    CONSTRAINT recipes_aroma_id_fkey FOREIGN KEY (aroma_id) REFERENCES public.aromas(id) ON DELETE CASCADE,
    CONSTRAINT recipes_bottle_size_id_fkey FOREIGN KEY (bottle_size_id) REFERENCES public.bottle_sizes(id) ON DELETE CASCADE
);
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Tabel untuk Beban (Expenses)
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    date date NOT NULL,
    category character varying NOT NULL,
    description text NOT NULL,
    amount numeric NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT expenses_pkey PRIMARY KEY (id),
    CONSTRAINT expenses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Tabel untuk Pengaturan (Settings)
CREATE TABLE IF NOT EXISTS public.settings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    key character varying NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT settings_pkey PRIMARY KEY (id),
    CONSTRAINT settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
    CONSTRAINT settings_organization_id_key_key UNIQUE (organization_id, key)
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- --- KEBIJAKAN RLS (ROW-LEVEL SECURITY) ---

-- Fungsi helper untuk mendapatkan peran pengguna
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS text AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fungsi helper untuk mendapatkan semua ID organisasi yang diizinkan untuk pengguna
CREATE OR REPLACE FUNCTION get_users_in_organization()
RETURNS TABLE(user_id uuid) AS $$
BEGIN
    RETURN QUERY
    SELECT id FROM public.profiles WHERE organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Kebijakan RLS untuk tabel 'profiles'
DROP POLICY IF EXISTS "Allow user to view their own profile" ON public.profiles;
CREATE POLICY "Allow user to view their own profile" ON public.profiles FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Allow owner/admin to manage profiles in their organization" ON public.profiles;
CREATE POLICY "Allow owner/admin to manage profiles in their organization" ON public.profiles FOR ALL
USING (
    (get_user_role(auth.uid()) IN ('owner', 'admin')) AND
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
DROP POLICY IF EXISTS "Superadmin can manage all profiles" ON public.profiles;
CREATE POLICY "Superadmin can manage all profiles" ON public.profiles FOR ALL
USING (get_user_role(auth.uid()) = 'superadmin');


-- Kebijakan RLS untuk tabel 'organizations'
DROP POLICY IF EXISTS "Allow authenticated users to read organizations" ON public.organizations;
CREATE POLICY "Allow authenticated users to read organizations" ON public.organizations FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow owner to manage their own organization and sub-organizations" ON public.organizations;
CREATE POLICY "Allow owner to manage their own organization and sub-organizations" ON public.organizations FOR ALL
USING (
    (get_user_role(auth.uid()) = 'owner') AND
    (id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
);
DROP POLICY IF EXISTS "Superadmin can manage all organizations" ON public.organizations;
CREATE POLICY "Superadmin can manage all organizations" ON public.organizations FOR ALL
USING (get_user_role(auth.uid()) = 'superadmin');

-- Macro untuk membuat kebijakan RLS
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['products', 'raw_materials', 'customers', 'transactions', 'promotions', 'categories', 'grades', 'aromas', 'bottle_sizes', 'expenses', 'settings']
    LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS "Allow full access based on organization" ON public.%I;
            CREATE POLICY "Allow full access based on organization" ON public.%I FOR ALL
            USING (
                organization_id IN (
                    SELECT id FROM public.organizations WHERE id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
                )
            )
            WITH CHECK (
                organization_id IN (
                    SELECT id FROM public.organizations WHERE id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
                )
            );
        ', table_name, table_name);
    END LOOP;
END;
$$;

-- Kebijakan RLS khusus untuk 'transaction_items'
DROP POLICY IF EXISTS "Allow access based on parent transaction" ON public.transaction_items;
CREATE POLICY "Allow access based on parent transaction" ON public.transaction_items FOR ALL
USING (
    transaction_id IN (SELECT id FROM public.transactions)
)
WITH CHECK (
    transaction_id IN (SELECT id FROM public.transactions)
);

-- Kebijakan RLS khusus untuk 'recipes' (menggunakan relasi dari grade)
DROP POLICY IF EXISTS "Allow access based on related tables" ON public.recipes;
CREATE POLICY "Allow access based on related tables" ON public.recipes FOR ALL
USING (
    organization_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
)
WITH CHECK (
    organization_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
);


-- Fungsi RPC untuk proses checkout
DROP FUNCTION IF EXISTS public.process_checkout(uuid, uuid, uuid, json, numeric, text);
CREATE OR REPLACE FUNCTION public.process_checkout(
    p_organization_id uuid,
    p_cashier_id uuid,
    p_customer_id uuid,
    p_items json,
    p_total_amount numeric,
    p_payment_method text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_transaction_id uuid;
    v_item json;
    v_product_id uuid;
    v_quantity INT;
    v_price NUMERIC;
BEGIN
    -- Masukkan transaksi utama
    INSERT INTO transactions(organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    -- Loop melalui setiap item dan masukkan ke transaction_items
    FOR v_item IN SELECT * FROM json_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::uuid;
        v_quantity := (v_item->>'quantity')::INT;
        v_price := (v_item->>'price')::NUMERIC;

        INSERT INTO transaction_items(transaction_id, product_id, quantity, price)
        VALUES (v_transaction_id, v_product_id, v_quantity, v_price);

        -- Perbarui stok produk
        UPDATE products
        SET stock = stock - v_quantity
        WHERE id = v_product_id AND products.organization_id = p_organization_id; -- Kualifikasi eksplisit
    END LOOP;

    -- Perbarui jumlah transaksi pelanggan jika ada
    IF p_customer_id IS NOT NULL THEN
        UPDATE customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id AND customers.organization_id = p_organization_id; -- Kualifikasi eksplisit
    END IF;

    RETURN v_transaction_id;
END;
$$;
