
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Database } from '@/types/database'

type Promotion = Database['public']['Tables']['promotions']['Row']
type PromotionInsert = Database['public']['Tables']['promotions']['Insert']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id')

    let query = supabaseAdmin
      .from('promotions')
      .select(`
        id,
        organization_id,
        name,
        type,
        value,
        get_product_id,
        is_active,
        created_at,
        updated_at
      `)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    // Only get active promotions by default
    query = query.eq('is_active', true)

    const { data: promotions, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching promotions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch promotions', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ promotions: promotions || [] })
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
    const body: PromotionInsert = await request.json()

    // Validasi required fields
    if (!body.name || !body.type || !body.organization_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, organization_id' },
        { status: 400 }
      )
    }

    const { data: promotion, error } = await supabaseAdmin
      .from('promotions')
      .insert([{
        ...body,
        is_active: body.is_active ?? true
      }])
      .select(`
        id,
        organization_id,
        name,
        type,
        value,
        get_product_id,
        is_active,
        created_at,
        updated_at
      `)
      .single()

    if (error) {
      console.error('Error creating promotion:', error)
      return NextResponse.json(
        { error: 'Failed to create promotion' },
        { status: 500 }
      )
    }

    return NextResponse.json({ promotion }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
