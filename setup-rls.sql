-- Nonaktifkan RLS untuk sementara agar bisa membuat tabel
ALTER TABLE IF EXISTS public.aromas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bottle_sizes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.grades DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promotions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.raw_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transaction_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions DISABLE ROW LEVEL SECURITY;

-- 1. Definisikan Fungsi untuk Menjalankan SQL Dinamis
-- Drop fungsi jika sudah ada untuk menghindari error saat pembuatan ulang
DROP FUNCTION IF EXISTS public.exec_sql(text);
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS text AS $$
BEGIN
  EXECUTE sql;
  RETURN 'Command executed successfully';
END;
$$ LANGUAGE plpgsql;

-- 2. Buat Tabel-Tabel
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  address text,
  phone text,
  logo_url text,
  parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  full_name text,
  avatar_url text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  role text CHECK (role IN ('owner', 'admin', 'cashier', 'superadmin')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10, 2) NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.raw_materials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    brand text,
    quantity numeric(10, 2) NOT NULL,
    unit text NOT NULL,
    category text,
    purchase_price numeric(10, 2) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.customers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    loyalty_points integer DEFAULT 0 NOT NULL,
    transaction_count integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.grades (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    price_multiplier numeric(4, 2) DEFAULT 1.0 NOT NULL,
    extra_essence_price numeric(10, 2) DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.aromas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    category text,
    description text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    size integer NOT NULL,
    unit text NOT NULL,
    price numeric(10, 2) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    grade_id uuid REFERENCES public.grades(id) ON DELETE SET NULL,
    aroma_id uuid REFERENCES public.aromas(id) ON DELETE SET NULL,
    bottle_size_id uuid REFERENCES public.bottle_sizes(id) ON DELETE SET NULL,
    price numeric(10, 2) NOT NULL,
    instructions text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date date NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    amount numeric(10, 2) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key text NOT NULL,
    value text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (organization_id, key)
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cashier_id uuid REFERENCES public.profiles(id),
    customer_id uuid REFERENCES public.customers(id),
    total_amount numeric(10, 2) NOT NULL,
    payment_method text NOT NULL,
    status text DEFAULT 'completed'::text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transaction_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id),
    raw_material_id uuid REFERENCES public.raw_materials(id),
    quantity integer NOT NULL,
    price numeric(10, 2) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.promotions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL,
    value numeric(10, 2) NOT NULL,
    get_product_id uuid REFERENCES public.products(id),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Definisikan Fungsi Helper untuk RLS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_users_in_organization(org_id uuid)
RETURNS SETOF uuid AS $$
BEGIN
  RETURN QUERY SELECT id FROM public.profiles WHERE organization_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Aktifkan RLS pada Semua Tabel
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

-- 5. Buat Kebijakan RLS (Hapus yang lama jika ada)
DROP POLICY IF EXISTS "Allow individual access" ON public.profiles;
CREATE POLICY "Allow individual access" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow owner and admin to manage organization users" ON public.profiles;
CREATE POLICY "Allow owner and admin to manage organization users" ON public.profiles FOR ALL
USING (
    (get_user_role() = 'owner' OR get_user_role() = 'admin') AND
    organization_id IN (
        SELECT id FROM public.organizations WHERE id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
);

-- Buat kebijakan umum untuk tabel data
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name NOT IN ('profiles', 'organizations')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow full access based on organization" ON public.%I;', t_name);
        EXECUTE format('
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
        ', t_name);
    END LOOP;
END;
$$;

-- 6. Fungsi untuk Proses Checkout
CREATE OR REPLACE FUNCTION public.process_checkout(
    p_organization_id uuid,
    p_cashier_id uuid,
    p_customer_id uuid,
    p_items jsonb,
    p_total_amount numeric,
    p_payment_method text
) RETURNS text AS $$
DECLARE
    v_transaction_id uuid;
    item jsonb;
BEGIN
    -- Buat record transaksi baru
    INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    -- Loop melalui setiap item dalam pesanan
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Masukkan item ke transaction_items
        INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
        VALUES (v_transaction_id, (item->>'product_id')::uuid, (item->>'quantity')::int, (item->>'price')::numeric);

        -- Perbarui stok produk
        UPDATE public.products
        SET stock = stock - (item->>'quantity')::int
        WHERE id = (item->>'product_id')::uuid
          AND products.organization_id = p_organization_id; -- Kualifikasi eksplisit
    END LOOP;

    -- Perbarui jumlah transaksi pelanggan jika ada
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id
          AND customers.organization_id = p_organization_id; -- Kualifikasi eksplisit
    END IF;

    RETURN v_transaction_id::text;
END;
$$ LANGUAGE plpgsql;
