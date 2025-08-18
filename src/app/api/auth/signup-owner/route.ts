
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from "next/server";
import { handleSupabaseError } from '@/lib/utils/error';

// This route should use the service role key to perform admin-level actions.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SERVICE_ROLE_KEY_SUPABASE;

export async function POST(req: Request) {
  // Ensure we have the required environment variables
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Service Role Key');
    return NextResponse.json({ error: 'Konfigurasi server tidak lengkap.' }, { status: 500 });
  }

  // Create a dedicated admin client for this operation
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { email, password, organization_name, full_name } = await req.json();

  if (!email || !password || !organization_name || !full_name) {
    return NextResponse.json({ error: "Email, password, nama lengkap, dan nama organisasi harus diisi." }, { status: 400 });
  }
  
  if (password.length < 8) {
     return NextResponse.json({ error: "Password harus memiliki setidaknya 8 karakter." }, { status: 400 });
  }

  // Check if organization name already exists using a safer method
  const { data: existingOrg, error: orgCheckError } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('name', organization_name)
    .limit(1)
    .maybeSingle();

  if (orgCheckError) {
      console.error('Organization check error:', orgCheckError);
      return NextResponse.json({ error: 'Gagal memeriksa organisasi.' }, { status: 500 });
  }

  if (existingOrg) {
      return NextResponse.json({ error: 'Nama organisasi ini sudah digunakan.' }, { status: 409 });
  }
  
  // Step 1: Create the user in Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Set to true for production to send verification email
    user_metadata: { full_name: full_name }
  });

  if (authError) {
    console.error("Auth user creation error:", authError);
    if (authError.message.includes('unique constraint')) {
        return NextResponse.json({ error: 'Pengguna dengan email ini sudah ada.' }, { status: 409 });
    }
    return NextResponse.json({ error: authError.message || 'Gagal membuat pengguna.' }, { status: 400 });
  }

  if (!authData.user) {
    return NextResponse.json({ error: 'Gagal membuat pengguna.' }, { status: 500 });
  }

  const newUserId = authData.user.id;

  // Step 2: Create the organization
  const { data: orgData, error: orgError } = await supabaseAdmin
    .from('organizations')
    .insert({ name: organization_name })
    .select()
    .single();
  
  if (orgError || !orgData) {
    console.error("Organization creation error:", orgError);
    // Rollback: delete the user if org creation fails
    await supabaseAdmin.auth.admin.deleteUser(newUserId);
    return NextResponse.json({ error: 'Gagal membuat organisasi.' }, { status: 500 });
  }

  // Step 3: Create the user's profile
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: newUserId,
      email: email,
      full_name: full_name,
      organization_id: orgData.id,
      role: 'owner'
    });
  
  if (profileError) {
    console.error("Profile creation error:", profileError);
    // Rollback: delete the user and organization if profile creation fails
    await supabaseAdmin.auth.admin.deleteUser(newUserId);
    await supabaseAdmin.from('organizations').delete().eq('id', orgData.id);
    return NextResponse.json({ error: 'Gagal membuat profil pengguna.' }, { status: 500 });
  }

  return NextResponse.json(
    {
      message: "Pendaftaran berhasil! Silakan periksa email Anda untuk verifikasi.",
    },
    { status: 201 },
  );
}
