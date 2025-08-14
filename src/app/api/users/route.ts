import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Database } from '@/types/database';

// --- GET: Fetch a list of users for the LOGGED-IN USER's organization ---
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

  try {
    // 1. Get the session and profile of the user making the request
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

    // 2. Query profiles ONLY for that user's organization
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
      .eq('organization_id', profile.organization_id); // FIX: Using organization_id from the session, not the URL

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

// --- POST: Invite or create a new user within the LOGGED-IN USER's organization ---
export async function POST(req: Request) {
  const { email, password, full_name, role } = await req.json();
  
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

  try {
    // 1. Get the profile and permissions of the user making the request
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
    
    // 2. Permission Check
    if (requestingProfile.role !== 'owner' && requestingProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only owners or admins can add users.' }, { status: 403 });
    }

    const allowedRoles = ['cashier', 'admin'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: `Forbidden: Cannot assign role "${role}".` }, { status: 403 });
    }

    // 3. Create the new user in Supabase Auth (requires admin privileges)
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

    // 4. Create the user profile and link it to the CORRECT organization
    const { data: newUserProfile, error: insertProfileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: userAuthData.user.id,
          full_name,
          email,
          role,
          organization_id: requestingProfile.organization_id, // FIX: Force use of organization_id from the creating admin/owner
        },
      ])
      .select()
      .single();

    if (insertProfileError) {
      console.error('Error creating user profile:', insertProfileError.message);
      // Rollback: Delete the user from Auth if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(userAuthData.user.id);
      return NextResponse.json({ error: insertProfileError.message }, { status: 500 });
    }

    return NextResponse.json(newUserProfile, { status: 201 });

  } catch (error: any) {
    // Handle error if user already exists (duplicate key)
    if (error.code === '23505') { 
        return NextResponse.json({ error: 'User with this email already exists.' }, { status: 409 });
    }
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
