
-- Helper function to execute arbitrary SQL
create or replace function exec_sql(sql text) returns void as $$
begin
  execute sql;
end;
$$ language plpgsql;

-- 1. Create a function to handle new user creation and profile setup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  organization_id uuid;
  user_role public.user_role;
begin
  -- Extract role and organization_name from metadata, if they exist
  user_role := (new.raw_user_meta_data->>'role')::public.user_role;
  
  -- If the user is an owner, create a new organization for them
  if user_role = 'owner' then
    insert into public.organizations (name)
    values (new.raw_user_meta_data->>'organization_name')
    returning id into organization_id;
  else
    -- For other roles, the organization_id must be provided
    organization_id := (new.raw_user_meta_data->>'organization_id')::uuid;
  end if;
  
  -- Create a profile for the new user
  insert into public.profiles (id, full_name, email, role, organization_id)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    user_role,
    organization_id
  );
  return new;
end;
$$;


-- 2. Create a trigger to call the function when a new user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 3. Create a secure RPC function for owner signup
create or replace function public.signup_owner(
    email text,
    password text,
    full_name text,
    organization_name text
)
returns void as $$
declare
  user_id uuid;
begin
    -- Check if organization name already exists
    if exists (select 1 from public.organizations where name = organization_name) then
        raise exception 'org_exists';
    end if;

    -- Check if email already exists
    if exists (select 1 from auth.users where raw_user_meta_data->>'email' = email) then
        raise exception 'user_exists';
    end if;

    -- Create user in auth.users
    select auth.uid() into user_id from auth.users where id = auth.uid();
    
    insert into auth.users (id, email, encrypted_password, raw_user_meta_data, role, instance_id, aud)
    values (
      user_id,
      email,
      crypt(password, gen_salt('bf')),
      json_build_object(
        'full_name', full_name,
        'organization_name', organization_name,
        'role', 'owner'
      ),
      'authenticated',
      '00000000-0000-0000-0000-000000000000',
      'authenticated'
    );
end;
$$ language plpgsql security definer;


-- 4. Enable RLS on all relevant tables
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.products enable row level security;
alter table public.raw_materials enable row level security;
alter table public.customers enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.promotions enable row level security;
alter table public.categories enable row level security;
alter table public.grades enable row level security;
alter table public.aromas enable row level security;
alter table public.bottle_sizes enable row level security;
alter table public.recipes enable row level security;
alter table public.expenses enable row level security;
alter table public.settings enable row level security;

-- 5. Drop existing policies to start fresh
drop policy if exists "Allow full access to own organization" on public.profiles;
drop policy if exists "Allow read access to own profile" on public.profiles;
drop policy if exists "Allow full access for organization members" on public.organizations;
drop policy if exists "Allow full access to organization data" on public.products;
drop policy if exists "Allow full access to organization data" on public.raw_materials;
drop policy if exists "Allow full access to organization data" on public.customers;
drop policy if exists "Allow full access to organization data" on public.transactions;
drop policy if exists "Allow access based on transaction" on public.transaction_items;
drop policy if exists "Allow full access to organization data" on public.promotions;
drop policy if exists "Allow full access to organization data" on public.categories;
drop policy if exists "Allow full access to organization data" on public.grades;
drop policy if exists "Allow full access to organization data" on public.aromas;
drop policy if exists "Allow full access to organization data" on public.bottle_sizes;
drop policy if exists "Allow full access to organization data" on public.recipes;
drop policy if exists "Allow full access to organization data" on public.expenses;
drop policy if exists "Allow full access to organization data" on public.settings;

-- 6. Create RLS Policies
-- PROFILES table
create policy "Allow full access to own organization" on public.profiles
for all using (auth.uid() in (
  select id from public.profiles where organization_id = (select organization_id from public.profiles where id = auth.uid())
));

create policy "Allow read access to own profile" on public.profiles
for select using (auth.uid() = id);

