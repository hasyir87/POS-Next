import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';
import { supabaseAdmin } from '@/lib/supabase-admin';

type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
type TransactionItemInsert = Database['public']['Tables']['transaction_items']['Insert'];

// --- GET: Mengambil transaksi untuk organisasi pengguna yang sedang login ---
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

  try {
    // 1. Dapatkan sesi dan profil pengguna yang terpercaya
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role') // Ambil juga role untuk kemungkinan validasi
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile || !profile.organization_id) {
      return NextResponse.json({ error: 'Profile or organization not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');

    // 2. Query transaksi dengan MEMAKSA organization_id dari profil pengguna
    let query = supabase
      .from('transactions')
      .select(`
        id,
        organization_id,
        cashier_id,
        total_amount,
        payment_method,
        status,
        created_at,
        profiles!transactions_cashier_id_fkey (id, full_name, email),
        transaction_items (
          id,
          product_id,
          quantity,
          price,
          products (id, name, description)
        )
      `)
      .eq('organization_id', profile.organization_id); // FIX: Menggunakan organization_id dari sesi, BUKAN dari URL

    if (status) {
      query = query.eq('status', status);
    }
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: transactions, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    return NextResponse.json({ transactions });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// --- POST: Membuat transaksi baru untuk organisasi pengguna ---
export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile || !profile.organization_id) {
      return NextResponse.json({ error: 'Profile or organization not found.' }, { status: 404 });
    }

    const body: Omit<TransactionInsert, 'organization_id' | 'cashier_id'> & { items: Omit<TransactionItemInsert, 'transaction_id'>[] } = await request.json();

    if (!body.total_amount || !body.payment_method || !body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields or items' }, { status: 400 });
    }

    // FIX: organization_id dan cashier_id diambil dari sesi, bukan dari body request
    const transactionToInsert: TransactionInsert = {
      ...body,
      organization_id: profile.organization_id,
      cashier_id: session.user.id,
      status: body.status || 'completed',
    };

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert([transactionToInsert])
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
    }

    const transactionItems = body.items.map(item => ({
      ...item,
      transaction_id: transaction.id,
    }));

    const { data: items, error: itemsError } = await supabase
      .from('transaction_items')
      .insert(transactionItems)
      .select(`*`);

    if (itemsError) {
      console.error('Error creating transaction items:', itemsError);
      await supabase.from('transactions').delete().eq('id', transaction.id);
      return NextResponse.json({ error: 'Failed to create transaction items' }, { status: 500 });
    }

    // Menggunakan supabaseAdmin HANYA untuk memanggil RPC yang mungkin butuh privilese lebih tinggi
    for (const item of body.items) {
      const { error: stockError } = await supabaseAdmin.rpc('update_product_stock', {
        p_product_id: item.product_id, // pastikan nama parameter sesuai dengan di fungsi RPC
        p_quantity_sold: item.quantity,
      });

      if (stockError) {
        console.error('Error updating product stock:', stockError);
        // Implementasi rollback yang lebih baik mungkin diperlukan di produksi
      }
    }

    return NextResponse.json({
      transaction: { ...transaction, transaction_items: items }
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
