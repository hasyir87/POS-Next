-- Disables all security policies for the current session, allowing for administrative tasks.
ALTER ROLE authenticated NOBYPASSRLS;
ALTER ROLE service_role BYPASSRLS;

-- Drop existing objects in reverse order of dependency to avoid errors.
-- Drop dependent tables first.
DROP TABLE IF EXISTS public.transaction_items CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.recipes CASCADE;
DROP TABLE IF EXISTS public.promotions CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.raw_materials CASCADE;
-- Drop independent tables last.
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.aromas CASCADE;
DROP TABLE IF EXISTS public.bottle_sizes CASCADE;
DROP TABLE IF EXISTS public.grades CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- Drop functions and types if they exist, using CASCADE to handle dependencies.
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_organization_id() CASCADE;
DROP FUNCTION IF EXISTS public.signup_owner(text,text,text,text) CASCADE;
DROP FUNCTION IF EXISTS public.process_checkout(uuid,uuid,uuid,jsonb,numeric,text) CASCADE;
DROP FUNCTION IF EXISTS public.get_dashboard_analytics(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.exec_sql(text) CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.payment_method CASCADE;
DROP TYPE IF EXISTS public.transaction_status CASCADE;
DROP TYPE IF EXISTS public.promotion_type CASCADE;

-- Recreate types and tables.
-- Custom ENUM types for specific columns.
CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'cashier', 'superadmin');
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'transfer', 'e_wallet', 'qris', 'debit');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE public.promotion_type AS ENUM ('Persentase', 'Nominal', 'BOGO');

-- Table for organizations (tenants).
CREATE TABLE public.organizations (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    address text,
    phone text,
    logo_url text,
    parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    is_setup_complete boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.organizations IS 'Stores organization or tenant-specific information.';

-- Table for user profiles, linked to auth.users and organizations.
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE,
    full_name text,
    avatar_url text,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
    role public.user_role NOT NULL DEFAULT 'cashier',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.profiles IS 'Stores public-facing profile data for each user, linking them to an organization and role.';

-- Table for product categories.
CREATE TABLE public.categories (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table for finished products.
CREATE TABLE public.products (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric NOT NULL,
    stock integer NOT NULL DEFAULT 0,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    tokopedia_product_id text,
    shopee_product_id text
);

-- Table for raw materials inventory.
CREATE TABLE public.raw_materials (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    brand text,
    quantity numeric NOT NULL DEFAULT 0,
    unit text NOT NULL,
    category text,
    purchase_price numeric NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table for customers (members).
CREATE TABLE public.customers (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    loyalty_points integer NOT NULL DEFAULT 0,
    transaction_count integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table for transaction headers.
CREATE TABLE public.transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cashier_id uuid NOT NULL REFERENCES public.profiles(id),
    customer_id uuid REFERENCES public.customers(id),
    total_amount numeric NOT NULL,
    payment_method public.payment_method NOT NULL,
    status public.transaction_status NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    marketplace_order_id text,
    marketplace_name text
);

-- Table for transaction line items.
CREATE TABLE public.transaction_items (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id),
    raw_material_id uuid REFERENCES public.raw_materials(id),
    quantity integer NOT NULL,
    price numeric NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table for promotions.
CREATE TABLE public.promotions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    type public.promotion_type NOT NULL,
    value numeric NOT NULL,
    get_product_id uuid REFERENCES public.products(id),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tables for custom refill system.
CREATE TABLE public.grades (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    price_multiplier numeric NOT NULL DEFAULT 1.0,
    extra_essence_price numeric NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.aromas (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    category text,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.bottle_sizes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    size numeric NOT NULL,
    unit text NOT NULL,
    price numeric NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.recipes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text,
    grade_id uuid NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
    aroma_id uuid NOT NULL REFERENCES public.aromas(id) ON DELETE CASCADE,
    bottle_size_id uuid NOT NULL REFERENCES public.bottle_sizes(id) ON DELETE CASCADE,
    price numeric NOT NULL,
    instructions text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table for business expenses.
CREATE TABLE public.expenses (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date date NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    amount numeric NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table for generic settings.
CREATE TABLE public.settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    key text NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Function to execute arbitrary SQL (for setup purposes).
CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- Function to get the organization ID for the currently authenticated user.
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = auth.uid();
$$;

-- Function to automatically create a profile when a new user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER -- This function runs with the privileges of the user that created it.
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$;

-- Trigger to call handle_new_user on new user creation in auth.users.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RPC function for owner signup, ensuring atomicity.
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
    v_organization_id uuid;
BEGIN
    -- Check if organization name already exists
    IF EXISTS (SELECT 1 FROM public.organizations WHERE name = p_organization_name) THEN
        RAISE EXCEPTION 'org_exists: Nama organisasi ini sudah digunakan.';
    END IF;

    -- Create user in auth.users
    v_user_id := auth.uid() FROM auth.users WHERE email = p_email;
    IF v_user_id IS NOT NULL THEN
        RAISE EXCEPTION 'user_exists: Pengguna dengan email ini sudah ada.';
    END IF;
    
    INSERT INTO auth.users (id, email, password, raw_user_meta_data)
    VALUES (gen_random_uuid(), p_email, crypt(p_password, gen_salt('bf')), jsonb_build_object('full_name', p_full_name));

    v_user_id := auth.uid() FROM auth.users WHERE email = p_email;

    -- Create new organization
    INSERT INTO public.organizations (name)
    VALUES (p_organization_name)
    RETURNING id INTO v_organization_id;

    -- Update the new user's profile with the organization and owner role
    UPDATE public.profiles
    SET organization_id = v_organization_id, role = 'owner'
    WHERE id = v_user_id;
END;
$$;

-- RPC function to process a checkout transaction atomically.
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
BEGIN
    -- Create the main transaction record
    INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method::payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    -- Insert transaction items and update stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
        VALUES (v_transaction_id, (v_item->>'product_id')::uuid, (v_item->>'quantity')::int, (v_item->>'price')::numeric);

        UPDATE public.products
        SET stock = stock - (v_item->>'quantity')::int
        WHERE id = (v_item->>'product_id')::uuid;
    END LOOP;

    -- Update customer transaction count if a customer is linked
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id;
    END IF;

    RETURN v_transaction_id;
END;
$$;

-- Enable Row-Level Security (RLS) for all relevant tables.
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

-- RLS Policies
-- Users can only see and manage data belonging to their own organization.
CREATE POLICY "Users can manage data for their own organization" ON public.organizations
FOR ALL USING (id = get_my_organization_id() OR id IN (SELECT org.id FROM public.organizations org JOIN public.profiles p ON org.parent_organization_id = p.organization_id WHERE p.id = auth.uid()));

CREATE POLICY "Admins can manage profiles in their organization" ON public.profiles
FOR ALL USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization" ON public.products
FOR ALL USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization" ON public.raw_materials
FOR ALL USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization" ON public.customers
FOR ALL USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization" ON public.transactions
FOR ALL USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization" ON public.transaction_items
FOR ALL USING (transaction_id IN (SELECT id FROM public.transactions WHERE organization_id = get_my_organization_id()));

CREATE POLICY "Users can manage data for their own organization" ON public.promotions
FOR ALL USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization" ON public.categories
FOR ALL USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization" ON public.grades
FOR ALL USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization" ON public.aromas
FOR ALL USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization" ON public.bottle_sizes
FOR ALL USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization" ON public.recipes
FOR ALL USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization" ON public.expenses
FOR ALL USING (organization_id = get_my_organization_id());

CREATE POLICY "Users can manage data for their own organization" ON public.settings
FOR ALL USING (organization_id = get_my_organization_id());
