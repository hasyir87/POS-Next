
-- Hapus semua kebijakan yang ada untuk menghindari konflik "depends on"
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.organizations;
DROP POLICY IF EXISTS "Allow full access based on organization" ON public.profiles;
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

-- Hapus semua fungsi yang ada untuk memungkinkan pembuatan ulang
DROP FUNCTION IF EXISTS public.exec_sql(text);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.get_users_in_organization(uuid);
DROP FUNCTION IF EXISTS public.process_checkout(uuid, uuid, uuid, jsonb, numeric, text);
DROP FUNCTION IF EXISTS public.update_product_stock(uuid, integer);


-- 1. Fungsi untuk mengeksekusi SQL dinamis (untuk setup)
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- 2. Fungsi untuk mendapatkan peran pengguna
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = p_user_id;
  RETURN v_role;
END;
$$;

-- 3. Fungsi untuk mendapatkan daftar pengguna dalam organisasi yang sama
CREATE OR REPLACE FUNCTION public.get_users_in_organization(p_user_id uuid)
RETURNS TABLE(id uuid, email text, full_name text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_organization_id uuid;
BEGIN
    SELECT organization_id INTO v_organization_id FROM profiles WHERE profiles.id = p_user_id;

    RETURN QUERY
    SELECT p.id, p.email, p.full_name, p.role
    FROM profiles p
    WHERE p.organization_id = v_organization_id;
END;
$$;


-- 4. Fungsi untuk memproses checkout
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
    v_transaction_id uuid;
    v_item jsonb;
    v_product_id uuid;
    v_quantity integer;
    v_price numeric;
BEGIN
    -- 1. Buat record transaksi baru
    INSERT INTO public.transactions(organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method::public.payment_method, 'completed'::public.transaction_status)
    RETURNING id INTO v_transaction_id;

    -- 2. Loop melalui item dan masukkan ke transaction_items & update stok
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::uuid;
        v_quantity := (v_item->>'quantity')::integer;
        v_price := (v_item->>'price')::numeric;

        -- Masukkan ke transaction_items
        INSERT INTO public.transaction_items(transaction_id, product_id, quantity, price)
        VALUES (v_transaction_id, v_product_id, v_quantity, v_price);

        -- Update stok produk
        UPDATE public.products
        SET stock = stock - v_quantity
        WHERE id = v_product_id;

    END LOOP;

    -- 3. Update jumlah transaksi customer jika ada
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id;
    END IF;

    RETURN v_transaction_id;
END;
$$;


-- 5. Fungsi untuk update stok (jika diperlukan secara terpisah)
CREATE OR REPLACE FUNCTION public.update_product_stock(
    p_product_id uuid,
    p_quantity_sold integer
)
RETURNS void AS $$
BEGIN
    UPDATE public.products
    SET stock = stock - p_quantity_sold
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;


-- Aktifkan Row-Level Security untuk semua tabel yang relevan
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


-- Buat Kebijakan RLS

-- Policy untuk organizations
CREATE POLICY "Allow full access based on organization" ON public.organizations FOR ALL
USING (
    id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);


-- Policy untuk profiles
CREATE POLICY "Allow full access based on organization" ON public.profiles FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy untuk products
CREATE POLICY "Allow full access based on organization" ON public.products FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy untuk raw_materials
CREATE POLICY "Allow full access based on organization" ON public.raw_materials FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy untuk customers
CREATE POLICY "Allow full access based on organization" ON public.customers FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy untuk transactions
CREATE POLICY "Allow full access based on organization" ON public.transactions FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy untuk transaction_items (bergantung pada transactions)
CREATE POLICY "Allow access based on parent transaction" ON public.transaction_items FOR ALL
USING (
    (SELECT organization_id FROM public.transactions WHERE id = transaction_id) = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    (SELECT organization_id FROM public.transactions WHERE id = transaction_id) = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy untuk promotions
CREATE POLICY "Allow full access based on organization" ON public.promotions FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy untuk categories
CREATE POLICY "Allow full access based on organization" ON public.categories FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy untuk grades
CREATE POLICY "Allow full access based on organization" ON public.grades FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy untuk aromas
CREATE POLICY "Allow full access based on organization" ON public.aromas FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy untuk bottle_sizes
CREATE POLICY "Allow full access based on organization" ON public.bottle_sizes FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy untuk recipes (bergantung pada grade, aroma, bottle_size)
CREATE POLICY "Allow access based on components" ON public.recipes FOR ALL
USING (
    (SELECT organization_id FROM public.grades WHERE id = grade_id) = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    (SELECT organization_id FROM public.grades WHERE id = grade_id) = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy untuk expenses
CREATE POLICY "Allow full access based on organization" ON public.expenses FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy untuk settings
CREATE POLICY "Allow full access based on organization" ON public.settings FOR ALL
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

