
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    // Test koneksi ke database dengan mengambil data dari tabel profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        avatar_url,
        organization_id,
        role,
        created_at,
        updated_at,
        organizations (
          id,
          name,
          address,
          phone,
          logo_url
        )
      `)
      .limit(5)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profiles', details: profilesError },
        { status: 500 }
      )
    }

    // Test tabel lainnya
    const { data: organizations, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .limit(3)

    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        stock,
        category_id,
        image_url,
        organization_id,
        categories (
          id,
          name
        )
      `)
      .limit(3)

    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from('transactions')
      .select(`
        id,
        total_amount,
        payment_method,
        status,
        created_at,
        organization_id,
        cashier_id,
        profiles!transactions_cashier_id_fkey (
          full_name
        )
      `)
      .limit(3)

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Supabase!',
      data: {
        profiles: profiles || [],
        organizations: organizations || [],
        products: products || [],
        transactions: transactions || [],
      },
      errors: {
        organizations: orgError,
        products: productsError,
        transactions: transactionsError
      }
    })

  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json(
      { success: false, error: 'Database connection failed', details: error },
      { status: 500 }
    )
  }
}
