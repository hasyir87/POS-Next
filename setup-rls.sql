-- =================================================================
-- == Clean Slate: Drop all objects if they exist (Idempotency) ==
-- =================================================================
-- This block ensures the script can be run multiple times without errors.
-- CASCADE will automatically remove any dependent objects like policies, triggers, etc.

DROP FUNCTION IF EXISTS public.signup_owner(text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.process_checkout(uuid, uuid, uuid, jsonb, numeric, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_product_stock(uuid, int) CASCADE;
DROP FUNCTION IF EXISTS public.exec_sql(text) CASCADE;

DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.recipes CASCADE;
DROP TABLE IF EXISTS public.bottle_sizes CASCADE;
DROP TABLE IF EXISTS public.aromas CASCADE;
DROP TABLE IF EXISTS public.grades CASCADE;
DROP TABLE IF EXISTS public.promotions CASCADE;
DROP TABLE IF EXISTS public.transaction_items CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.raw_materials CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.promotion_type CASCADE;
DROP TYPE IF EXISTS public.transaction_status CASCADE;
DROP TYPE IF EXISTS public.payment_method CASCADE;

-- =============================================
-- == Create Custom Types (Enums)            ==
-- =============================================

CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'cashier', 'superadmin');
CREATE TYPE public.promotion_type AS ENUM ('Persentase', 'Nominal', 'BOGO');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'transfer', 'e_wallet', 'qris', 'debit');

-- =============================================
-- == Create Tables                           ==
-- =============================================

-- Organizations Table: Stores data for each business entity (main store or outlet)
CREATE TABLE public.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    address text,
    phone text,
    logo_url text,
    parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    is_setup_complete boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.organizations IS 'Stores data for each business entity (main store or outlet).';

-- Profiles Table: Connects auth.users with organizations and their roles
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE,
    full_name text,
    avatar_url text,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    role public.user_role NOT NULL DEFAULT 'cashier',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.profiles IS 'Connects auth.users with organizations and their roles.';


-- Categories Table: Product categories
CREATE TABLE public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(organization_id, name)
);
COMMENT ON TABLE public.categories IS 'Product categories specific to an organization.';

-- Products Table: Finished products ready for sale
CREATE TABLE public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric NOT NULL CHECK (price >= 0),
    stock integer NOT NULL DEFAULT 0,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    tokopedia_product_id text,
    shopee_product_id text,
    UNIQUE(organization_id, name)
);
COMMENT ON TABLE public.products IS 'Finished products ready for sale in an organization.';


-- Raw Materials Table: For custom refill perfumes
CREATE TABLE public.raw_materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    brand text,
    quantity numeric NOT NULL DEFAULT 0,
    unit text NOT NULL,
    category text,
    purchase_price numeric NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.raw_materials IS 'Raw materials for custom refill perfumes.';

-- Customers Table
CREATE TABLE public.customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    loyalty_points integer NOT NULL DEFAULT 0,
    transaction_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(organization_id, phone),
    UNIQUE(organization_id, email)
);
COMMENT ON TABLE public.customers IS 'Customer database for loyalty and tracking.';

-- Transactions Table: Header for each sale
CREATE TABLE public.transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cashier_id uuid NOT NULL REFERENCES public.profiles(id),
    customer_id uuid REFERENCES public.customers(id),
    total_amount numeric NOT NULL,
    payment_method public.payment_method NOT NULL,
    status public.transaction_status NOT NULL DEFAULT 'completed',
    marketplace_order_id text,
    marketplace_name text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.transactions IS 'Header record for each sale.';

-- Transaction Items Table: Line items for each transaction
CREATE TABLE public.transaction_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id),
    raw_material_id uuid REFERENCES public.raw_materials(id),
    quantity integer NOT NULL,
    price numeric NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.transaction_items IS 'Line items for each transaction.';

-- Promotions Table
CREATE TABLE public.promotions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    type public.promotion_type NOT NULL,
    value numeric NOT NULL,
    get_product_id uuid REFERENCES public.products(id),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.promotions IS 'Promotional rules for discounts, BOGO, etc.';

-- Refill System Tables
CREATE TABLE public.grades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    price_multiplier numeric NOT NULL DEFAULT 1.0,
    extra_essence_price numeric NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.aromas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    category text,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bottle_sizes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    size integer NOT NULL,
    unit text NOT NULL,
    price numeric NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recipes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    grade_id uuid REFERENCES public.grades(id),
    aroma_id uuid REFERENCES public.aromas(id),
    bottle_size_id uuid REFERENCES public.bottle_sizes(id),
    price numeric NOT NULL,
    instructions text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Operational Tables
CREATE TABLE public.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date date NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    amount numeric NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key text NOT NULL,
    value text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(organization_id, key)
);
COMMENT ON TABLE public.settings IS 'Generic key-value store for organization-specific settings.';

-- =============================================
-- == Create Database Functions & Triggers    ==
-- =============================================

-- Function to get a user's role from their profile
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    v_role text;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
    RETURN v_role;
END;
$$;

-- Function to copy new user data to profiles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;

