
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { handleSupabaseError } from '@/lib/utils/error';

// Data default yang akan di-seed
const defaultCategories = ['Bibit Parfum', 'Pelarut', 'Bahan Sintetis', 'Kemasan'];
const defaultUnits = ['ml', 'g', 'pcs'];
const defaultBrands = ['Luxe Fragrance Co.', 'Aroma Natural', 'Generic Chemical', 'SynthScents', 'GlassPack'];
const defaultGrades = [
  { name: 'Standard', price_multiplier: 1.0, extra_essence_price: 2000 },
  { name: 'Premium', price_multiplier: 1.5, extra_essence_price: 3500 },
];
const defaultAromas = [
    { name: 'Sandalwood Supreme', category: 'Woody' },
    { name: 'Vanilla Orchid', category: 'Gourmand' },
    { name: 'YSL Black Opium', category: 'Oriental' },
    { name: 'Baccarat Rouge', category: 'Amber Floral' },
];
const defaultBottleSizes = [
    { size: 30, unit: 'ml', price: 10000 },
    { size: 50, unit: 'ml', price: 15000 },
    { size: 100, unit: 'ml', price: 20000 },
];


export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.organization_id) {
      return NextResponse.json({ error: 'Profile or organization not found for user.' }, { status: 404 });
    }

    // Hanya owner yang bisa menjalankan setup untuk organisasinya
    if (profile.role !== 'owner') {
        return NextResponse.json({ error: 'Forbidden: Only the owner can perform the initial setup.' }, { status: 403 });
    }
    
    const orgId = profile.organization_id;

    // --- Lakukan Seeding ---
    const categoriesToInsert = defaultCategories.map(name => ({ name, organization_id: orgId }));
    const { error: catError } = await supabase.from('categories').insert(categoriesToInsert);
    if(catError) throw catError;

    // Untuk unit dan brand, kita akan menyimpannya di tabel settings untuk fleksibilitas
    const settingsToInsert = [
        ...defaultUnits.map(unit => ({ key: 'inventory_unit', value: unit, organization_id: orgId })),
        ...defaultBrands.map(brand => ({ key: 'inventory_brand', value: brand, organization_id: orgId })),
    ];
    const { error: settingsError } = await supabase.from('settings').insert(settingsToInsert);
    if(settingsError) throw settingsError;


    const gradesToInsert = defaultGrades.map(g => ({ ...g, organization_id: orgId }));
    const { error: gradeError } = await supabase.from('grades').insert(gradesToInsert);
    if(gradeError) throw gradeError;

    const aromasToInsert = defaultAromas.map(a => ({ ...a, organization_id: orgId }));
    const { error: aromaError } = await supabase.from('aromas').insert(aromasToInsert);
    if(aromaError) throw aromaError;
    
    const bottlesToInsert = defaultBottleSizes.map(b => ({ ...b, organization_id: orgId }));
    const { error: bottleError } = await supabase.from('bottle_sizes').insert(bottlesToInsert);
    if(bottleError) throw bottleError;


    // --- Tandai Organisasi Sudah Selesai Setup ---
    const { error: orgUpdateError } = await supabase
        .from('organizations')
        .update({ is_setup_complete: true })
        .eq('id', orgId);

    if (orgUpdateError) {
        throw orgUpdateError;
    }

    return NextResponse.json({ message: 'Store setup completed successfully!' }, { status: 200 });

  } catch (e: any) {
    console.error('Seeding Error:', e);
    return NextResponse.json({ error: handleSupabaseError(e) || e.message }, { status: 500 });
  }
}
