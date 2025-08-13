// src/app/api/users/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// API Route untuk mendapatkan daftar pengguna di organisasi yang sama
export async function GET(req: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: cookieStore });

  // Dapatkan profil pengguna yang sedang request
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

  // Hanya 'owner' atau 'admin' yang bisa melihat semua pengguna di organisasi mereka
  if (profile.role !== 'owner' && profile.role !== 'admin') {
       return NextResponse.json({ error: 'Forbidden: Only authorized roles can view users' }, { status: 403 });
  }

  // Ambil semua profil yang memiliki organization_id yang sama
  const { data: usersInOrg, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, organization_id') // Ambil kolom yang relevan
      .eq('organization_id', profile.organization_id);

  if (error) {
    console.error('Error fetching users:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(usersInOrg || []);
}

// API Route untuk mengundang/membuat pengguna baru
export async function POST(req: Request) {
  const { email, password, full_name, role, organization_id } = await req.json();

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: cookieStore });

  // Dapatkan profil pengguna yang sedang request
  const { data: { user: requestingUser }, error: requestingUserError } = await supabase.auth.getUser();
  if (requestingUserError || !requestingUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: requestingProfile, error: requestingProfileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', requestingUser.id)
      .single();

  if (requestingProfileError || !requestingProfile || !requestingProfile.organization_id) {
       return NextResponse.json({ error: 'Requesting user profile not found' }, { status: 404 });
  }

  // --- Pemeriksaan Izin ---
  if (requestingProfile.role !== 'owner' && requestingProfile.role !== 'admin') {
       return NextResponse.json({ error: 'Forbidden: Only owners or admins can add users' }, { status: 403 });
  }
  if (organization_id !== requestingProfile.organization_id) {
        return NextResponse.json({ error: 'Forbidden: Cannot add user to a different organization' }, { status: 403 });
  }
  const allowedRoles = ['cashier', 'admin'];
  if (!allowedRoles.includes(role)) {
        return NextResponse.json({ error: `Forbidden: Cannot assign role "${role}"` }, { status: 403 });
  }
  
  // Perlu Service Role Key untuk operasi admin
  const serviceRoleSupabase = createRouteHandlerClient({ cookies: cookieStore, supabaseKey: process.env.SERVICE_ROLE_KEY_SUPABASE });

  // --- Langkah 1: Buat Pengguna di Supabase Auth ---
  const { data: userAuthData, error: authError } = await serviceRoleSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
  });

  if (authError) {
    console.error('Error creating Supabase Auth user:', authError.message);
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }
  if (!userAuthData?.user) {
      return NextResponse.json({ error: 'Supabase Auth user creation failed unexpectedly.' }, { status: 500 });
  }

  // --- Langkah 2: Buat Profil Pengguna ---
  const { data: newUserProfile, error: profileError } = await supabase
    .from('profiles')
    .insert([
      {
        id: userAuthData.user.id,
        full_name: full_name || email,
        email: email,
        role: role || 'cashier',
        organization_id: organization_id
      }
    ])
    .select()
    .single();

  if (profileError) {
    console.error('Error creating user profile:', profileError.message);
    await serviceRoleSupabase.auth.admin.deleteUser(userAuthData.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json(newUserProfile, { status: 201 });
}
