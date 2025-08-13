
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row']
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type TransactionItemInsert = Database['public']['Tables']['transaction_items']['Insert']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id')
    const status = searchParams.get('status')
    const limit = searchParams.get('limit')

    let query = supabaseAdmin
      .from('transactions')
      .select(`
        id,
        organization_id,
        cashier_id,
        total_amount,
        payment_method,
        status,
        created_at,
        updated_at,
        profiles!transactions_cashier_id_fkey (
          id,
          full_name,
          email
        ),
        transaction_items (
          id,
          product_id,
          quantity,
          price,
          products (
            id,
            name,
            description
          )
        )
      `)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: transactions, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: TransactionInsert & { items: Omit<TransactionItemInsert, 'transaction_id'>[] } = await request.json()

    if (!body.organization_id || !body.cashier_id || !body.total_amount || !body.payment_method) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Transaction must have at least one item' },
        { status: 400 }
      )
    }

    // Start transaction
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert([{
        organization_id: body.organization_id,
        cashier_id: body.cashier_id,
        total_amount: body.total_amount,
        payment_method: body.payment_method,
        status: body.status || 'pending'
      }])
      .select()
      .single()

    if (transactionError) {
      console.error('Error creating transaction:', transactionError)
      return NextResponse.json(
        { error: 'Failed to create transaction' },
        { status: 500 }
      )
    }

    // Insert transaction items
    const transactionItems = body.items.map(item => ({
      ...item,
      transaction_id: transaction.id
    }))

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('transaction_items')
      .insert(transactionItems)
      .select(`
        id,
        transaction_id,
        product_id,
        quantity,
        price,
        products (
          id,
          name,
          description
        )
      `)

    if (itemsError) {
      console.error('Error creating transaction items:', itemsError)
      // Rollback transaction if needed
      await supabaseAdmin.from('transactions').delete().eq('id', transaction.id)
      return NextResponse.json(
        { error: 'Failed to create transaction items' },
        { status: 500 }
      )
    }

    // Update product stock
    for (const item of body.items) {
      const { error: stockError } = await supabaseAdmin.rpc('update_product_stock', {
        product_id: item.product_id,
        quantity_sold: item.quantity
      })

      if (stockError) {
        console.error('Error updating product stock:', stockError)
        // Note: In production, you might want to implement proper rollback mechanism
      }
    }

    return NextResponse.json({
      transaction: {
        ...transaction,
        transaction_items: items
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
