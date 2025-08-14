-- Fungsi untuk mengeksekusi SQL dinamis (diperlukan untuk beberapa operasi setup)
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- Hapus kebijakan yang ada sebelum membuat ulang untuk menghindari error
DO $$
BEGIN
    -- Hapus semua kebijakan RLS dari setiap tabel jika ada
    ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all for service roles" ON public.organizations;
    DROP POLICY IF EXISTS "Allow owner and admin read access" ON public.organizations;

    ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all for service roles" ON public.profiles;
    DROP POLICY IF EXISTS "Allow individual user to read and update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Allow organization owner and admin to manage users" ON public.profiles;

    ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all for service roles" ON public.products;
    DROP POLICY IF EXISTS "Allow read and write for organization members" ON public.products;
    
    ALTER TABLE public.raw_materials DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all for service roles" ON public.raw_materials;
    DROP POLICY IF EXISTS "Allow read and write for organization members" ON public.raw_materials;

    ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all for service roles" ON public.customers;
    DROP POLICY IF EXISTS "Allow read and write for organization members" ON public.customers;

    ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all for service roles" ON public.transactions;
    DROP POLICY IF EXISTS "Allow read and write for organization members" ON public.transactions;

    ALTER TABLE public.transaction_items DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all for service roles" ON public.transaction_items;
    DROP POLICY IF EXISTS "Allow read access based on transaction" ON public.transaction_items;
    
    ALTER TABLE public.promotions DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all for service roles" ON public.promotions;
    DROP POLICY IF EXISTS "Allow read and write for organization members" ON public.promotions;
    
    ALTER TABLE public.grades DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all for service roles" ON public.grades;
    DROP POLICY IF EXISTS "Allow read and write for organization members" ON public.grades;

    ALTER TABLE public.aromas DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all for service roles" ON public.aromas;
    DROP POLICY IF EXISTS "Allow read and write for organization members" ON public.aromas;

    ALTER TABLE public.bottle_sizes DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all for service roles" ON public.bottle_sizes;
    DROP POLICY IF EXISTS "Allow read and write for organization members" ON public.bottle_sizes;

    ALTER TABLE public.recipes DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all for service roles" ON public.recipes;
    DROP POLICY IF EXISTS "Allow read and write for organization members" ON public.recipes;
END;
$$;


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


-- Fungsi untuk mendapatkan ID organisasi pengguna
CREATE OR REPLACE FUNCTION public.get_user_organization_id(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
    v_org_id uuid;
BEGIN
    SELECT organization_id INTO v_org_id FROM public.profiles WHERE id = p_user_id;
    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fungsi untuk memeriksa apakah pengguna adalah admin (owner, admin, atau superadmin)
CREATE OR REPLACE FUNCTION public.is_claims_admin()
RETURNS boolean AS $$
BEGIN
    -- Logika ini hanya sebagai contoh, implementasi nyata harus lebih aman
    -- dan mungkin memeriksa peran dari tabel profiles.
    -- Untuk tujuan saat ini, kita akan memeriksa peran dari tabel profiles.
    RETURN (
        SELECT get_user_role(auth.uid())
    ) IN ('owner', 'admin', 'superadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fungsi baru untuk mendapatkan daftar pengguna yang dapat diakses
CREATE OR REPLACE FUNCTION public.get_users_in_organization(p_user_id uuid)
RETURNS TABLE(user_id uuid) AS $$
DECLARE
    v_role text;
    v_org_id uuid;
BEGIN
    SELECT role, organization_id INTO v_role, v_org_id
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_role = 'superadmin' THEN
        RETURN QUERY SELECT id FROM public.profiles;
    ELSIF v_role IN ('owner', 'admin') THEN
        RETURN QUERY SELECT id FROM public.profiles WHERE organization_id = v_org_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Aktifkan RLS dan terapkan kebijakan pada semua tabel

-- Tabel Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service roles" ON public.organizations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow owner and admin read access" ON public.organizations FOR SELECT USING (is_claims_admin());

-- Tabel Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service roles" ON public.profiles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow individual user to read and update their own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Allow organization owner and admin to manage users" ON public.profiles FOR ALL
USING (
    id IN (SELECT user_id FROM get_users_in_organization(auth.uid()))
)
WITH CHECK (
    get_user_role(auth.uid()) IN ('owner', 'admin', 'superadmin')
);


-- Tabel Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service roles" ON public.products FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow read and write for organization members" ON public.products FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- Tabel Raw Materials
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service roles" ON public.raw_materials FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow read and write for organization members" ON public.raw_materials FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- Tabel Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service roles" ON public.customers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow read and write for organization members" ON public.customers FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- Tabel Transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service roles" ON public.transactions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow read and write for organization members" ON public.transactions FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- Tabel Transaction Items
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service roles" ON public.transaction_items FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow read access based on transaction" ON public.transaction_items FOR SELECT
USING (
    (SELECT organization_id FROM transactions WHERE id = transaction_id) = get_user_organization_id(auth.uid())
);

-- Tabel Promotions
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service roles" ON public.promotions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow read and write for organization members" ON public.promotions FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- Tabel Grades
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service roles" ON public.grades FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow read and write for organization members" ON public.grades FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- Tabel Aromas
ALTER TABLE public.aromas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service roles" ON public.aromas FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow read and write for organization members" ON public.aromas FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- Tabel Bottle Sizes
ALTER TABLE public.bottle_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service roles" ON public.bottle_sizes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow read and write for organization members" ON public.bottle_sizes FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- Tabel Recipes
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service roles" ON public.recipes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow read and write for organization members" ON public.recipes FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- Tabel Expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service roles" ON public.expenses FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow read and write for organization members" ON public.expenses FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- Tabel Settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service roles" ON public.settings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow read and write for organization members" ON public.settings FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));
