
-- Helper function to execute SQL
create or replace function exec_sql(sql text) returns void as $$
begin
  execute sql;
end;
$$ language plpgsql;

-- Hapus kebijakan yang ada sebelum membuat ulang
DO $$
BEGIN
   IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow organization access based on profile' AND tablename = 'organizations') THEN
      DROP POLICY "Allow organization access based on profile" ON public.organizations;
   END IF;
   IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow profile read access to their own organization' AND tablename = 'profiles') THEN
      DROP POLICY "Allow profile read access to their own organization" ON public.profiles;
   END IF;
   IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow users to update their own profile' AND tablename = 'profiles') THEN
      DROP POLICY "Allow users to update their own profile" ON public.profiles;
   END IF;
   IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all for organization members' AND tablename = 'products') THEN
      DROP POLICY "Enable all for organization members" ON public.products;
   END IF;
   IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all for organization members' AND tablename = 'customers') THEN
      DROP POLICY "Enable all for organization members" ON public.customers;
   END IF;
   IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all for organization members' AND tablename = 'promotions') THEN
      DROP POLICY "Enable all for organization members" ON public.promotions;
   END IF;
   IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all for organization members' AND tablename = 'categories') THEN
      DROP POLICY "Enable all for organization members" ON public.categories;
   END IF;
   IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all for organization members' AND tablename = 'transactions') THEN
      DROP POLICY "Enable all for organization members" ON public.transactions;
   END IF;
END
$$;

-- Enable RLS for all relevant tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aromas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bottle_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Function to get a user's role from the public profiles table
create or replace function public.get_user_role(p_user_id uuid)
returns text
language plpgsql
security definer -- Important!
set search_path = public
as $$
begin
  return (
    select role from public.profiles where id = p_user_id
  );
end;
$$;

-- Function to get all users within an organization (including sub-outlets)
create or replace function public.get_users_in_organization(organization_id uuid)
returns table (user_id uuid)
language sql
security definer
set search_path = public
as $$
  with recursive org_tree as (
    select id from organizations where id = organization_id
    union all
    select o.id from organizations o
    inner join org_tree ot on o.parent_organization_id = ot.id
  )
  select id from profiles
  where profiles.organization_id in (select id from org_tree);
$$;

-- Policies for ORGANIZATIONS table
CREATE POLICY "Allow organization access based on profile"
ON public.organizations
FOR SELECT
USING (
  id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
  OR
  parent_organization_id IN (
     SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
  OR
  'superadmin' = public.get_user_role(auth.uid())
);

-- Policies for PROFILES table
CREATE POLICY "Allow profile read access to their own organization"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IN (SELECT user_id FROM public.get_users_in_organization(organization_id))
  OR
  'superadmin' = public.get_user_role(auth.uid())
);

CREATE POLICY "Allow users to update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);


-- Generic policies for data tables
CREATE POLICY "Enable all for organization members"
ON public.products
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
);

CREATE POLICY "Enable all for organization members"
ON public.customers
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
);

CREATE POLICY "Enable all for organization members"
ON public.promotions
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
);

CREATE POLICY "Enable all for organization members"
ON public.categories
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
);

CREATE POLICY "Enable all for organization members"
ON public.transactions
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
);

CREATE POLICY "Enable all for organization members"
ON public.raw_materials
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
);

CREATE POLICY "Enable all for organization members"
ON public.grades
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
);

CREATE POLICY "Enable all for organization members"
ON public.aromas
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
);

CREATE POLICY "Enable all for organization members"
ON public.bottle_sizes
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
);

CREATE POLICY "Enable all for organization members"
ON public.recipes
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
);

CREATE POLICY "Enable all for organization members"
ON public.expenses
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
);

CREATE POLICY "Enable all for organization members"
ON public.settings
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
    'superadmin' = public.get_user_role(auth.uid())
);

CREATE POLICY "Enable all for organization members"
ON public.transaction_items
FOR ALL
USING (
  (SELECT organization_id FROM transactions WHERE id = transaction_id) = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  OR
  'superadmin' = public.get_user_role(auth.uid())
);


-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'cashier');
  return new;
end;
$$;

-- Trigger to call the function when a new user signs up
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- PostgreSQL Function for processing checkout
CREATE OR REPLACE FUNCTION public.process_checkout(
    p_organization_id uuid,
    p_cashier_id uuid,
    p_customer_id uuid,
    p_items jsonb,
    p_total_amount numeric,
    p_payment_method public.payment_method
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_transaction_id uuid;
    item record;
BEGIN
    -- 1. Create a new transaction
    INSERT INTO public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    -- 2. Loop through items and insert into transaction_items
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity int, price numeric)
    LOOP
        INSERT INTO public.transaction_items (transaction_id, product_id, quantity, price)
        VALUES (v_transaction_id, item.product_id, item.quantity, item.price);

        -- 3. Update stock for the product
        UPDATE public.products
        SET stock = stock - item.quantity
        WHERE id = item.product_id;
    END LOOP;

    -- 4. Update customer transaction count if a customer is linked
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id;
    END IF;

    -- 5. Return the new transaction ID
    RETURN v_transaction_id;
END;
$$;
