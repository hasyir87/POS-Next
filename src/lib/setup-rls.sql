-- setup-rls.sql

-- =============================================
-- Bagian 1: HAPUS SEMUA KEBIJAKAN & FUNGSI LAMA
-- Urutan ini sangat penting untuk menghindari error dependensi.
-- Kebijakan harus dihapus sebelum fungsi yang digunakannya.
-- =============================================

-- Hapus Kebijakan (Policies)
DROP POLICY IF EXISTS "Allow individual read access" ON public.organizations;
DROP POLICY IF EXISTS "Allow individual insert access" ON public.organizations;
DROP POLICY IF EXISTS "Allow individual update access" ON public.organizations;
DROP POLICY IF EXISTS "Allow individual delete access" ON public.organizations;
DROP POLICY IF EXISTS "Allow parent org members to read children" ON public.organizations;
DROP POLICY IF EXISTS "Allow superadmin full access" ON public.organizations;

DROP POLICY IF EXISTS "Allow individual read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual update access" ON public.profiles;
DROP POLICY IF EXISTS "Allow owner to manage their organization members" ON public.profiles;
DROP POLICY IF EXISTS "Allow superadmin full access" ON public.profiles;

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
DROP POLICY IF EXISTS "Allow access based on related tables" ON public.recipes;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.expenses;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.settings;

-- Hapus Fungsi (Functions)
DROP FUNCTION IF EXISTS public.exec_sql(text);
DROP FUNCTION IF EXISTS public.get_user_role(p_user_id uuid);
DROP FUNCTION IF EXISTS public.get_users_in_organization(p_organization_id uuid);
DROP FUNCTION IF EXISTS public.process_checkout(uuid,uuid,uuid,jsonb,numeric,text);

-- =============================================
-- Bagian 2: BUAT SEMUA TABEL
-- =============================================

-- Tabel untuk organisasi/toko
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    address text,
    phone text,
    logo_url text,
    parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);
COMMENT ON COLUMN public.organizations.parent_organization_id IS 'Untuk struktur multi-outlet (induk-anak)';

-- Tabel untuk profil pengguna, menghubungkan ke auth.users dan organizations
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL,
    full_name text,
    avatar_url text,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    role text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.profiles IS 'Profil pengguna yang terhubung ke Supabase Auth dan Organisasi';

-- Tabel untuk kategori produk
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel untuk produk jadi
CREATE TABLE IF NOT EXISTS public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric NOT NULL,
    stock integer NOT NULL,
    category_id uuid REFERENCES public.categories(id),
    image_url text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel untuk bahan baku
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    brand text,
    quantity numeric NOT NULL,
    unit text NOT NULL,
    category text,
    purchase_price numeric NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel untuk pelanggan
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    loyalty_points integer DEFAULT 0 NOT NULL,
    transaction_count integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel untuk transaksi
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cashier_id uuid NOT NULL REFERENCES public.profiles(id),
    customer_id uuid REFERENCES public.customers(id),
    total_amount numeric NOT NULL,
    payment_method text NOT NULL,
    status text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel untuk item dalam transaksi
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id),
    raw_material_id uuid REFERENCES public.raw_materials(id),
    quantity integer NOT NULL,
    price numeric NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel untuk promosi
CREATE TABLE IF NOT EXISTS public.promotions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL, -- 'Persentase', 'Nominal', 'BOGO'
    value numeric NOT NULL,
    get_product_id uuid REFERENCES public.products(id),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel untuk Grade Parfum (untuk refill)
CREATE TABLE IF NOT EXISTS public.grades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    price_multiplier numeric DEFAULT 1.0 NOT NULL,
    extra_essence_price numeric DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel untuk Aroma Parfum (untuk refill)
CREATE TABLE IF NOT EXISTS public.aromas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    category text,
    description text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel untuk Ukuran Botol (untuk refill)
CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    size integer NOT NULL,
    unit text NOT NULL,
    price numeric NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel untuk Resep Parfum (untuk refill)
CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    grade_id uuid NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
    aroma_id uuid NOT NULL REFERENCES public.aromas(id) ON DELETE CASCADE,
    bottle_size_id uuid NOT NULL REFERENCES public.bottle_sizes(id) ON DELETE CASCADE,
    price numeric NOT NULL,
    instructions text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel untuk pengeluaran/beban
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date date NOT NULL,
    category text NOT NULL,
    description text,
    amount numeric NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabel untuk pengaturan aplikasi
CREATE TABLE IF NOT EXISTS public.settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key text NOT NULL,
    value text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(organization_id, key)
);

-- =============================================
-- Bagian 3: BUAT FUNGSI-FUNGSI POSTGRESQL
-- =============================================

-- Fungsi untuk mengeksekusi SQL dinamis (digunakan oleh setup script)
CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS void AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- Fungsi untuk mendapatkan peran pengguna
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fungsi untuk mendapatkan semua pengguna dalam satu organisasi (induk)
CREATE OR REPLACE FUNCTION public.get_users_in_organization(p_organization_id uuid)
RETURNS TABLE (user_id uuid) AS $$
BEGIN
  RETURN QUERY SELECT id FROM public.profiles WHERE organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Fungsi untuk memproses checkout sebagai satu transaksi atomik
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
    item record;
BEGIN
    -- Masukkan transaksi utama
    INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    -- Loop melalui item dan masukkan ke transaction_items
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity int, price numeric)
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

-- =============================================
-- Bagian 4: AKTIFKAN ROW LEVEL SECURITY (RLS) & BUAT KEBIJAKAN
-- =============================================

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

-- Kebijakan untuk Tabel Organizations
CREATE POLICY "Allow individual read access" ON public.organizations FOR SELECT USING (id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow individual insert access" ON public.organizations FOR INSERT WITH CHECK (parent_organization_id IS NOT NULL AND parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow individual update access" ON public.organizations FOR UPDATE USING (id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow individual delete access" ON public.organizations FOR DELETE USING (id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow parent org members to read children" ON public.organizations FOR SELECT USING (parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow superadmin full access" ON public.organizations FOR ALL USING (public.get_user_role(auth.uid()) = 'superadmin');

-- Kebijakan untuk Tabel Profiles
CREATE POLICY "Allow individual read access" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Allow individual update access" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Allow owner to manage their organization members" ON public.profiles FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow superadmin full access" ON public.profiles FOR ALL USING (public.get_user_role(auth.uid()) = 'superadmin');

-- Kebijakan Generik untuk Tabel Data (berdasarkan organization_id)
CREATE POLICY "Allow full access based on organization" ON public.products FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.raw_materials FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.customers FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.transactions FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.promotions FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.categories FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.grades FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.aromas FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.bottle_sizes FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.expenses FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow full access based on organization" ON public.settings FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Kebijakan Khusus untuk Tabel yang Tidak Punya organization_id
CREATE POLICY "Allow access based on parent transaction" ON public.transaction_items FOR ALL USING (
    transaction_id IN (SELECT id FROM public.transactions)
);

CREATE POLICY "Allow access based on related tables" ON public.recipes FOR ALL USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
