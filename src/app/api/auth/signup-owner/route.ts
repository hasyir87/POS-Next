
import { NextResponse } from "next/server";
import { handleSupabaseError } from '@/lib/utils/error';
import { supabaseAdmin } from "@/lib/supabase-admin";


export async function POST(req: Request) {
  const { email, password, organization_name } = await req.json();

  // --- Langkah 0: Validasi Input & Keunikan Nama Organisasi ---
  if (!email || !password || !organization_name) {
    return NextResponse.json({ error: "Email, password, dan nama organisasi harus diisi." }, { status: 400 });
  }
  
  if (password.length < 8) {
     return NextResponse.json({ error: "Password harus memiliki setidaknya 8 karakter." }, { status: 400 });
  }


  const { data: existingOrg, error: existingOrgError } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('name', organization_name)
    .single();

  if (existingOrg) {
    return NextResponse.json({ error: "Nama organisasi ini sudah digunakan. Silakan pilih nama lain." }, { status: 409 }); // 409 Conflict
  }


  // --- Langkah 1: Buat Pengguna di Supabase Auth ---
  const { data: userAuthData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Otomatis konfirmasi email untuk kemudahan
    });

  if (authError) {
    console.error("Error creating Supabase Auth user:", authError);
    if (authError.message.includes('Email address already in use')) {
        return NextResponse.json({ error: 'Pengguna dengan email ini sudah ada.' }, { status: 409 });
    }
    return NextResponse.json({ error: handleSupabaseError(authError) || authError.message }, { status: 400 });
  }

  if (!userAuthData?.user) {
    return NextResponse.json(
      { error: "Supabase Auth user creation failed unexpectedly." },
      { status: 500 },
    );
  }

  const userId = userAuthData.user.id;

  // --- Langkah 2: Buat Organisasi Induk ---
  const { data: organization, error: orgError } = await supabaseAdmin
    .from("organizations")
    .insert([{ name: organization_name, is_setup_complete: false }])
    .select()
    .single();

  if (orgError || !organization) {
    console.error("Error creating organization:", orgError);
    // Rollback: hapus user yang sudah dibuat di Auth jika pembuatan organisasi gagal
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: handleSupabaseError(orgError) || "Organization creation failed." },
      { status: 500 },
    );
  }

  // --- Langkah 3: Buat Profil Pengguna (Pemilik) dan Hubungkan ke Organisasi ---
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert([
      {
        id: userId,
        email: email,
        full_name: "Owner", // Default name, user bisa ubah nanti
        role: "owner",
        organization_id: organization.id,
      },
    ]);

  if (profileError) {
    console.error("Error creating user profile:", profileError);
    // Rollback: hapus user di Auth dan organisasi jika pembuatan profil gagal
    await supabaseAdmin.auth.admin.deleteUser(userId);
    await supabaseAdmin
      .from("organizations")
      .delete()
      .eq("id", organization.id);

    return NextResponse.json({ error: handleSupabaseError(profileError) }, { status: 500 });
  }

  // --- Berhasil ---
  return NextResponse.json(
    {
      message: "Owner and organization created successfully!",
      user: userAuthData.user,
      organization: organization,
    },
    { status: 201 },
  );
}
