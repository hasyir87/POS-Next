// src/app/api/organizations/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// API Route untuk mendapatkan daftar organisasi (termasuk Outlet)
export async function GET(req: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: cookieStore });

  // Dapatkan ID organisasi pengguna yang sedang request
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

  if (profileError || !profile || !profile.organization_id) {
       return NextResponse.json({ error: 'User profile not found or not associated with an organization' }, { status: 404 });
  }

  // Logika untuk mendapatkan organisasi yang relevan:
  // - Jika pengguna adalah 'superadmin', dapatkan semua organisasi.
  // - Jika pengguna adalah 'owner' atau 'admin', dapatkan organisasi mereka (induk) dan semua Outlet-nya.
  // - Jika pengguna adalah 'cashier', hanya dapatkan organisasi mereka.

  let organizations = [];
  let error = null;

  if (profile.role === 'superadmin') {
      const { data, error: fetchError } = await supabase
          .from('organizations')
          .select('*');
      organizations = data || [];
      error = fetchError;
  } else if (profile.role === 'owner' || profile.role === 'admin') {
      // Dapatkan organisasi induk
      const { data: ownerOrg, error: ownerOrgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .single();

      if (ownerOrgError || !ownerOrg) {
           return NextResponse.json({ error: 'Owner organization not found' }, { status: 404 });
      }

      // Dapatkan semua Outlet di bawah organisasi induk
      const { data: outlets, error: outletsError } = await supabase
          .from('organizations')
          .select('*')
          .eq('parent_organization_id', profile.organization_id);

      organizations = [ownerOrg, ...(outlets || [])]; // Gabungkan organisasi induk dan outlet
      error = ownerOrgError || outletsError;

  } else { // cashier atau role lain yang hanya melihat organisasinya sendiri
       const { data, error: fetchError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .single();
      organizations = data ? [data] : [];
      error = fetchError;
  }


  if (error) {
    console.error('Error fetching organizations:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(organizations);
}

// API Route untuk membuat organisasi baru (Outlet)
export async function POST(req: Request) {
  const { name, parent_organization_id } = await req.json(); //parent_organization_id harus dikirim dari frontend (ID organisasi induk)
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: cookieStore });

   // Dapatkan ID organisasi pengguna yang sedang request
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

  if (profileError || !profile || !profile.organization_id) {
       return NextResponse.json({ error: 'User profile not found or not associated with an organization' }, { status: 404 });
  }

  // Periksa apakah pengguna memiliki izin untuk membuat organisasi (Outlet)
  // Hanya 'owner' atau 'admin' dari organisasi induk yang bisa membuat Outlet
  if (profile.role !== 'owner' && profile.role !== 'admin') {
       return NextResponse.json({ error: 'Forbidden: Only owners or admins can create organizations' }, { status: 403 });
  }

  // Pastikan parent_organization_id yang dikirim sesuai dengan organisasi pengguna yang request (untuk mencegah membuat Outlet di organisasi lain)
  if (parent_organization_id !== profile.organization_id) {
       return NextResponse.json({ error: 'Forbidden: Cannot create organization under a different parent organization' }, { status: 403 });
  }


  const { data: newOrganization, error: insertError } = await supabase
    .from('organizations')
    .insert([
      { name, parent_organization_id }
    ])
    .select()
    .single();

  if (insertError) {
    console.error('Error creating organization:', insertError.message);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(newOrganization, { status: 201 });
}
