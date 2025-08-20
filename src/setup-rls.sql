-- --------------------------------------------------------------------------------
-- 0. CLEANUP - Hapus semua objek yang ada untuk memastikan skrip bisa dijalankan ulang
-- --------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.signup_owner(text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.process_checkout(uuid, uuid, uuid, jsonb, numeric, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_dashboard_analytics(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.exec_sql(text) CASCADE;

-- --------------------------------------------------------------------------------
-- 1. AUTH HELPER - Fungsi untuk menangani pengguna baru
-- --------------------------------------------------------------------------------

-- Fungsi ini akan dijalankan oleh trigger setiap kali ada user baru dibuat di auth.users.
-- Tugasnya adalah menyalin data user (id, email, dll) ke tabel public.profiles kita.
create or replace function public.handle_new_user() 
returns trigger 
language plpgsql 
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

-- Trigger yang memanggil fungsi di atas setelah ada user baru.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- --------------------------------------------------------------------------------
-- 2. SIGNUP - Fungsi untuk mendaftarkan pemilik, organisasi, dan profilnya sekaligus.
-- --------------------------------------------------------------------------------
create or replace function public.signup_owner(
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
  user_id uuid;
  org_id uuid;
  existing_org_id uuid;
  existing_user_id uuid;
begin
  -- 1. Validasi Nama Organisasi: Periksa apakah nama organisasi sudah ada.
  -- Menggunakan SELECT INTO dengan FOUND adalah cara yang lebih efisien dan andal.
  SELECT id INTO existing_org_id FROM public.organizations WHERE name = p_organization_name;
  IF FOUND THEN
    RAISE EXCEPTION 'org_exists: Nama organisasi ini sudah digunakan.';
  END IF;

  -- 2. Validasi Email Pengguna: Periksa apakah email sudah terdaftar di auth.users.
  SELECT id INTO existing_user_id FROM auth.users WHERE email = p_email;
  IF FOUND THEN
    RAISE EXCEPTION 'user_exists: Pengguna dengan email ini sudah ada.';
  END IF;

  -- 3. Buat Pengguna Baru di Supabase Auth:
  -- Kita menyertakan full_name di meta data agar bisa diambil oleh trigger handle_new_user.
  user_id := auth.uid() FROM auth.users WHERE id = auth.uid();
  IF user_id IS NULL THEN
     RAISE EXCEPTION 'Could not get user id';
  END IF;


  -- 4. Buat Organisasi Baru:
  -- is_setup_complete di-set ke false, akan di-update setelah owner menyelesaikan wizard setup.
  insert into public.organizations (name, is_setup_complete)
  values (p_organization_name, false)
  returning id into org_id;

  -- 5. Perbarui Profil Pengguna yang Baru Dibuat:
  -- Trigger handle_new_user sudah membuat entri profil dasar.
  -- Sekarang kita update dengan role 'owner' dan organization_id.
  update public.profiles
  set 
    organization_id = org_id,
    role = 'owner',
    full_name = p_full_name
  where id = user_id;

end;
$$;


-- --------------------------------------------------------------------------------
-- 3. CHECKOUT - Fungsi untuk memproses transaksi checkout secara atomik.
-- --------------------------------------------------------------------------------
create or replace function public.process_checkout(
    p_organization_id uuid,
    p_cashier_id uuid,
    p_customer_id uuid,
    p_items jsonb,
    p_total_amount numeric,
    p_payment_method text
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_transaction_id uuid;
  item jsonb;
  v_product_id uuid;
  v_quantity int;
begin
  -- 1. Buat record transaksi utama
  insert into public.transactions (organization_id, cashier_id, customer_id, total_amount, payment_method, status)
  values (p_organization_id, p_cashier_id, p_customer_id, p_total_amount, p_payment_method::payment_method, 'completed')
  returning id into v_transaction_id;

  -- 2. Loop melalui setiap item di keranjang dan masukkan ke transaction_items
  for item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (item->>'product_id')::uuid;
    v_quantity := (item->>'quantity')::int;

    insert into public.transaction_items (transaction_id, product_id, quantity, price)
    values (v_transaction_id, v_product_id, v_quantity, (item->>'price')::numeric);

    -- 3. Kurangi stok produk yang relevan
    update public.products
    set stock = stock - v_quantity
    where id = v_product_id;
  end loop;

  -- 4. Jika ada customer_id, update jumlah transaksinya
  if p_customer_id is not null then
    update public.customers
    set transaction_count = transaction_count + 1
    where id = p_customer_id;
  end if;

  return v_transaction_id;
end;
$$;


-- --------------------------------------------------------------------------------
-- 4. ANALYTICS - Fungsi untuk mengambil data analitik dasbor
-- --------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_analytics(p_organization_id uuid)
RETURNS TABLE(
    daily_revenue numeric,
    daily_sales_count bigint,
    new_customers_today bigint,
    top_selling_products jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH daily_transactions AS (
        SELECT *
        FROM public.transactions
        WHERE organization_id = p_organization_id
          AND created_at >= date_trunc('day', now() AT TIME ZONE 'utc')
          AND created_at < date_trunc('day', now() AT TIME ZONE 'utc') + interval '1 day'
    )
    SELECT
        (SELECT COALESCE(SUM(total_amount), 0) FROM daily_transactions) AS daily_revenue,
        (SELECT COUNT(*) FROM daily_transactions) AS daily_sales_count,
        (SELECT COUNT(*) FROM public.customers WHERE organization_id = p_organization_id AND created_at >= date_trunc('day', now() AT TIME ZONE 'utc')) AS new_customers_today,
        (
            SELECT jsonb_agg(top_products)
            FROM (
                SELECT
                    p.name,
                    SUM(ti.quantity) as sales
                FROM public.transaction_items ti
                JOIN public.transactions t ON ti.transaction_id = t.id
                JOIN public.products p ON ti.product_id = p.id
                WHERE t.organization_id = p_organization_id
                GROUP BY p.name
                ORDER BY sales DESC
                LIMIT 5
            ) top_products
        ) AS top_selling_products;
END;
$$;

-- --------------------------------------------------------------------------------
-- 5. SQL EXEC HELPER - Fungsi untuk menjalankan skrip SQL dari file
-- --------------------------------------------------------------------------------
create or replace function exec_sql(sql text) returns void as $$
begin
  execute sql;
end;
$$ language plpgsql;
