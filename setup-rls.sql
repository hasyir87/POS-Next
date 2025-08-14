
-- Hapus kebijakan yang ada jika ada untuk pembersihan
DROP POLICY IF EXISTS "Enable read access for all users" ON public.organizations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.organizations;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.organizations;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.organizations;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for organization members" ON public.products;
DROP POLICY IF EXISTS "Enable insert for organization members" ON public.products;
DROP POLICY IF EXISTS "Enable update for organization members" ON public.products;
DROP POLICY IF EXISTS "Enable delete for organization members" ON public.products;
DROP POLICY IF EXISTS "Enable read access for organization members" ON public.raw_materials;
DROP POLICY IF EXISTS "Enable insert for organization members" ON public.raw_materials;
DROP POLICY IF EXISTS "Enable update for organization members" ON public.raw_materials;
DROP POLICY IF EXISTS "Enable delete for organization members" ON public.raw_materials;
DROP POLICY IF EXISTS "Enable read access for organization members" ON public.customers;
DROP POLICY IF EXISTS "Enable insert for organization members" ON public.customers;
DROP POLICY IF EXISTS "Enable update for organization members" ON public.customers;
DROP POLICY IF EXISTS "Enable delete for organization members" ON public.customers;
DROP POLICY IF EXISTS "Enable read access for organization members" ON public.transactions;
DROP POLICY IF EXISTS "Enable insert for organization members" ON public.transactions;
DROP POLICY IF EXISTS "Enable update for organization members" ON public.transactions;
DROP POLICY IF EXISTS "Enable delete for organization members" ON public.transactions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.transaction_items;
DROP POLICY IF EXISTS "Enable read access for organization members" ON public.promotions;
DROP POLICY IF EXISTS "Enable insert for organization members" ON public.promotions;
DROP POLICY IF EXISTS "Enable update for organization members" ON public.promotions;
DROP POLICY IF EXISTS "Enable delete for organization members" ON public.promotions;
DROP POLICY IF EXISTS "Enable read access for organization members" ON public.categories;
DROP POLICY IF EXISTS "Enable insert for organization members" ON public.categories;
DROP POLICY IF EXISTS "Enable update for organization members" ON public.categories;
DROP POLICY IF EXISTS "Enable delete for organization members" ON public.categories;
DROP POLICY IF EXISTS "Enable read access for organization members" ON public.grades;
DROP POLICY IF EXISTS "Enable read access for organization members" ON public.aromas;
DROP POLICY IF EXISTS "Enable read access for organization members" ON public.bottle_sizes;
DROP POLICY IF EXISTS "Enable read access for organization members" ON public.recipes;
DROP POLICY IF EXISTS "Enable read access for organization members" ON public.expenses;
DROP POLICY IF EXISTS "Enable read access for organization members" ON public.settings;

