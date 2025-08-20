
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from "next/server";

// PENTING: Untuk operasi admin seperti ini, kita perlu menggunakan service_role key.
// Client harus dibuat di dalam fungsi request untuk memastikan env vars dimuat.
export async function POST(req: Request) {
  const { email, password, organization_name, full_name } = await req.json();

  if (!email || !password || !organization_name || !full_name) {
    return NextResponse.json({ error: "Email, password, nama lengkap, dan nama organisasi harus diisi." }, { status: 400 });
  }
  
  if (password.length < 8) {
     return NextResponse.json({ error: "Password harus memiliki setidaknya 8 karakter." }, { status: 400 });
  }

  // Inisialisasi admin client di dalam fungsi request
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SERVICE_ROLE_KEY_SUPABASE!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Panggil fungsi RPC menggunakan admin client yang sudah benar
  const { error } = await supabaseAdmin.rpc('signup_owner', {
    p_email: email,
    p_password: password,
    p_full_name: full_name,
    p_organization_name: organization_name
  });

  if (error) {
    console.error("Signup RPC error:", error);
    // Berikan umpan balik yang lebih spesifik berdasarkan pesan error dari fungsi database.
    if (error.message.includes('org_exists')) {
      return NextResponse.json({ error: "Nama organisasi ini sudah digunakan." }, { status: 409 });
    }
     if (error.message.includes('user_exists')) {
      return NextResponse.json({ error: "Pengguna dengan email ini sudah ada." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "Gagal mendaftar." }, { status: 400 });
  }

  return NextResponse.json(
    {
      message: "Pendaftaran berhasil! Silakan periksa email Anda untuk verifikasi.",
    },
    { status: 201 },
  );
}