-- ORGANIZATIONS table
create policy "Allow full access for organization members" on public.organizations
for all using (id in (
  select organization_id from public.profiles where id = auth.uid()
));

-- Generic policy for most tables
create policy "Allow full access to organization data" on public.products
for all using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "Allow full access to organization data" on public.raw_materials
for all using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "Allow full access to organization data" on public.customers
for all using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "Allow full access to organization data" on public.transactions
for all using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

-- TRANSACTION_ITEMS table (special case, depends on transaction)
create policy "Allow access based on transaction" on public.transaction_items
for all using (transaction_id in (
  select id from public.transactions where organization_id = (select organization_id from public.profiles where id = auth.uid())
));

create policy "Allow full access to organization data" on public.promotions
for all using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "Allow full access to organization data" on public.categories
for all using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "Allow full access to organization data" on public.grades
for all using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "Allow full access to organization data" on public.aromas
for all using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "Allow full access to organization data" on public.bottle_sizes
for all using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "Allow full access to organization data" on public.recipes
for all using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "Allow full access to organization data" on public.expenses
for all using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "Allow full access to organization data" on public.settings
for all using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

-- Function to get dashboard analytics
CREATE OR REPLACE FUNCTION get_dashboard_analytics(p_organization_id uuid)
RETURNS TABLE(daily_revenue numeric, daily_sales_count bigint, new_customers_today bigint, top_selling_products json) AS $$
BEGIN
    RETURN QUERY
    WITH daily_stats AS (
        SELECT
            COALESCE(SUM(total_amount), 0) AS revenue,
            COUNT(id) AS sales_count
        FROM transactions
        WHERE
            organization_id = p_organization_id AND
            created_at >= date_trunc('day', now() at time zone 'utc')
    ),
    new_customers AS (
        SELECT COUNT(id) AS count
        FROM customers
        WHERE
            organization_id = p_organization_id AND
            created_at >= date_trunc('day', now() at time zone 'utc')
    ),
    top_products AS (
        SELECT
            p.name,
            SUM(ti.quantity) AS sales
        FROM transaction_items ti
        JOIN products p ON ti.product_id = p.id
        JOIN transactions t ON ti.transaction_id = t.id
        WHERE t.organization_id = p_organization_id
        GROUP BY p.name
        ORDER BY sales DESC
        LIMIT 5
    )
    SELECT
        ds.revenue,
        ds.sales_count,
        nc.count,
        (SELECT json_agg(tp) FROM top_products tp)
    FROM
        daily_stats ds,
        new_customers nc;
END;
$$ LANGUAGE plpgsql;

-- Function to update product stock
CREATE OR REPLACE FUNCTION update_product_stock(p_product_id uuid, p_quantity_sold integer)
RETURNS void AS $$
BEGIN
    UPDATE products
    SET stock = stock - p_quantity_sold
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- RPC for checkout
CREATE OR REPLACE FUNCTION process_checkout(
    p_organization_id uuid,
    p_cashier_id uuid,
    p_customer_id uuid,
    p_items json,
    p_total_amount numeric,
    p_payment_method text
)
RETURNS uuid AS $$
DECLARE
    v_transaction_id uuid;
    item record;
BEGIN
    -- Insert into transactions table
    INSERT INTO transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    VALUES (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method::payment_method, 'completed')
    RETURNING id INTO v_transaction_id;

    -- Loop through items and insert into transaction_items
    FOR item IN SELECT * FROM json_to_recordset(p_items) AS x(product_id uuid, quantity integer, price numeric)
    LOOP
        INSERT INTO transaction_items (transaction_id, product_id, quantity, price)
        VALUES (v_transaction_id, item.product_id, item.quantity, item.price);

        -- Update stock
        PERFORM update_product_stock(item.product_id, item.quantity);
    END LOOP;

    -- Update customer transaction count if applicable
    IF p_customer_id IS NOT NULL THEN
        UPDATE customers
        SET transaction_count = transaction_count + 1
        WHERE id = p_customer_id;
    END IF;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;
