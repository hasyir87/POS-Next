import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, password, organization_name } = await req.json();
  const cookieStore = cookies();

  // Ini harus menggunakan instance Supabase dengan Service Role Key
  const serviceRoleSupabase = createRouteHandlerClient({
    cookies: cookieStore,
    supabaseKey: process.env.SERVICE_ROLE_KEY_SUPABASE,
  });

  // --- Langkah 1: Buat Pengguna di Supabase Auth ---
  const { data: userAuthData, error: authError } =
    await serviceRoleSupabase.auth.admin.createUser({
      email,

      password,
      email_confirm: false, // Tidak perlu konfirmasi email untuk pendaftaran dari admin
    });

  if (authError) {
    console.error("Error creating Supabase Auth user:", authError.message);
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  if (!userAuthData?.user) {
    return NextResponse.json(
      { error: "Supabase Auth user creation failed unexpectedly." },
      { status: 500 },
    );
  }

  // --- Langkah 2: Buat Organisasi Induk ---
  // Hapus parent_organization_id karena skema baru tidak memilikinya
  const { data: organization, error: orgError } = await serviceRoleSupabase // Gunakan serviceRoleSupabase

    .from("organizations")
    .insert([{ name: organization_name }])
    .select() // Penting untuk mendapatkan ID organisasi yang baru dibuat
    .single();

  if (orgError || !organization) {
    console.error("Error creating organization:", orgError?.message);
    // Pertimbangkan untuk menghapus user di auth.users jika pembuatan organisasi gagal
    await serviceRoleSupabase.auth.admin.deleteUser(userAuthData.user.id);
    return NextResponse.json(
      { error: orgError?.message || "Organization creation failed." },
      { status: 500 },
    );
  }

  // --- Langkah 3: Buat Profil Pengguna (Pemilik) dan Hubungkan ke Organisasi ---
  const { data: userProfile, error: profileError } = await serviceRoleSupabase // Gunakan serviceRoleSupabase

    .from("profiles")
    .insert([
      {
        id: userAuthData.user.id, // ID dari Supabase Auth
        full_name: "Pemilik " + organization_name, // Ganti 'name' menjadi 'full_name'
        email: userAuthData.user.email, // Tambahkan email
        role: "owner", // Tetapkan peran 'owner'
        organization_id: organization.id, // Hubungkan ke organisasi yang baru dibuat
      },
    ]);

  if (profileError) {
    console.error("Error creating user profile:", profileError.message);
    // Pertimbangkan untuk menghapus user di auth.users dan organisasi jika pembuatan profil gagal
    await serviceRoleSupabase.auth.admin.deleteUser(userAuthData.user.id);
    await serviceRoleSupabase
      .from("organizations")
      .delete()
      .eq("id", organization.id); // Gunakan serviceRoleSupabase

    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // --- Berhasil ---
  return NextResponse.json(
    { message: "Owner and organization created successfully!" },
    { status: 201 },
  );
}
