import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // Get organization data
    const { data: organizationData, error: organizationError } = await supabase
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
    ]

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
    ]

    console.log('Inserting test data...');

    // Use supabaseAdmin for server-side operations to avoid issues with client-side auth
    // Assuming you have a service role key configured in your Supabase project
    const supabaseAdmin = createRouteHandlerClient({ cookies }); // Use the same client for simplicity in this example

    // Clear existing data to ensure a clean state for testing
    await supabaseAdmin.from('promotions').delete().neq('id', null); // Delete all promotions
    await supabaseAdmin.from('products').delete().neq('id', null); // Delete all products
    await supabaseAdmin.from('organizations').delete().neq('id', null); // Delete all organizations

    // Insert new organization
    const { data: insertedOrg, error: insertedOrgError } = await supabaseAdmin
      .from('organizations')
      .insert([{ name: 'Default Org' }])
      .select('id');

    if (insertedOrgError || !insertedOrg || insertedOrg.length === 0) {
      console.error('Error inserting organization:', insertedOrgError);
      return NextResponse.json({ error: 'Failed to insert organization' }, { status: 500 });
    }
    const insertedOrganization = insertedOrg[0];

    // Insert test products
    const { error: productsError } = await supabaseAdmin
      .from('products')
      .insert(testProducts.map(p => ({ ...p, organization_id: insertedOrganization.id })))

    if (productsError) {
      console.error('Error inserting products:', productsError)
      return NextResponse.json({ error: 'Failed to insert test products' }, { status: 500 })
    }

    // Insert test promotions
    const { error: promotionsError } = await supabaseAdmin
      .from('promotions')
      .insert(testPromotions.map(p => ({ ...p, organization_id: insertedOrganization.id })))

    if (promotionsError) {
      console.error('Error inserting promotions:', promotionsError)
      return NextResponse.json({ error: 'Failed to insert test promotions' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Test data created successfully',
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