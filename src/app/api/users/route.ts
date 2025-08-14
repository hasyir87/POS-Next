import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Database } from '@/types/database';

// --- GET: Mengambil daftar pengguna untuk organisasi PENGGUNA YANG LOGIN ---
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

  try {
    // 1. Dapatkan sesi dan profil pengguna yang melakukan request
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile || !profile.organization_id) {
      return NextResponse.json({ error: 'Profile or organization not found.' }, { status: 404 });
    }

    // 2. Query profil HANYA untuk organisasi pengguna tersebut
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        avatar_url,
        organization_id,
        role
      `)
      .eq('organization_id', profile.organization_id); // FIX: Menggunakan organization_id dari sesi, bukan URL

    if (error) {
      console.error('Error fetching profiles:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({ users: profiles });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// --- POST: Mengundang atau membuat pengguna baru dalam organisasi PENGGUNA YANG LOGIN ---
export async function POST(req: Request) {
  const { email, password, full_name, role } = await req.json();
  
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

  try {
    // 1. Dapatkan profil dan izin dari pengguna yang melakukan request
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const { data: requestingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', session.user.id)
      .single();

    if (profileError || !requestingProfile || !requestingProfile.organization_id) {
      return NextResponse.json({ error: 'Requesting user profile not found.' }, { status: 404 });
    }
    
    // 2. Pemeriksaan Izin
    if (requestingProfile.role !== 'owner' && requestingProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only owners or admins can add users.' }, { status: 403 });
    }

    const allowedRoles = ['cashier', 'admin'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: `Forbidden: Cannot assign role "${role}".` }, { status: 403 });
    }

    // 3. Buat pengguna baru di Supabase Auth (memerlukan hak admin)
    const { data: userAuthData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    
    if (authError) {
      console.error('Error creating Supabase Auth user:', authError.message);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!userAuthData?.user) {
      return NextResponse.json({ error: 'Supabase Auth user creation failed.' }, { status: 500 });
    }

    // 4. Buat profil pengguna dan hubungkan ke organisasi yang BENAR
    const { data: newUserProfile, error: insertProfileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: userAuthData.user.id,
          full_name,
          email,
          role,
          organization_id: requestingProfile.organization_id, // FIX: Paksa menggunakan organization_id dari admin/owner yang membuat
        },
      ])
      .select()
      .single();

    if (insertProfileError) {
      console.error('Error creating user profile:', insertProfileError.message);
      // Rollback: Hapus user dari Auth jika pembuatan profil gagal
      await supabaseAdmin.auth.admin.deleteUser(userAuthData.user.id);
      return NextResponse.json({ error: insertProfileError.message }, { status: 500 });
    }

    return NextResponse.json(newUserProfile, { status: 201 });

  } catch (error: any) {
    // Tangani error jika user sudah ada (duplicate key)
    if (error.code === '23505') { 
        return NextResponse.json({ error: 'User with this email already exists.' }, { status: 409 });
    }
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
