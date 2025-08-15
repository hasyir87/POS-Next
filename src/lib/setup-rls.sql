
-- Nonaktifkan RLS pada tabel untuk sementara agar bisa dihapus
ALTER TABLE IF EXISTS public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.raw_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transaction_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promotions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.grades DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.aromas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bottle_sizes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings DISABLE ROW LEVEL SECURITY;

-- 1. HAPUS SEMUA KEBIJAKAN (POLICY) TERLEBIH DAHULU
-- Hapus kebijakan dari tabel `settings`
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.settings;
-- Hapus kebijakan dari tabel `expenses`
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.expenses;
-- Hapus kebijakan dari tabel `recipes`
DROP POLICY IF EXISTS "Allow access based on linked organization" ON public.recipes;
-- Hapus kebijakan dari tabel `bottle_sizes`
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.bottle_sizes;
-- Hapus kebijakan dari tabel `aromas`
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.aromas;
-- Hapus kebijakan dari tabel `grades`
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.grades;
-- Hapus kebijakan dari tabel `categories`
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.categories;
-- Hapus kebijakan dari tabel `promotions`
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.promotions;
-- Hapus kebijakan dari tabel `transaction_items`
DROP POLICY IF EXISTS "Allow access based on transaction" ON public.transaction_items;
-- Hapus kebijakan dari tabel `transactions`
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.transactions;
-- Hapus kebijakan dari tabel `customers`
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.customers;
-- Hapus kebijakan dari tabel `raw_materials`
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.raw_materials;
-- Hapus kebijakan dari tabel `products`
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.products;
-- Hapus kebijakan dari tabel `profiles`
DROP POLICY IF EXISTS "Allow user to manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow owner and admin to manage organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow superadmin full access" ON public.profiles;
-- Hapus kebijakan dari tabel `organizations`
DROP POLICY IF EXISTS "Allow user to view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Allow owner to manage their own organization and sub-outlets" ON public.organizations;
DROP POLICY IF EXISTS "Allow superadmin full access" ON public.organizations;


-- 2. HAPUS SEMUA FUNGSI (FUNCTION) SETELAH KEBIJAKAN DIHAPUS
DROP FUNCTION IF EXISTS public.exec_sql(sql_query text);
DROP FUNCTION IF EXISTS public.get_user_role(p_user_id uuid);
DROP FUNCTION IF EXISTS public.get_users_in_organization(p_organization_id uuid);
DROP FUNCTION IF EXISTS public.process_checkout(p_organization_id uuid, p_cashier_id uuid, p_customer_id uuid, p_items jsonb, p_total_amount numeric, p_payment_method text);


-- 3. BUAT ULANG SEMUA TABEL
-- Tabel Organisasi
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name character varying NOT NULL,
    address text,
    phone character varying,
    logo_url text,
    parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
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
    role text CHECK (role IN ('owner', 'admin', 'cashier', 'superadmin')),
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

-- Tabel Produk Jadi
CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    description text,
    price numeric NOT NULL,
    stock integer NOT NULL DEFAULT 0,
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
    quantity numeric NOT NULL,
    unit character varying NOT NULL,
    category character varying,
    purchase_price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Pelanggan/Member
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
    total_amount numeric NOT NULL,
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
    price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Promosi
CREATE TABLE IF NOT EXISTS public.promotions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    type text NOT NULL, -- 'Persentase', 'Nominal', 'BOGO'
    value numeric NOT NULL,
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
    price_multiplier numeric NOT NULL DEFAULT 1.0,
    extra_essence_price numeric NOT NULL DEFAULT 0,
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
    price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Resep
CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    grade_id uuid NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
    aroma_id uuid NOT NULL REFERENCES public.aromas(id) ON DELETE CASCADE,
    bottle_size_id uuid NOT NULL REFERENCES public.bottle_sizes(id) ON DELETE CASCADE,
    price numeric NOT NULL,
    instructions text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Beban/Pengeluaran
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date date NOT NULL,
    category character varying NOT NULL,
    description text,
    amount numeric NOT NULL,
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


-- 4. BUAT ULANG SEMUA FUNGSI
-- Fungsi untuk mengeksekusi SQL dinamis (untuk setup)
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    EXECUTE sql_query;
END;
$$;

