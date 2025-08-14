
-- Hapus fungsi yang ada jika ada (opsional, untuk idempotensi)
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.get_users_in_organization(uuid);

-- Fungsi untuk mendapatkan peran pengguna dari tabel profiles
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT role
    FROM public.profiles
    WHERE id = p_user_id
  );
END;
$$;


-- Fungsi untuk mendapatkan semua ID pengguna dalam organisasi yang sama (atau semua jika superadmin)
CREATE OR REPLACE FUNCTION public.get_users_in_organization(p_user_id uuid)
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  v_organization_id uuid;
BEGIN
  -- Dapatkan peran dan ID organisasi dari pengguna yang meminta
  SELECT role, organization_id INTO v_role, v_organization_id
  FROM public.profiles
  WHERE id = p_user_id;

  -- Logika berdasarkan peran
  IF v_role = 'superadmin' THEN
    -- Superadmin dapat melihat semua pengguna
    RETURN QUERY SELECT id FROM public.profiles;
  ELSIF v_role IN ('owner', 'admin') THEN
    -- Owner/Admin dapat melihat semua pengguna di organisasi mereka
    RETURN QUERY 
    SELECT id FROM public.profiles p
    WHERE p.organization_id = v_organization_id;
  ELSE
    -- Peran lain (misalnya, kasir) tidak dapat melihat pengguna lain
    RETURN;
  END IF;
END;
$$;


-- Buat tabel customers
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    email character varying,
    phone character varying,
    loyalty_points integer NOT NULL DEFAULT 0,
    transaction_count integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Buat tabel raw_materials
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    brand character varying,
    quantity double precision NOT NULL DEFAULT 0,
    unit character varying NOT NULL,
    category character varying,
    purchase_price double precision NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Aktifkan RLS untuk setiap tabel
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aromas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bottle_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;


-- Hapus kebijakan yang ada sebelum membuat yang baru
DROP POLICY IF EXISTS "Allow full access for superadmins on organizations" ON public.organizations;
DROP POLICY IF EXISTS "Allow owner and admins to view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Allow full access for superadmins on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow owner/admin to view users in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Allow all access to own organization data" ON public.products;
DROP POLICY IF EXISTS "Allow all access to own organization data on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow all access to own organization data on transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow all access based on transaction" ON public.transaction_items;


-- Kebijakan untuk ORGANIZATIONS
CREATE POLICY "Allow full access for superadmins on organizations"
ON public.organizations FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'superadmin');

CREATE POLICY "Allow owner and admins to view their own organization"
ON public.organizations FOR SELECT
TO authenticated
USING (id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));


-- Kebijakan untuk PROFILES
CREATE POLICY "Allow full access for superadmins on profiles"
ON public.profiles FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'superadmin')
WITH CHECK (get_user_role(auth.uid()) = 'superadmin');

CREATE POLICY "Allow users to view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Allow owner/admin to view users in their organization"
ON public.profiles FOR SELECT
TO authenticated
USING (id IN (SELECT user_id FROM public.get_users_in_organization(auth.uid())));

-- Kebijakan Umum untuk Sebagian Besar Tabel Data
CREATE POLICY "Allow all access to own organization data"
ON public.products FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow all access to own organization data on customers"
ON public.customers FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow all access to own organization data on transactions"
ON public.transactions FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow all access to own organization data on promotions"
ON public.promotions FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow all access to own organization data on categories"
ON public.categories FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow all access to own organization data on raw_materials"
ON public.raw_materials FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow all access to own organization data on grades"
ON public.grades FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow all access to own organization data on aromas"
ON public.aromas FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow all access to own organization data on bottle_sizes"
ON public.bottle_sizes FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow all access to own organization data on recipes"
ON public.recipes FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow all access to own organization data on expenses"
ON public.expenses FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow all access to own organization data on settings"
ON public.settings FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));


-- Kebijakan Khusus untuk TRANSACTION_ITEMS
CREATE POLICY "Allow all access based on transaction"
ON public.transaction_items FOR ALL
TO authenticated
USING (
  transaction_id IN (
    SELECT id FROM public.transactions
    WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  transaction_id IN (
    SELECT id FROM public.transactions
    WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
);
