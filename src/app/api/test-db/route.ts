import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get organization data
    let { data: organizationData, error: organizationError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);

    if (organizationError || !organizationData || organizationData.length === 0) {
      console.error('Error fetching organization:', organizationError);
      // If no organization, create a dummy one for testing purposes
      const { data: newOrg, error: newOrgError } = await supabase
        .from('organizations')
        .insert([{ name: 'Default Org' }])
        .select('id');

      if (newOrgError || !newOrg || newOrg.length === 0) {
        console.error('Error creating default organization:', newOrgError);
        return NextResponse.json({ error: 'Failed to create default organization' }, { status: 500 });
      }
      organizationData = newOrg;
    }

    const organization = organizationData[0];

    // Test products data
    const testProducts = [
      {
        organization_id: organization.id,
        name: 'Produk A',
        price: 100000,
        stock: 50
      },
      {
        organization_id: organization.id,
        name: 'Produk B',
        price: 250000,
        stock: 30
      }
    ];

    // Test promotions data
    const testPromotions = [
      {
        organization_id: organization.id,
        name: 'Diskon Akhir Pekan',
        type: 'Persentase' as const,
        value: 15,
        get_product_id: null,
        is_active: true
      },
      {
        organization_id: organization.id,
        name: 'Potongan Langsung',
        type: 'Nominal' as const,
        value: 20000,
        get_product_id: null,
        is_active: true
      }
    ];

    console.log('Inserting test data...');

    // Clear existing data to ensure a clean state for testing
    await supabase.from('promotions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert test products
    const { error: productsError } = await supabase
      .from('products')
      .insert(testProducts);

    if (productsError) {
      console.error('Error inserting products:', productsError);
      return NextResponse.json({ error: 'Failed to insert test products' }, { status: 500 });
    }

    // Insert test promotions
    const { error: promotionsError } = await supabase
      .from('promotions')
      .insert(testPromotions);

    if (promotionsError) {
      console.error('Error inserting promotions:', promotionsError);
      return NextResponse.json({ error: 'Failed to insert test promotions' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Test data created successfully',
      organization: organization,
      productsCount: testProducts.length,
      promotionsCount: testPromotions.length
    });

  } catch (error: any) {
    console.error('An unexpected error occurred:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}