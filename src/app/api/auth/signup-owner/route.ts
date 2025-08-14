import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, password, organization_name } = await req.json();

  // --- Langkah 1: Buat Pengguna di Supabase Auth ---
  const { data: userAuthData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Sebaiknya tetap true untuk alur produksi, user bisa konfirmasi nanti
    });

  if (authError) {
    console.error("Error creating Supabase Auth user:", authError.message);
    return NextResponse.json({ error: authError.message }, { status: 400 });
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
    .insert([{ name: organization_name }])
    .select()
    .single();

  if (orgError || !organization) {
    console.error("Error creating organization:", orgError?.message);
    // Rollback: hapus user yang sudah dibuat di Auth jika pembuatan organisasi gagal
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: orgError?.message || "Organization creation failed." },
      { status: 500 },
    );
  }

  // --- Langkah 3: Buat Profil Pengguna (Pemilik) dan Hubungkan ke Organisasi ---
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert([
      {
        id: userId, // ID dari Supabase Auth
        full_name: "Owner", // Nama bisa diubah user nanti
        email: email,
        role: "owner", // Tetapkan peran 'owner'
        organization_id: organization.id,
      },
    ]);

  if (profileError) {
    console.error("Error creating user profile:", profileError.message);
    // Rollback: hapus user di Auth dan organisasi jika pembuatan profil gagal
    await supabaseAdmin.auth.admin.deleteUser(userId);
    await supabaseAdmin
      .from("organizations")
      .delete()
      .eq("id", organization.id);

    return NextResponse.json({ error: profileError.message }, { status: 500 });
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
