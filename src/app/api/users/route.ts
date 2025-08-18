import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';
import { handleSupabaseError } from '@/lib/utils/error';

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.organization_id) {
      return NextResponse.json({ error: 'Profile or organization not found.' }, { status: 404 });
    }

    // Mengambil profil pengguna lain yang terkait dengan organisasi yang sama,
    // dan juga data organisasi terkait untuk ditampilkan di UI.
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        *,
        organizations (*)
      `)
      .eq('organization_id', profile.organization_id);

    if (error) {
      console.error('Error fetching profiles:', error);
      return NextResponse.json({ error: handleSupabaseError(error) }, { status: 500 });
    }

    return NextResponse.json({ users: profiles });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { email, password, full_name, role, organization_id } = await req.json();
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const { data: { user: requestingUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !requestingUser) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const { data: requestingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', requestingUser.id)
      .single();

    if (profileError || !requestingProfile) {
      return NextResponse.json({ error: 'Requesting user profile not found.' }, { status: 404 });
    }
    
    // Authorization check
    if (requestingProfile.role !== 'owner' && requestingProfile.role !== 'admin' && requestingProfile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden: Only owners, admins, or superadmin can add users.' }, { status: 403 });
    }

    const allowedRoles = ['cashier', 'admin'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: `Forbidden: Cannot assign role "${role}".` }, { status: 403 });
    }

    // Gunakan service role key untuk membuat user baru di Supabase Auth
    const supabaseAdmin = createClient(cookieStore, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        },
        cookies: {},
        supabaseKey: process.env.SERVICE_ROLE_KEY_SUPABASE
    });

    const { data: userAuthData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email untuk kemudahan
    });
    
    if (authError) {
      console.error('Error creating Supabase Auth user:', authError);
      return NextResponse.json({ error: handleSupabaseError(authError) }, { status: 400 });
    }

    if (!userAuthData?.user) {
      return NextResponse.json({ error: 'Supabase Auth user creation failed.' }, { status: 500 });
    }

    // Tentukan organization_id untuk user baru
    // Superadmin dapat memilih, sedangkan owner/admin hanya bisa di organisasi mereka sendiri.
    const newUsersOrgId = requestingProfile.role === 'superadmin' ? organization_id : requestingProfile.organization_id;

    if (!newUsersOrgId) {
        await supabaseAdmin.auth.admin.deleteUser(userAuthData.user.id); // Rollback
        return NextResponse.json({ error: 'Organization ID is missing for the new user.'}, { status: 400 });
    }


    const { data: newUserProfile, error: insertProfileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: userAuthData.user.id,
          full_name,
          email,
          role,
          organization_id: newUsersOrgId,
        },
      ])
      .select()
      .single();

    if (insertProfileError) {
      console.error('Error creating user profile:', insertProfileError);
      // Rollback: Hapus user dari Auth jika pembuatan profil gagal
      await supabaseAdmin.auth.admin.deleteUser(userAuthData.user.id);
      return NextResponse.json({ error: handleSupabaseError(insertProfileError) }, { status: 500 });
    }

    return NextResponse.json(newUserProfile, { status: 201 });

  } catch (error: any) {
    if (error.code === '23505') { 
        return NextResponse.json({ error: 'User with this email already exists.' }, { status: 409 });
    }
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