-- Trigger to call handle_new_user on new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- RPC function for owner signup
CREATE OR REPLACE FUNCTION public.signup_owner(
    p_email text,
    p_password text,
    p_full_name text,
    p_organization_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_org_id uuid;
BEGIN
    -- 1. Check if organization name already exists
    IF EXISTS (SELECT 1 FROM public.organizations WHERE name = p_organization_name) THEN
        RAISE EXCEPTION 'org_exists: Nama organisasi ini sudah digunakan.';
    END IF;
    
    -- 2. Check if user email already exists in auth.users
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RAISE EXCEPTION 'user_exists: Pengguna dengan email ini sudah ada.';
    END IF;

    -- 3. Create the user in auth.users
    v_user_id := auth.uid() FROM (
        SELECT auth.uid()
    );
    
    INSERT INTO auth.users (id, email, password, raw_user_meta_data, role, aud, instance_id)
    VALUES (v_user_id, p_email, crypt(p_password, gen_salt('bf')), jsonb_build_object('full_name', p_full_name), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');


    -- 4. Create the organization
    INSERT INTO public.organizations (name)
    VALUES (p_organization_name)
    RETURNING id INTO v_org_id;

    -- 5. Update the user's profile with the new organization_id and role
    -- The handle_new_user trigger will have already created the profile row
    UPDATE public.profiles
    SET
        organization_id = v_org_id,
        role = 'owner',
        full_name = p_full_name -- Make sure full_name is set here too
    WHERE id = v_user_id;
END;
$$;


-- Function to update product stock after a sale
CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Decrease stock of the sold product
    UPDATE public.products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;
    
    RETURN NEW;
END;
$$;

-- Trigger to update stock on new transaction item
CREATE TRIGGER on_new_transaction_item
    AFTER INSERT ON public.transaction_items
    FOR EACH ROW
    WHEN (NEW.product_id IS NOT NULL)
    EXECUTE FUNCTION public.update_product_stock();
    

-- RPC Function to process a checkout transaction atomically
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
    v_transaction_id uuid;
    v_item jsonb;
BEGIN
    -- 1. Insert the main transaction record
    INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method::public.payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    -- 2. Loop through items and insert them into transaction_items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
        VALUES (
            v_transaction_id,
            (v_item->>'product_id')::uuid,
            (v_item->>'quantity')::integer,
            (v_item->>'price')::numeric
        );
        -- Note: The trigger `on_new_transaction_item` will handle stock updates
    END LOOP;

    -- 3. If a customer is associated, update their transaction count
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id;
    END IF;

    RETURN v_transaction_id;
END;
$$;


-- =============================================
-- == Enable Row-Level Security (RLS)         ==
-- =============================================
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

-- =============================================
-- == Create RLS Policies                     ==
-- =============================================

-- PROFILES Table
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- ORGANIZATIONS Table
CREATE POLICY "Users can view their own organization and its children" ON public.organizations
    FOR SELECT USING (
        id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) -- User's own org
        OR parent_organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) -- Children of user's org
    );

CREATE POLICY "Owners can update their own organization" ON public.organizations
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE organization_id = public.organizations.id AND role = 'owner'
        )
    );

-- Generic policy for most data tables
CREATE POLICY "Users can view data within their own organization" ON public.products
    FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert data into their own organization" ON public.products
    FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update data in their own organization" ON public.products
    FOR UPDATE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete data from their own organization" ON public.products
    FOR DELETE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Apply the same set of policies to all other organization-specific tables
-- You can create a helper function for this in a real project to reduce repetition
CREATE POLICY "Users can view data within their own organization" ON public.raw_materials FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert data into their own organization" ON public.raw_materials FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update data in their own organization" ON public.raw_materials FOR UPDATE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete data from their own organization" ON public.raw_materials FOR DELETE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view data within their own organization" ON public.customers FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert data into their own organization" ON public.customers FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update data in their own organization" ON public.customers FOR UPDATE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete data from their own organization" ON public.customers FOR DELETE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view data within their own organization" ON public.transactions FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert data into their own organization" ON public.transactions FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update data in their own organization" ON public.transactions FOR UPDATE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete data from their own organization" ON public.transactions FOR DELETE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view data within their own organization" ON public.categories FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert data into their own organization" ON public.categories FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update data in their own organization" ON public.categories FOR UPDATE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete data from their own organization" ON public.categories FOR DELETE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view data within their own organization" ON public.promotions FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert data into their own organization" ON public.promotions FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update data in their own organization" ON public.promotions FOR UPDATE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete data from their own organization" ON public.promotions FOR DELETE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view data within their own organization" ON public.grades FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert data into their own organization" ON public.grades FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update data in their own organization" ON public.grades FOR UPDATE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete data from their own organization" ON public.grades FOR DELETE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view data within their own organization" ON public.aromas FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert data into their own organization" ON public.aromas FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update data in their own organization" ON public.aromas FOR UPDATE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete data from their own organization" ON public.aromas FOR DELETE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view data within their own organization" ON public.bottle_sizes FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert data into their own organization" ON public.bottle_sizes FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update data in their own organization" ON public.bottle_sizes FOR UPDATE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete data from their own organization" ON public.bottle_sizes FOR DELETE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view data within their own organization" ON public.recipes FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert data into their own organization" ON public.recipes FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update data in their own organization" ON public.recipes FOR UPDATE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete data from their own organization" ON public.recipes FOR DELETE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view data within their own organization" ON public.expenses FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert data into their own organization" ON public.expenses FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update data in their own organization" ON public.expenses FOR UPDATE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete data from their own organization" ON public.expenses FOR DELETE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view data within their own organization" ON public.settings FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert data into their own organization" ON public.settings FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update data in their own organization" ON public.settings FOR UPDATE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete data from their own organization" ON public.settings FOR DELETE USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Transaction Items require a special policy to be seen
CREATE POLICY "Users can view transaction items from their organization" ON public.transaction_items
    FOR SELECT USING (
        (SELECT organization_id FROM public.transactions WHERE id = transaction_id) = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