-- Buat ulang tabel-tabel jika belum ada
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying NOT NULL,
    address text,
    phone character varying,
    logo_url text,
    parent_organization_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organizations_pkey PRIMARY KEY (id),
    CONSTRAINT organizations_parent_organization_id_fkey FOREIGN KEY (parent_organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    email character varying,
    full_name character varying,
    avatar_url text,
    organization_id uuid,
    role text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL,
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.categories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT categories_pkey PRIMARY KEY (id),
    CONSTRAINT categories_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.products (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    description text,
    price numeric NOT NULL,
    stock integer NOT NULL,
    category_id uuid,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT products_pkey PRIMARY KEY (id),
    CONSTRAINT products_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
    CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.raw_materials (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    brand character varying,
    quantity numeric NOT NULL,
    unit character varying NOT NULL,
    category character varying,
    purchase_price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT raw_materials_pkey PRIMARY KEY (id),
    CONSTRAINT raw_materials_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.customers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    email character varying,
    phone character varying,
    loyalty_points integer DEFAULT 0 NOT NULL,
    transaction_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT customers_pkey PRIMARY KEY (id),
    CONSTRAINT customers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    cashier_id uuid NOT NULL,
    customer_id uuid,
    total_amount numeric NOT NULL,
    payment_method text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transactions_pkey PRIMARY KEY (id),
    CONSTRAINT transactions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
    CONSTRAINT transactions_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
    CONSTRAINT transactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.transaction_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    transaction_id uuid NOT NULL,
    product_id uuid,
    raw_material_id uuid,
    quantity integer NOT NULL,
    price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transaction_items_pkey PRIMARY KEY (id),
    CONSTRAINT transaction_items_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE,
    CONSTRAINT transaction_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL,
    CONSTRAINT transaction_items_raw_material_id_fkey FOREIGN KEY (raw_material_id) REFERENCES public.raw_materials(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.promotions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    type text NOT NULL,
    value numeric NOT NULL,
    get_product_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT promotions_pkey PRIMARY KEY (id),
    CONSTRAINT promotions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
    CONSTRAINT promotions_get_product_id_fkey FOREIGN KEY (get_product_id) REFERENCES public.products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.grades (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    price_multiplier numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT grades_pkey PRIMARY KEY (id),
    CONSTRAINT grades_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.aromas (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    category character varying,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT aromas_pkey PRIMARY KEY (id),
    CONSTRAINT aromas_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    size integer NOT NULL,
    unit character varying NOT NULL,
    price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bottle_sizes_pkey PRIMARY KEY (id),
    CONSTRAINT bottle_sizes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    grade_id uuid NOT NULL,
    aroma_id uuid NOT NULL,
    bottle_size_id uuid NOT NULL,
    price numeric NOT NULL,
    instructions text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recipes_pkey PRIMARY KEY (id),
    CONSTRAINT recipes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
    CONSTRAINT recipes_grade_id_fkey FOREIGN KEY (grade_id) REFERENCES public.grades(id) ON DELETE CASCADE,
    CONSTRAINT recipes_aroma_id_fkey FOREIGN KEY (aroma_id) REFERENCES public.aromas(id) ON DELETE CASCADE,
    CONSTRAINT recipes_bottle_size_id_fkey FOREIGN KEY (bottle_size_id) REFERENCES public.bottle_sizes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    date date NOT NULL,
    category character varying NOT NULL,
    description text,
    amount numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT expenses_pkey PRIMARY KEY (id),
    CONSTRAINT expenses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.settings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    key character varying NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT settings_pkey PRIMARY KEY (id),
    CONSTRAINT settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
    CONSTRAINT settings_organization_id_key_key UNIQUE (organization_id, key)
);


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

-- Fungsi untuk mendapatkan peran pengguna dari tabel profiles
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Fungsi untuk mendapatkan semua pengguna dalam organisasi induk atau sub-outlet
CREATE OR REPLACE FUNCTION get_users_in_organization(p_organization_id uuid)
RETURNS TABLE(user_id uuid) AS $$
BEGIN
    RETURN QUERY
    SELECT id FROM public.profiles WHERE organization_id IN (
        WITH RECURSIVE org_tree AS (
            SELECT id FROM public.organizations WHERE id = p_organization_id
            UNION
            SELECT o.id FROM public.organizations o
            INNER JOIN org_tree ot ON o.parent_organization_id = ot.id
        )
        SELECT id FROM org_tree
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Kebijakan untuk organizations
CREATE POLICY "Enable read access for all users" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.organizations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for users based on user_id" ON public.organizations FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE organization_id = id AND role = 'owner')) WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE organization_id = id AND role = 'owner'));
CREATE POLICY "Enable delete for users based on user_id" ON public.organizations FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE organization_id = id AND role = 'owner'));

-- Kebijakan untuk profiles
CREATE POLICY "Enable read access for all users" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Kebijakan umum untuk tabel data
CREATE POLICY "Enable read access for organization members" ON public.products FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable insert for organization members" ON public.products FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable update for organization members" ON public.products FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable delete for organization members" ON public.products FOR DELETE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Enable read access for organization members" ON public.raw_materials FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable insert for organization members" ON public.raw_materials FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable update for organization members" ON public.raw_materials FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable delete for organization members" ON public.raw_materials FOR DELETE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Enable read access for organization members" ON public.customers FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable insert for organization members" ON public.customers FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable update for organization members" ON public.customers FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable delete for organization members" ON public.customers FOR DELETE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Enable read access for organization members" ON public.transactions FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable insert for organization members" ON public.transactions FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable update for organization members" ON public.transactions FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable delete for organization members" ON public.transactions FOR DELETE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Enable read access for all users" ON public.transaction_items FOR SELECT USING (true);

CREATE POLICY "Enable read access for organization members" ON public.promotions FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable insert for organization members" ON public.promotions FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable update for organization members" ON public.promotions FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable delete for organization members" ON public.promotions FOR DELETE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Enable read access for organization members" ON public.categories FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable insert for organization members" ON public.categories FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable update for organization members" ON public.categories FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable delete for organization members" ON public.categories FOR DELETE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Enable read access for organization members" ON public.grades FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable read access for organization members" ON public.aromas FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable read access for organization members" ON public.bottle_sizes FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable read access for organization members" ON public.recipes FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable read access for organization members" ON public.expenses FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Enable read access for organization members" ON public.settings FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));


-- Fungsi untuk checkout
CREATE OR REPLACE FUNCTION process_checkout(
    p_organization_id uuid,
    p_cashier_id uuid,
    p_customer_id uuid,
    p_items json,
    p_total_amount numeric,
    p_payment_method text
)
RETURNS uuid AS $$
DECLARE
    v_transaction_id uuid;
    item record;
BEGIN
    -- Masukkan transaksi baru
    INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    -- Loop melalui item dan masukkan ke transaction_items & update stok
    FOR item IN SELECT * FROM json_to_recordset(p_items) AS x(product_id uuid, quantity int, price numeric)
    LOOP
        INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
        VALUES (v_transaction_id, item.product_id, item.quantity, item.price);

        -- Kurangi stok produk
        UPDATE public.products
        SET stock = stock - item.quantity
        WHERE id = item.product_id;
    END LOOP;
    
    -- Update jumlah transaksi pelanggan jika ada
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id;
    END IF;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Fungsi untuk update stok (opsional, bisa digabung di checkout)
CREATE OR REPLACE FUNCTION update_product_stock(p_product_id uuid, p_quantity_sold int)
RETURNS void AS $$
BEGIN
    UPDATE public.products
    SET stock = stock - p_quantity_sold
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;
