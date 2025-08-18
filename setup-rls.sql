
-- Helper function to execute raw SQL
-- This is more robust than trying to parse SQL in a Node.js script.
create or replace function exec_sql(sql text)
returns void
language plpgsql
as $$
begin
    execute sql;
end;
$$;


-- Enable Row Level Security
alter table profiles enable row level security;
alter table organizations enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table transactions enable row level security;
alter table transaction_items enable row level security;
alter table promotions enable row level security;
alter table categories enable row level security;
alter table grades enable row level security;
alter table aromas enable row level security;
alter table bottle_sizes enable row level security;
alter table recipes enable row level security;
alter table expenses enable row level security;
alter table settings enable row level security;
alter table raw_materials enable row level security;

-- Drop existing policies and triggers if they exist, to make the script idempotent
drop policy if exists "Profiles are viewable by users who created them." on profiles;
drop policy if exists "Users can insert their own profile." on profiles;
drop policy if exists "Users can update their own profile." on profiles;
drop policy if exists "Organizations are viewable by users who are members of them." on organizations;
drop policy if exists "Owners can update their own organization." on organizations;
drop policy if exists "Users can view data for their own organization" on products;
drop policy if exists "Users can manage data for their own organization" on products;

-- Create policies for profiles
create policy "Profiles are viewable by users who created them." on profiles for select using (auth.uid() = id);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile." on profiles for update using (auth.uid() = id);

-- Create policies for organizations
create policy "Organizations are viewable by users who are members of them." on organizations for select using (
  id in (
    select organization_id from profiles where profiles.id = auth.uid()
  )
);
create policy "Owners can update their own organization." on organizations for update using (
  id in (
    select organization_id from profiles where profiles.id = auth.uid() and role = 'owner'
  )
);

-- Generic policies for organization data
create policy "Users can view data for their own organization" on products for select using (organization_id in (select organization_id from profiles where id = auth.uid()));
create policy "Users can manage data for their own organization" on products for insert with check (organization_id in (select organization_id from profiles where id = auth.uid()));
create policy "Users can manage data for their own organization" on products for update using (organization_id in (select organization_id from profiles where id = auth.uid()));
create policy "Users can manage data for their own organization" on products for delete using (organization_id in (select organization_id from profiles where id = auth.uid()));

-- Apply the same generic policies to all other organization-specific tables
-- You can expand this to other tables as needed by uncommenting and adjusting
-- Note: Re-using policy names on different tables is fine.
create policy "Users can view data for their own organization" on customers for select using (organization_id in (select organization_id from profiles where id = auth.uid()));
create policy "Users can manage data for their own organization" on customers for insert with check (organization_id in (select organization_id from profiles where id = auth.uid()));

create policy "Users can view data for their own organization" on transactions for select using (organization_id in (select organization_id from profiles where id = auth.uid()));
create policy "Users can manage data for their own organization" on transactions for insert with check (organization_id in (select organization_id from profiles where id = auth.uid()));

create policy "Users can view data for their own organization" on promotions for select using (organization_id in (select organization_id from profiles where id = auth.uid()));
create policy "Users can manage data for their own organization" on promotions for insert with check (organization_id in (select organization_id from profiles where id = auth.uid()));

-- Add more policies for other tables here...
create policy "Users can view data for their own organization" on raw_materials for select using (organization_id in (select organization_id from profiles where id = auth.uid()));
create policy "Users can manage data for their own organization" on raw_materials for insert with check (organization_id in (select organization_id from profiles where id = auth.uid()));
create policy "Users can manage data for their own organization" on raw_materials for update using (organization_id in (select organization_id from profiles where id = auth.uid()));
create policy "Users can manage data for their own organization" on raw_materials for delete using (organization_id in (select organization_id from profiles where id = auth.uid()));

-- Function and Trigger to create a profile when a new user signs up
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'owner');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RPC Function for Owner Signup
drop function if exists public.signup_owner;

create function public.signup_owner(
    p_email text,
    p_password text,
    p_full_name text,
    p_organization_name text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
    new_user_id uuid;
    new_organization_id uuid;
begin
    -- Check if organization name already exists
    if exists (select 1 from organizations where name = p_organization_name) then
        raise exception 'org_exists';
    end if;

    -- Create the user in auth.users
    new_user_id := auth.uid();

    -- Create the organization
    insert into public.organizations (name)
    values (p_organization_name)
    returning id into new_organization_id;

    -- Update the user's profile with the new organization ID
    -- The handle_new_user trigger has already created a basic profile.
    update public.profiles
    set organization_id = new_organization_id,
        full_name = p_full_name, -- Ensure full_name is set here
        role = 'owner'
    where id = new_user_id;

exception
    when unique_violation then
        -- This will catch if the email already exists from auth.users
        raise exception 'user_exists';
    when others then
        -- If any other error occurs, re-raise it
        raise;
end;
$$;

-- Function to update product stock
create or replace function public.update_product_stock(p_product_id uuid, p_quantity_sold int)
returns void as $$
begin
  update public.products
  set stock = stock - p_quantity_sold
  where id = p_product_id;
end;
$$ language plpgsql;

-- Function to handle the checkout process
create or replace function public.process_checkout(
    p_organization_id uuid,
    p_cashier_id uuid,
    p_customer_id uuid,
    p_items json,
    p_total_amount numeric,
    p_payment_method text
)
returns uuid as $$
declare
    v_transaction_id uuid;
    item record;
begin
    -- Create a new transaction
    insert into public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
    values (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method::payment_method, 'completed')
    returning id into v_transaction_id;

    -- Loop through items and insert into transaction_items and update stock
    for item in select * from json_to_recordset(p_items) as x(product_id uuid, quantity int, price numeric)
    loop
        insert into public.transaction_items (transaction_id, product_id, quantity, price)
        values (v_transaction_id, item.product_id, item.quantity, item.price);

        -- Update product stock
        perform public.update_product_stock(item.product_id, item.quantity);
    end loop;
    
    -- If a customer was part of the transaction, update their transaction count
    if p_customer_id is not null then
      update public.customers
      set transaction_count = transaction_count + 1
      where id = p_customer_id;
    end if;

    return v_transaction_id;
end;
$$ language plpgsql;

-- Function to get dashboard analytics
create or replace function public.get_dashboard_analytics(p_organization_id uuid)
returns table (
    daily_revenue numeric,
    daily_sales_count int,
    new_customers_today int,
    top_selling_products json
) as $$
begin
    return query
    with daily_transactions as (
        select * from transactions
        where organization_id = p_organization_id
          and created_at >= date_trunc('day', now())
    )
    select
        (select coalesce(sum(total_amount), 0) from daily_transactions) as daily_revenue,
        (select count(*)::int from daily_transactions) as daily_sales_count,
        (select count(*)::int from customers where organization_id = p_organization_id and created_at >= date_trunc('day', now())) as new_customers_today,
        (
            select json_agg(top_products)
            from (
                select p.name, count(ti.product_id)::int as sales
                from transaction_items ti
                join products p on ti.product_id = p.id
                join transactions t on ti.transaction_id = t.id
                where t.organization_id = p_organization_id
                group by p.name
                order by sales desc
                limit 5
            ) as top_products
        ) as top_selling_products;
end;
$$ language plpgsql;
