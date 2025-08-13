
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Database } from '@/types/database'

type Product = Database['public']['Tables']['products']['Row']
type ProductInsert = Database['public']['Tables']['products']['Insert']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id')
    const categoryId = searchParams.get('category_id')

    let query = supabaseAdmin
      .from('products')
      .select(`
        id,
        organization_id,
        name,
        description,
        price,
        stock,
        category_id,
        image_url,
        created_at,
        updated_at,
        categories (
          id,
          name
        )
      `)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data: products, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    return NextResponse.json({ products })
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
    const body: ProductInsert = await request.json()

    // Validasi required fields
    if (!body.name || !body.price || !body.organization_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name, price, organization_id' },
        { status: 400 }
      )
    }

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert([{
        ...body,
        stock: body.stock || 0
      }])
      .select(`
        id,
        organization_id,
        name,
        description,
        price,
        stock,
        category_id,
        image_url,
        created_at,
        updated_at,
        categories (
          id,
          name
        )
      `)
      .single()

    if (error) {
      console.error('Error creating product:', error)
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      )
    }

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
