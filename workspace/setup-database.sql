
-- ScentPOS Database Setup Script
-- Version: 1.0
-- This script is IDEMPOTENT, meaning it can be run multiple times safely.
-- It will completely wipe and recreate the public schema's tables, policies, and functions.

-- 1. CLEANUP PHASE
-- Drop all policies, tables, and types if they exist.
-- The order is important due to dependencies.

-- Disable RLS on all tables to allow dropping
ALTER TABLE IF EXISTS public.transaction_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.raw_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promotions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.grades DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bottle_sizes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.aromas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organizations DISABLE ROW LEVEL SECURITY;


-- Drop Tables (CASCADE will handle dependent objects like policies, foreign keys)
DROP TABLE IF EXISTS public.transaction_items CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.recipes CASCADE;
DROP TABLE IF EXISTS public.raw_materials CASCADE;
DROP TABLE IF EXISTS public.promotions CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.grades CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.bottle_sizes CASCADE;
DROP TABLE IF EXISTS public.aromas CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- Drop Custom Types
DROP TYPE IF EXISTS public.user_role;
DROP TYPE IF EXISTS public.promotion_type;
DROP TYPE IF EXISTS public.transaction_status;
DROP TYPE IF EXISTS public.payment_method;

-- Drop Functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.signup_owner(text,text,text,text);
DROP FUNCTION IF EXISTS public.process_checkout(uuid,uuid,uuid,jsonb,numeric,text);


-- 2. CREATION PHASE

-- Create Custom ENUM Types
CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'cashier', 'superadmin');
CREATE TYPE public.promotion_type AS ENUM ('Persentase', 'Nominal', 'BOGO');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'transfer', 'e_wallet', 'qris', 'debit');

-- Create Tables
CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    address text,
    phone text,
    logo_url text,
    parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    is_setup_complete boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.organizations IS 'Stores data for each business entity (main store or outlets).';

CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE,
    full_name text,
    avatar_url text,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.profiles IS 'Connects auth.users to organizations and roles.';


CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL DEFAULT 0,
    stock integer NOT NULL DEFAULT 0,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url text,
    tokopedia_product_id text,
    shopee_product_id text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.raw_materials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    brand text,
    quantity numeric NOT NULL DEFAULT 0,
    unit text NOT NULL,
    category text,
    purchase_price numeric(10,2) NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    loyalty_points integer NOT NULL DEFAULT 0,
    transaction_count integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(organization_id, email),
    UNIQUE(organization_id, phone)
);

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cashier_id uuid NOT NULL REFERENCES public.profiles(id),
    customer_id uuid REFERENCES public.customers(id),
    total_amount numeric(12,2) NOT NULL,
    payment_method payment_method NOT NULL,
    status transaction_status NOT NULL DEFAULT 'completed',
    marketplace_order_id text,
    marketplace_name text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.transaction_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id),
    raw_material_id uuid REFERENCES public.raw_materials(id),
    quantity integer NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.promotions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    type promotion_type NOT NULL,
    value numeric NOT NULL,
    get_product_id uuid REFERENCES public.products(id),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.grades (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    price_multiplier numeric(4,2) NOT NULL DEFAULT 1.0,
    extra_essence_price numeric(10,2) NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.aromas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    category text,
    description text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.bottle_sizes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    size integer NOT NULL,
    unit text NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.recipes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    grade_id uuid NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
    aroma_id uuid NOT NULL REFERENCES public.aromas(id) ON DELETE CASCADE,
    bottle_size_id uuid NOT NULL REFERENCES public.bottle_sizes(id) ON DELETE CASCADE,
    price numeric(10,2) NOT NULL,
    instructions text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);


CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date date NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    amount numeric(12,2) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);


CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key text NOT NULL,
    value text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(organization_id, key)
);


-- 3. RLS POLICIES
-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aromas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bottle_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;


-- Function to get user's organization_id
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- RLS Policies
CREATE POLICY "Allow all access to own organization" ON public.organizations
    FOR ALL
    USING (id = public.get_my_organization_id());

