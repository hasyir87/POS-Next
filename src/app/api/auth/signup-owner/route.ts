
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { email, password, organization_name, full_name } = await req.json();
  
  // Untuk signup, kita harus menggunakan service_role key untuk membuat user, organisasi, dan profil
  // Pastikan SERVICE_ROLE_KEY_SUPABASE ada di environment variables
  const supabase = createRouteHandlerClient({ cookies, supabaseKey: process.env.SERVICE_ROLE_KEY_SUPABASE });

  // --- Langkah 1: Buat Pengguna di Supabase Auth ---
  const { data: userAuth, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Anda bisa set ke false untuk dev, tapi true lebih aman
  });

  if (authError) {
    console.error('Error creating Supabase Auth user:', authError.message);
    return NextResponse.json({ error: `Auth error: ${authError.message}` }, { status: 500 });
  }
  if (!userAuth || !userAuth.user) {
    return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 });
  }
  const userId = userAuth.user.id;

  // --- Langkah 2: Buat Organisasi ---
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: organization_name })
    .select('id')
    .single();

  if (orgError || !organization) {
    console.error('Error creating organization:', orgError?.message);
    // Rollback: Hapus pengguna yang baru dibuat jika pembuatan organisasi gagal
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: `Database error: ${orgError?.message || 'Failed to create organization.'}` }, { status: 500 });
  }
  const organizationId = organization.id;

  // --- Langkah 3: Buat Profil Pengguna (Pemilik) ---
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      full_name: full_name || email, // Gunakan nama lengkap, atau email sebagai fallback
      email: email,
      organization_id: organizationId,
      role: 'owner', // Tetapkan peran sebagai 'owner'
    });

  if (profileError) {
    console.error('Error creating user profile:', profileError.message);
    // Rollback: Hapus pengguna dan organisasi
    await supabase.auth.admin.deleteUser(userId);
    await supabase.from('organizations').delete().eq('id', organizationId);
    return NextResponse.json({ error: `Database error: ${profileError.message}` }, { status: 500 });
  }

  // --- Berhasil ---
  return NextResponse.json({ message: 'Owner and organization created successfully!' }, { status: 201 });
}
