import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ error: 'Session error' }, { status: 401 });
    }

    if (!session || !session.user) {
      console.log('No valid session found for promotions request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Fetch promotions for the user's organization
    const { data: promotions, error: promotionsError } = await supabase
      .from('promotions')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    if (promotionsError) {
      console.error('Error fetching promotions:', promotionsError);
      return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 });
    }

    return NextResponse.json(promotions || []);

  } catch (error: any) {
    console.error('Unexpected error in promotions API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check permissions
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, type, value, get_product_id, is_active } = body;

    // Validate required fields
    if (!name || !type || value === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate promotion type
    if (!['Persentase', 'Nominal', 'BOGO'].includes(type)) {
      return NextResponse.json({ error: 'Invalid promotion type' }, { status: 400 });
    }

    // Create promotion
    const { data: promotion, error: insertError } = await supabase
      .from('promotions')
      .insert({
        organization_id: profile.organization_id,
        name,
        type,
        value,
        get_product_id: get_product_id || null,
        is_active: is_active !== undefined ? is_active : true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating promotion:', insertError);
      return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 });
    }

    return NextResponse.json(promotion, { status: 201 });

  } catch (error: any) {
    console.error('Unexpected error in create promotion:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}