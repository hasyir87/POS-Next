
-- Ekstensi untuk UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fungsi untuk mengeksekusi SQL dinamis (hanya untuk superadmin)
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT) RETURNS VOID AS $$
BEGIN
    IF (
        SELECT rolsuper
        FROM pg_roles
        WHERE rolname = current_user
    ) THEN
        EXECUTE sql;
    ELSE
        RAISE EXCEPTION 'Hanya superuser yang dapat menjalankan perintah ini';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Hapus trigger dan fungsi lama jika ada
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user;

-- Fungsi untuk mendapatkan peran pengguna dari custom claims di token JWT
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT raw_app_meta_data->>'role'
    INTO v_role
    FROM auth.users
    WHERE id = p_user_id;
    RETURN v_role;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL; -- Mengembalikan NULL jika terjadi error
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


--
-- ORGANIZATIONS RLS
--
-- 1. Aktifkan RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
-- 2. Owner & Admin bisa melihat semua data organisasi di dalam hierarki mereka (induk & semua outletnya)
DROP POLICY IF EXISTS "Organizations are viewable by owner and admin" ON organizations;
CREATE POLICY "Organizations are viewable by owner and admin" ON organizations
  FOR SELECT USING (
    id IN (
        WITH RECURSIVE org_hierarchy AS (
            SELECT o.id
            FROM organizations o
            JOIN profiles p ON o.id = p.organization_id
            WHERE p.id = auth.uid()
            
            UNION
            
            SELECT o.id
            FROM organizations o
            JOIN org_hierarchy oh ON o.parent_organization_id = oh.id
        )
        SELECT id FROM org_hierarchy
    )
  );

-- 3. Owner & Superadmin bisa membuat organisasi
DROP POLICY IF EXISTS "Owners and Superadmins can create organizations" ON organizations;
CREATE POLICY "Owners and Superadmins can create organizations" ON organizations
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('owner', 'superadmin')
  );

-- 4. Owner & Superadmin bisa mengupdate organisasi mereka
DROP POLICY IF EXISTS "Owners and Superadmins can update their organizations" ON organizations;
CREATE POLICY "Owners and Superadmins can update their organizations" ON organizations
  FOR UPDATE USING (
    get_user_role(auth.uid()) IN ('owner', 'superadmin')
  );


--
-- PROFILES RLS
--
-- 1. Aktifkan RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Pengguna bisa melihat profil mereka sendiri
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 3. Superadmin bisa melihat semua profil
DROP POLICY IF EXISTS "Superadmins can view all profiles" ON profiles;
CREATE POLICY "Superadmins can view all profiles" ON profiles
  FOR SELECT USING (get_user_role(auth.uid()) = 'superadmin');

-- 4. Pengguna bisa memperbarui profil mereka sendiri
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 5. Admin dan Owner bisa melihat profil di organisasi mereka
DROP POLICY IF EXISTS "Admins and Owners can view profiles in their organization" ON profiles;
CREATE POLICY "Admins and Owners can view profiles in their organization" ON profiles
    FOR SELECT USING (
        get_user_role(auth.uid()) IN ('admin', 'owner') AND
        organization_id IN (
             SELECT org.id FROM organizations org JOIN profiles p ON org.id = p.organization_id WHERE p.id = auth.uid()
        )
    );

-- 6. Owner dan admin bisa memperbarui profil di organisasi mereka (kecuali owner lain)
DROP POLICY IF EXISTS "Owners/Admins can update profiles in their organization" ON profiles;
CREATE POLICY "Owners/Admins can update profiles in their organization" ON profiles
  FOR UPDATE USING (
    get_user_role(auth.uid()) IN ('owner', 'admin') AND
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    ) AND
    (SELECT role FROM profiles WHERE id = profiles.id) <> 'owner'
  )
  WITH CHECK (
    get_user_role(auth.uid()) IN ('owner', 'admin') AND
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

--
-- RLS untuk semua tabel data lainnya
--
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Product policy" ON products;
CREATE POLICY "Product policy" ON products
  USING (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Raw material policy" ON raw_materials;
CREATE POLICY "Raw material policy" ON raw_materials
  USING (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customer policy" ON customers;
CREATE POLICY "Customer policy" ON customers
  USING (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  );
  
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Transaction policy" ON transactions;
CREATE POLICY "Transaction policy" ON transactions
  USING (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  );
  
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Transaction item policy" ON transaction_items;
CREATE POLICY "Transaction item policy" ON transaction_items
  USING (
    (SELECT organization_id FROM transactions t WHERE t.id = transaction_id) IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Promotion policy" ON promotions;
CREATE POLICY "Promotion policy" ON promotions
  USING (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Category policy" ON categories;
CREATE POLICY "Category policy" ON categories
  USING (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Grade policy" ON grades;
CREATE POLICY "Grade policy" ON grades
  USING (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

ALTER TABLE aromas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aroma policy" ON aromas;
CREATE POLICY "Aroma policy" ON aromas
  USING (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

ALTER TABLE bottle_sizes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bottle size policy" ON bottle_sizes;
CREATE POLICY "Bottle size policy" ON bottle_sizes
  USING (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Recipe policy" ON recipes;
CREATE POLICY "Recipe policy" ON recipes
  USING (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Expense policy" ON expenses;
CREATE POLICY "Expense policy" ON expenses
  USING (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Settings policy" ON settings;
CREATE POLICY "Settings policy" ON settings
  USING (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
    )
  );
  
-- Fungsi RPC untuk menangani checkout
CREATE OR REPLACE FUNCTION process_checkout(
    p_organization_id UUID,
    p_cashier_id UUID,
    p_customer_id UUID,
    p_items JSONB,
    p_total_amount NUMERIC,
    p_payment_method TEXT
)
RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    item RECORD;
BEGIN
    -- 1. Buat record transaksi baru
    INSERT INTO transactions(organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method::payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    -- 2. Loop melalui item dan masukkan ke transaction_items
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT, price NUMERIC)
    LOOP
        INSERT INTO transaction_items(transaction_id, product_id, quantity, price)
        VALUES (v_transaction_id, item.product_id, item.quantity, item.price);

        -- 3. Kurangi stok produk
        UPDATE products
        SET stock = stock - item.quantity
        WHERE id = item.product_id;
    END LOOP;
    
    -- 4. Update transaction count untuk customer jika ada
    IF p_customer_id IS NOT NULL THEN
        UPDATE customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id;
    END IF;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Fungsi untuk memperbarui stok produk (contoh, bisa dipanggil dari tempat lain)
CREATE OR REPLACE FUNCTION update_product_stock(p_product_id UUID, p_quantity_sold INT)
RETURNS VOID AS $$
BEGIN
    UPDATE products
    SET stock = stock - p_quantity_sold
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;


-- Add parent_organization_id to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS parent_organization_id UUID REFERENCES organizations(id);
