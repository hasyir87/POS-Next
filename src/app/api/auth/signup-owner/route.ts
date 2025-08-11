
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { email, password, organization_name } = await req.json();
  // cookies harus berupa fungsi, bukan hasil pemanggilan langsung
  // Inisialisasi Supabase admin client dengan service role key
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error("SUPABASE_SERVICE_ROLE_KEY atau NEXT_PUBLIC_SUPABASE_URL belum diset.");
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }
  const serviceRoleSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );


  // --- Langkah 1: Buat Pengguna di Supabase Auth ---
  const { data: userAuthData, error: authError } = await serviceRoleSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    console.error('Error creating Supabase Auth user:', authError.message);
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  if (!userAuthData?.user) {
       // This case should ideally not happen if no authError, but good practice
       console.error('Supabase Auth user creation failed unexpectedly, user object is null.');
       return NextResponse.json({ error: 'Supabase Auth user creation failed unexpectedly.' }, { status: 500 });
  }

  const userId = userAuthData.user.id;


  // --- Langkah 2: Buat Organisasi Induk ---
   // Use the regular supabase client for table operations after getting the user ID
  // Untuk operasi database, gunakan serviceRoleSupabase agar tidak terhalang RLS
  const { data: organization, error: orgError } = await serviceRoleSupabase
    .from('organizations')
    .insert([
      { name: organization_name }
    ])
    .select()
    .single();

  if (orgError || !organization) {
    console.error('Error creating organization:', orgError?.message);
    // Attempt rollback: delete user from auth.users
    await serviceRoleSupabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: orgError?.message || 'Organization creation failed.' }, { status: 500 });
  }

  const organizationId = organization.id;

  // --- Langkah 3: Buat Profil Pengguna (Pemilik) dan Hubungkan ke Organisasi ---
  const { data: userProfile, error: profileError } = await serviceRoleSupabase
    .from('profiles')
    .insert([
      {
        id: userId,
        full_name: 'Pemilik ' + organization_name,
        email: email,
        role: 'owner',
        organization_id: organizationId
      }
    ]);

  if (profileError) {
    console.error('Error creating user profile:', profileError.message);
    // Attempt rollback: delete user from auth.users and the created organization
    await serviceRoleSupabase.auth.admin.deleteUser(userId);
    await serviceRoleSupabase.from('organizations').delete().eq('id', organizationId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // --- Berhasil ---
  // Auth User, Organization, and Owner Profile successfully created
  return NextResponse.json({ message: 'Owner and organization created successfully!', userId: userId, organizationId: organizationId }, { status: 201 });
}
