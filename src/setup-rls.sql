-- setup-rls.sql

-- Hapus semua kebijakan yang ada terlebih dahulu untuk menghindari error dependensi
-- Ini membuat skrip dapat dijalankan ulang (idempotent)
DROP POLICY IF EXISTS "Allow superadmin full access" ON public.organizations;
DROP POLICY IF EXISTS "Allow owner and admin to view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Allow owner to create outlets for their organization" ON public.organizations;
DROP POLICY IF EXISTS "Allow superadmin full access" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow owner and admin to view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Allow owner and admin to update profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.products;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.raw_materials;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.customers;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.transactions;
DROP POLICY IF EXISTS "Allow access based on parent transaction" ON public.transaction_items;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.promotions;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.categories;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.grades;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.aromas;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.bottle_sizes;
DROP POLICY IF EXISTS "Allow access based on components" ON public.recipes;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.expenses;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.settings;

-- Hapus fungsi yang ada setelah kebijakan dihapus
DROP FUNCTION IF EXISTS public.exec_sql(text);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.get_users_in_organization(uuid);
DROP FUNCTION IF EXISTS public.process_checkout(uuid, uuid, uuid, jsonb, numeric, text);


-- =================================================================
-- BUAT TABEL
-- =================================================================

-- Tabel Organisasi (Toko Induk & Outlet)
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    address text,
    phone text,
    logo_url text,
    parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Profil Pengguna (menghubungkan Auth ke Organisasi)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE,
    full_name text,
    avatar_url text,
    organization_id uuid REFERENCES public.organizations(id),
    role public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Kategori Produk
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Produk Jadi
CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric NOT NULL,
    stock integer NOT NULL,
    category_id uuid REFERENCES public.categories(id),
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Bahan Baku
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    brand text,
    quantity numeric NOT NULL,
    unit text NOT NULL,
    category text,
    purchase_price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Pelanggan/Anggota
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
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
    payment_method public.payment_method NOT NULL,
    status public.transaction_status NOT NULL,
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
    name text NOT NULL,
    type public.promotion_type NOT NULL,
    value numeric NOT NULL,
    get_product_id uuid REFERENCES public.products(id),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Grade Parfum (untuk sistem Refill)
CREATE TABLE IF NOT EXISTS public.grades (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    price_multiplier numeric DEFAULT 1.0 NOT NULL,
    extra_essence_price numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Aroma (untuk sistem Refill)
CREATE TABLE IF NOT EXISTS public.aromas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    category text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Ukuran Botol (untuk sistem Refill)
CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    size integer NOT NULL,
    unit text NOT NULL,
    price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Resep (untuk sistem Refill)
CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    grade_id uuid REFERENCES public.grades(id),
    aroma_id uuid REFERENCES public.aromas(id),
    bottle_size_id uuid REFERENCES public.bottle_sizes(id),
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
    category text NOT NULL,
    description text NOT NULL,
    amount numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Pengaturan
CREATE TABLE IF NOT EXISTS public.settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key text NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- =================================================================
-- BUAT FUNGSI HELPER
-- =================================================================

-- Fungsi untuk mendapatkan peran pengguna
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT role FROM public.profiles WHERE id = p_user_id;
$$;

-- Fungsi untuk mendapatkan semua ID pengguna dalam organisasi tertentu
CREATE OR REPLACE FUNCTION public.get_users_in_organization(p_organization_id uuid)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT id FROM public.profiles WHERE organization_id = p_organization_id;
$$;

-- Fungsi RPC untuk memproses checkout
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
SECURITY DEFINER
AS $$
DECLARE
    new_transaction_id uuid;
    item jsonb;
BEGIN
    -- Buat record transaksi baru
    INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method::public.payment_method, 'completed')
    RETURNING id INTO new_transaction_id;

    -- Loop melalui setiap item di keranjang
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Masukkan ke transaction_items
        INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
        VALUES (new_transaction_id, (item->>'product_id')::uuid, (item->>'quantity')::integer, (item->>'price')::numeric);

        -- Kurangi stok dari tabel products
        UPDATE public.products
        SET stock = stock - (item->>'quantity')::integer
        WHERE id = (item->>'product_id')::uuid
          AND products.organization_id = p_organization_id; -- Penegasan tabel untuk 'organization_id'
    END LOOP;

    -- Perbarui transaction_count untuk customer jika ada
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id
          AND customers.organization_id = p_organization_id; -- Penegasan tabel untuk 'organization_id'
    END IF;

    RETURN new_transaction_id;
END;
$$;


-- =================================================================
-- AKTIFKAN ROW LEVEL SECURITY (RLS)
-- =================================================================

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

-- =================================================================
-- BUAT KEBIJAKAN RLS (POLICIES)
-- =================================================================

-- Kebijakan untuk 'organizations'
CREATE POLICY "Allow superadmin full access" ON public.organizations FOR ALL
    USING (public.get_user_role(auth.uid()) = 'superadmin');
CREATE POLICY "Allow owner and admin to view their own organization" ON public.organizations FOR SELECT
    USING (id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow owner to create outlets for their organization" ON public.organizations FOR INSERT
    WITH CHECK (public.get_user_role(auth.uid()) = 'owner' AND parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan untuk 'profiles'
CREATE POLICY "Allow superadmin full access" ON public.profiles FOR ALL
    USING (public.get_user_role(auth.uid()) = 'superadmin');
CREATE POLICY "Allow users to view their own profile" ON public.profiles FOR SELECT
    USING (id = auth.uid());
CREATE POLICY "Allow owner and admin to view profiles in their organization" ON public.profiles FOR SELECT
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow owner and admin to update profiles in their organization" ON public.profiles FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan Umum untuk Sebagian Besar Tabel
-- Ini adalah kebijakan generik untuk tabel yang memiliki kolom 'organization_id'
CREATE POLICY "Allow full access based on organization" ON public.products FOR ALL
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow full access based on organization" ON public.raw_materials FOR ALL
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow full access based on organization" ON public.customers FOR ALL
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow full access based on organization" ON public.transactions FOR ALL
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow full access based on organization" ON public.promotions FOR ALL
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow full access based on organization" ON public.categories FOR ALL
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow full access based on organization" ON public.grades FOR ALL
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow full access based on organization" ON public.aromas FOR ALL
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow full access based on organization" ON public.bottle_sizes FOR ALL
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow full access based on organization" ON public.expenses FOR ALL
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow full access based on organization" ON public.settings FOR ALL
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan Khusus untuk Tabel yang Tidak Memiliki 'organization_id'
CREATE POLICY "Allow access based on parent transaction" ON public.transaction_items FOR ALL
    USING (
        (SELECT organization_id FROM public.transactions WHERE id = transaction_id) = 
        (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Allow access based on components" ON public.recipes FOR ALL
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
