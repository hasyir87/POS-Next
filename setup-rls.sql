
-- ### Fungsi Helper untuk Keamanan ###

-- Fungsi untuk mendapatkan organization_id pengguna
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id
    FROM public.profiles
    WHERE id = auth.uid();
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fungsi untuk mendapatkan peran pengguna
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid();
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fungsi untuk mengeksekusi SQL sebagai superuser (untuk setup)
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT) RETURNS VOID AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql;


-- ### Pembuatan Tabel ###

-- Tabel Organisasi
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    logo_url TEXT,
    parent_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Tabel Profil Pengguna (menghubungkan ke Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    role public.user_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Tabel Kategori Produk
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Tabel Produk Jadi
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    stock INT NOT NULL DEFAULT 0,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Tabel Bahan Baku
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    category TEXT,
    purchase_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Tabel Pelanggan/Member
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    loyalty_points INT NOT NULL DEFAULT 0,
    transaction_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Tabel Transaksi
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    cashier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method public.payment_method NOT NULL,
    status public.transaction_status NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Tabel Item Transaksi
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id),
    raw_material_id UUID REFERENCES public.raw_materials(id),
    quantity INT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Tabel Promosi
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type public.promotion_type NOT NULL,
    value NUMERIC(10, 2) NOT NULL,
    get_product_id UUID REFERENCES public.products(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Tabel Grade Parfum
CREATE TABLE IF NOT EXISTS public.grades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
    extra_essence_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Tabel Aroma Parfum
CREATE TABLE IF NOT EXISTS public.aromas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Tabel Ukuran Botol
CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    size INT NOT NULL,
    unit TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Tabel Resep
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    grade_id UUID REFERENCES public.grades(id) ON DELETE CASCADE,
    aroma_id UUID REFERENCES public.aromas(id) ON DELETE CASCADE,
    bottle_size_id UUID REFERENCES public.bottle_sizes(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Tabel Beban
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Tabel Pengaturan
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    UNIQUE(organization_id, key),
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);


-- ### Kebijakan RLS (Row-Level Security) ###

-- Mengaktifkan RLS untuk semua tabel
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

-- Menghapus kebijakan yang mungkin sudah ada
DROP POLICY IF EXISTS "Allow full access to own organization" ON public.organizations;
DROP POLICY IF EXISTS "Allow full access to own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow organization access based on profile" ON public.products;
DROP POLICY IF EXISTS "Allow organization access based on profile" ON public.raw_materials;
DROP POLICY IF EXISTS "Allow organization access based on profile" ON public.customers;
DROP POLICY IF EXISTS "Allow organization access based on profile" ON public.transactions;
DROP POLICY IF EXISTS "Allow access based on parent transaction" ON public.transaction_items;
DROP POLICY IF EXISTS "Allow organization access based on profile" ON public.promotions;
DROP POLICY IF EXISTS "Allow organization access based on profile" ON public.categories;
DROP POLICY IF EXISTS "Allow organization access based on profile" ON public.grades;
DROP POLICY IF EXISTS "Allow organization access based on profile" ON public.aromas;
DROP POLICY IF EXISTS "Allow organization access based on profile" ON public.bottle_sizes;
DROP POLICY IF EXISTS "Allow organization access based on profile" ON public.recipes;
DROP POLICY IF EXISTS "Allow organization access based on profile" ON public.expenses;
DROP POLICY IF EXISTS "Allow organization access based on profile" ON public.settings;

-- Kebijakan untuk Organizations
CREATE POLICY "Allow full access to own organization" ON public.organizations
FOR ALL USING (id = public.get_my_organization_id());

-- Kebijakan untuk Profiles
CREATE POLICY "Allow full access to own profile" ON public.profiles
FOR ALL USING (id = auth.uid());

-- Kebijakan Generik untuk Tabel Data (berdasarkan organization_id)
CREATE POLICY "Allow organization access based on profile" ON public.products
FOR ALL USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Allow organization access based on profile" ON public.raw_materials
FOR ALL USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Allow organization access based on profile" ON public.customers
FOR ALL USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Allow organization access based on profile" ON public.transactions
FOR ALL USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Allow organization access based on profile" ON public.promotions
FOR ALL USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Allow organization access based on profile" ON public.categories
FOR ALL USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Allow organization access based on profile" ON public.grades
FOR ALL USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Allow organization access based on profile" ON public.aromas
FOR ALL USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Allow organization access based on profile" ON public.bottle_sizes
FOR ALL USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Allow organization access based on profile" ON public.recipes
FOR ALL USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Allow organization access based on profile" ON public.expenses
FOR ALL USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Allow organization access based on profile" ON public.settings
FOR ALL USING (organization_id = public.get_my_organization_id());


-- Kebijakan KHUSUS untuk Transaction Items
CREATE POLICY "Allow access based on parent transaction" ON public.transaction_items
FOR ALL USING (
    (
        SELECT t.organization_id
        FROM public.transactions t
        WHERE t.id = transaction_id
    ) = public.get_my_organization_id()
);


-- ### Fungsi Checkout ###

CREATE OR REPLACE FUNCTION public.process_checkout(
    p_organization_id UUID,
    p_cashier_id UUID,
    p_customer_id UUID,
    p_items JSONB,
    p_total_amount NUMERIC,
    p_payment_method public.payment_method
) RETURNS UUID AS $$
DECLARE
    new_transaction_id UUID;
    item JSONB;
    product_id_val UUID;
    quantity_val INT;
    price_val NUMERIC;
BEGIN
    -- 1. Buat record transaksi baru
    INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
    RETURNING id INTO new_transaction_id;

    -- 2. Loop melalui item dan masukkan ke transaction_items & update stok
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        product_id_val := (item->>'product_id')::UUID;
        quantity_val := (item->>'quantity')::INT;
        price_val := (item->>'price')::NUMERIC;

        -- Masukkan ke transaction_items
        INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
        VALUES (new_transaction_id, product_id_val, quantity_val, price_val);

        -- Update stok di tabel products
        UPDATE public.products
        SET stock = stock - quantity_val
        WHERE id = product_id_val AND organization_id = p_organization_id; -- Pastikan update di org yang benar
    END LOOP;

    -- 3. Update transaction_count untuk customer jika ada
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id AND organization_id = p_organization_id; -- Pastikan update di org yang benar
    END IF;

    RETURN new_transaction_id;
END;
$$ LANGUAGE plpgsql;
