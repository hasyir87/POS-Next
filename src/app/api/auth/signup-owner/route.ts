import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { email, password, organization_name } = await req.json();
  const cookieStore = cookies();

  // Initialize a Supabase client with Service Role Key for admin actions
  // Ensure SERVICE_ROLE_KEY_SUPABASE is securely stored in environment variables
  const serviceRoleSupabase = createRouteHandlerClient({
      cookies: cookieStore,
      supabaseKey: process.env.SERVICE_ROLE_KEY_SUPABASE
  });

  if (!process.env.SERVICE_ROLE_KEY_SUPABASE) {
      console.error("SERVICE_ROLE_KEY_SUPABASE environment variable not set.");
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }


  // --- Langkah 1: Buat Pengguna di Supabase Auth ---
  const { data: userAuthData, error: authError } = await serviceRoleSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Set to false if you don't require initial email confirmation
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
  const supabase = createRouteHandlerClient({ cookies: cookieStore });

  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .insert([
      { name: organization_name } // parent_organization_id should be NULL by default in schema
    ])
    .select() // Select the inserted row to get the organization ID
    .single();

  if (orgError || !organization) {
    console.error('Error creating organization:', orgError?.message);
    // Attempt rollback: delete user from auth.users
    await serviceRoleSupabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: orgError?.message || 'Organization creation failed.' }, { status: 500 });
  }

  const organizationId = organization.id;


  // --- Langkah 3: Buat Profil Pengguna (Pemilik) dan Hubungkan ke Organisasi ---
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .insert([
      {
        id: userId, // ID from Supabase Auth
        name: 'Pemilik ' + organization_name, // Default name, can be customized
        role: 'owner', // Assign 'owner' role
        organization_id: organizationId // Link to the newly created organization
      }
    ]);

  if (profileError) {
    console.error('Error creating user profile:', profileError.message);
     // Attempt rollback: delete user from auth.users and the created organization
    await serviceRoleSupabase.auth.admin.deleteUser(userId);
    await supabase.from('organizations').delete().eq('id', organizationId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // --- Berhasil ---
  // Auth User, Organization, and Owner Profile successfully created
  return NextResponse.json({ message: 'Owner and organization created successfully!', userId: userId, organizationId: organizationId }, { status: 201 });
}

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { email, password, organization_name } = await req.json();
  const cookieStore = cookies();

  // Initialize a Supabase client with Service Role Key for admin actions
  // Ensure SERVICE_ROLE_KEY_SUPABASE is securely stored in environment variables
  const serviceRoleSupabase = createRouteHandlerClient({
      cookies: cookieStore,
      supabaseKey: process.env.SERVICE_ROLE_KEY_SUPABASE
  });

  if (!process.env.SERVICE_ROLE_KEY_SUPABASE) {
      console.error("SERVICE_ROLE_KEY_SUPABASE environment variable not set.");
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }


  // --- Langkah 1: Buat Pengguna di Supabase Auth ---
  const { data: userAuthData, error: authError } = await serviceRoleSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Set to false if you don't require initial email confirmation
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
  const supabase = createRouteHandlerClient({ cookies: cookieStore });

  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .insert([
      { name: organization_name } // parent_organization_id should be NULL by default in schema
    ])
    .select() // Select the inserted row to get the organization ID
    .single();

  if (orgError || !organization) {
    console.error('Error creating organization:', orgError?.message);
    // Attempt rollback: delete user from auth.users
    await serviceRoleSupabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: orgError?.message || 'Organization creation failed.' }, { status: 500 });
  }

  const organizationId = organization.id;


  // --- Langkah 3: Buat Profil Pengguna (Pemilik) dan Hubungkan ke Organisasi ---
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .insert([
      {
        id: userId, // ID from Supabase Auth
        name: 'Pemilik ' + organization_name, // Default name, can be customized
        role: 'owner', // Assign 'owner' role
        organization_id: organizationId // Link to the newly created organization
      }
    ]);

  if (profileError) {
    console.error('Error creating user profile:', profileError.message);
     // Attempt rollback: delete user from auth.users and the created organization
    await serviceRoleSupabase.auth.admin.deleteUser(userId);
    await supabase.from('organizations').delete().eq('id', organizationId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // --- Berhasil ---
  // Auth User, Organization, and Owner Profile successfully created
  return NextResponse.json({ message: 'Owner and organization created successfully!', userId: userId, organizationId: organizationId }, { status: 201 });
}
