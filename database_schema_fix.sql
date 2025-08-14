
-- Enable RLS for all new tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT, UPDATE, DELETE ON TABLES TO service_role;

-- Table: Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    email character varying,
    phone character varying,
    loyalty_points integer NOT NULL DEFAULT 0,
    transaction_count integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT customers_pkey PRIMARY KEY (id),
    CONSTRAINT customers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage customers in their own organization" ON public.customers FOR ALL USING (auth.uid() IN (SELECT user_id FROM get_users_in_organization(organization_id)));

-- Table: Grades (Tingkatan Parfum)
CREATE TABLE IF NOT EXISTS public.grades (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    price_multiplier numeric(5,2) NOT NULL DEFAULT 1.00,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT grades_pkey PRIMARY KEY (id),
    CONSTRAINT grades_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage grades in their own organization" ON public.grades FOR ALL USING (auth.uid() IN (SELECT user_id FROM get_users_in_organization(organization_id)));

-- Table: Aromas
CREATE TABLE IF NOT EXISTS public.aromas (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    category character varying,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT aromas_pkey PRIMARY KEY (id),
    CONSTRAINT aromas_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);
ALTER TABLE public.aromas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage aromas in their own organization" ON public.aromas FOR ALL USING (auth.uid() IN (SELECT user_id FROM get_users_in_organization(organization_id)));

-- Table: Bottle Sizes
CREATE TABLE IF NOT EXISTS public.bottle_sizes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    size integer NOT NULL,
    unit character varying NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT bottle_sizes_pkey PRIMARY KEY (id),
    CONSTRAINT bottle_sizes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);
ALTER TABLE public.bottle_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage bottle_sizes in their own organization" ON public.bottle_sizes FOR ALL USING (auth.uid() IN (SELECT user_id FROM get_users_in_organization(organization_id)));

-- Table: Recipes (Resep Parfum Kustom)
CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    grade_id uuid,
    aroma_id uuid,
    bottle_size_id uuid,
    price numeric(10,2) NOT NULL DEFAULT 0,
    instructions text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT recipes_pkey PRIMARY KEY (id),
    CONSTRAINT recipes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT recipes_grade_id_fkey FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE SET NULL,
    CONSTRAINT recipes_aroma_id_fkey FOREIGN KEY (aroma_id) REFERENCES aromas(id) ON DELETE SET NULL,
    CONSTRAINT recipes_bottle_size_id_fkey FOREIGN KEY (bottle_size_id) REFERENCES bottle_sizes(id) ON DELETE SET NULL
);
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage recipes in their own organization" ON public.recipes FOR ALL USING (auth.uid() IN (SELECT user_id FROM get_users_in_organization(organization_id)));