-- Fungsi untuk mendapatkan peran pengguna
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT role FROM public.profiles WHERE id = p_user_id;
$$;

-- Fungsi untuk mendapatkan daftar pengguna dalam satu organisasi
CREATE OR REPLACE FUNCTION public.get_users_in_organization(p_organization_id uuid)
RETURNS TABLE(user_id uuid, email text, full_name text, role text)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT id, email, full_name, role FROM public.profiles WHERE organization_id = p_organization_id;
$$;

-- Fungsi untuk memproses checkout
CREATE OR REPLACE FUNCTION public.process_checkout(
    p_organization_id uuid,
    p_cashier_id uuid,
    p_customer_id uuid,
    p_items jsonb,
    p_total_amount numeric,
    p_payment_method text
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    new_transaction_id uuid;
    item_record jsonb;
    p_id uuid;
    qty int;
BEGIN
    -- Masukkan transaksi baru
    INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
    RETURNING id INTO new_transaction_id;

    -- Loop melalui item dan masukkan ke transaction_items & update stok
    FOR item_record IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        p_id := (item_record->>'product_id')::uuid;
        qty := (item_record->>'quantity')::int;

        -- Masukkan ke transaction_items
        INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
        VALUES (new_transaction_id, p_id, qty, (item_record->>'price')::numeric);

        -- Update stok di tabel products
        UPDATE public.products
        SET stock = stock - qty
        WHERE id = p_id AND products.organization_id = p_organization_id; -- Kualifikasi eksplisit

        -- Update stok di tabel raw_materials (jika relevan, perlu logika tambahan)
        -- ...
    END LOOP;

    -- Update jumlah transaksi pelanggan jika ada
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id AND customers.organization_id = p_organization_id; -- Kualifikasi eksplisit
    END IF;

    RETURN new_transaction_id;
END;
$$;


-- 5. AKTIFKAN RLS PADA SEMUA TABEL
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


-- 6. BUAT ULANG SEMUA KEBIJAKAN (POLICY)
-- Kebijakan untuk tabel `organizations`
CREATE POLICY "Allow user to view their own organization" ON public.organizations FOR SELECT USING (id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow owner to manage their own organization and sub-outlets" ON public.organizations FOR ALL USING ((get_user_role(auth.uid()) = 'owner' AND (id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))));
CREATE POLICY "Allow superadmin full access" ON public.organizations FOR ALL USING (get_user_role(auth.uid()) = 'superadmin');

-- Kebijakan untuk tabel `profiles`
CREATE POLICY "Allow user to manage their own profile" ON public.profiles FOR ALL USING (id = auth.uid());
CREATE POLICY "Allow owner and admin to manage organization profiles" ON public.profiles FOR SELECT USING ((get_user_role(auth.uid()) IN ('owner', 'admin')) AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow superadmin full access" ON public.profiles FOR ALL USING (get_user_role(auth.uid()) = 'superadmin');

-- Kebijakan untuk tabel `products`
CREATE POLICY "Allow full access based on organization" ON public.products FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk tabel `raw_materials`
CREATE POLICY "Allow full access based on organization" ON public.raw_materials FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk tabel `customers`
CREATE POLICY "Allow full access based on organization" ON public.customers FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk tabel `transactions`
CREATE POLICY "Allow full access based on organization" ON public.transactions FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk tabel `transaction_items`
CREATE POLICY "Allow access based on transaction" ON public.transaction_items FOR ALL USING (
    transaction_id IN (
        SELECT id FROM public.transactions WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
);

-- Kebijakan untuk tabel `promotions`
CREATE POLICY "Allow full access based on organization" ON public.promotions FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk tabel `categories`
CREATE POLICY "Allow full access based on organization" ON public.categories FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk tabel `grades`
CREATE POLICY "Allow full access based on organization" ON public.grades FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk tabel `aromas`
CREATE POLICY "Allow full access based on organization" ON public.aromas FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk tabel `bottle_sizes`
CREATE POLICY "Allow full access based on organization" ON public.bottle_sizes FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk tabel `recipes`
CREATE POLICY "Allow full access based on organization" ON public.recipes FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk tabel `expenses`
CREATE POLICY "Allow full access based on organization" ON public.expenses FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk tabel `settings`
CREATE POLICY "Allow full access based on organization" ON public.settings FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
