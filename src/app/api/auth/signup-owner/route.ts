
import { createClient } from '../../../../utils/supabase/server';
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { handleSupabaseError } from '@/lib/utils/error';

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { email, password, organization_name } = await req.json();

  // --- Langkah 1: Buat Pengguna di Supabase Auth ---
  const { data: userAuthData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    console.error("Error creating Supabase Auth user:", authError);
    return NextResponse.json({ error: handleSupabaseError(authError) }, { status: 400 });
  }

  if (!userAuthData?.user) {
    return NextResponse.json(
      { error: "Supabase Auth user creation failed unexpectedly." },
      { status: 500 },
    );
  }

  const userId = userAuthData.user.id;

  // --- Langkah 2: Buat Organisasi Induk ---
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .insert([{ name: organization_name, is_setup_complete: false }])
    .select()
    .single();

  if (orgError || !organization) {
    console.error("Error creating organization:", orgError);
    // Rollback: hapus user yang sudah dibuat di Auth jika pembuatan organisasi gagal
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: handleSupabaseError(orgError) || "Organization creation failed." },
      { status: 500 },
    );
  }

  // --- Langkah 3: Buat Profil Pengguna (Pemilik) dan Hubungkan ke Organisasi ---
  const { error: profileError } = await supabase
    .from("profiles")
    .insert([
      {
        id: userId,
        full_name: "Owner",
        email: email,
        role: "owner",
        organization_id: organization.id,
      },
    ]);

  if (profileError) {
    console.error("Error creating user profile:", profileError);
    // Rollback: hapus user di Auth dan organisasi jika pembuatan profil gagal
    await supabase.auth.admin.deleteUser(userId);
    await supabase
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