CREATE POLICY "Allow users to see their own profile" ON public.profiles
    FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Allow users to see other profiles in their own organization" ON public.profiles
    FOR SELECT
    USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Allow owners and admins to update profiles in their org" ON public.profiles
    FOR UPDATE
    USING (organization_id = public.get_my_organization_id() AND (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('owner', 'admin')
    ));


-- Generic policy for all other tables
CREATE POLICY "Allow full access to own organization data" ON public.products FOR ALL USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Allow full access to own organization data" ON public.raw_materials FOR ALL USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Allow full access to own organization data" ON public.customers FOR ALL USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Allow full access to own organization data" ON public.transactions FOR ALL USING (organization_id = public.get_my_organization_id());
-- Note: transaction_items is implicitly protected by the policy on transactions through joins.
CREATE POLICY "Allow full access to own organization data" ON public.promotions FOR ALL USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Allow full access to own organization data" ON public.grades FOR ALL USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Allow full access to own organization data" ON public.aromas FOR ALL USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Allow full access to own organization data" ON public.bottle_sizes FOR ALL USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Allow full access to own organization data" ON public.recipes FOR ALL USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Allow full access to own organization data" ON public.expenses FOR ALL USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Allow full access to own organization data" ON public.settings FOR ALL USING (organization_id = public.get_my_organization_id());
CREATE POLICY "Allow full access to own organization data" ON public.categories FOR ALL USING (organization_id = public.get_my_organization_id());

-- 4. DATABASE FUNCTIONS

-- Function to create profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'cashier'); -- Default role
  RETURN new;
END;
$$;

-- Trigger for the function above
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Function for a new owner to sign up
CREATE OR REPLACE FUNCTION public.signup_owner(
    p_email text,
    p_password text,
    p_full_name text,
    p_organization_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_org_id uuid;
    v_encrypted_password text;
BEGIN
    -- Check for existing organization
    IF EXISTS (SELECT 1 FROM public.organizations WHERE name = p_organization_name) THEN
        RAISE EXCEPTION 'org_exists';
    END IF;

    -- Create user in auth.users
    v_user_id := auth.uid FROM auth.users WHERE email = p_email;
    IF v_user_id IS NOT NULL THEN
        RAISE EXCEPTION 'user_exists';
    END IF;
    
    v_user_id := extensions.uuid_generate_v4();
    v_encrypted_password := crypt(p_password, gen_salt('bf'));

    INSERT INTO auth.users (id, email, encrypted_password, aud, role)
    VALUES (v_user_id, p_email, v_encrypted_password, 'authenticated', 'authenticated');


    -- Create organization
    INSERT INTO public.organizations (name)
    VALUES (p_organization_name)
    RETURNING id INTO v_org_id;

    -- Create profile
    INSERT INTO public.profiles (id, email, full_name, organization_id, role)
    VALUES (v_user_id, p_email, p_full_name, v_org_id, 'owner');
    
    RETURN json_build_object('user_id', v_user_id, 'organization_id', v_org_id);
END;
$$;

-- Function to process checkout
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
BEGIN
    -- Insert transaction header
    INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method::payment_method)
    RETURNING id INTO v_transaction_id;

    -- Loop through items and insert them, then update stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::uuid;
        v_quantity := (v_item->>'quantity')::integer;

        -- Insert transaction item
        INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
        VALUES (v_transaction_id, v_product_id, v_quantity, (v_item->>'price')::numeric);

        -- Update product stock
        UPDATE public.products
        SET stock = stock - v_quantity
        WHERE id = v_product_id;
    END LOOP;

    -- Update customer transaction count if a customer was provided
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id;
    END IF;

    RETURN v_transaction_id;
END;
$$;

-- Grant usage on schema and tables to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant usage on sequences if any
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;


-- Finalization Message
SELECT 'ScentPOS Database Setup Complete.' as status;
