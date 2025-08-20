
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const cookieStore = cookies();
  // Kita menggunakan server client standar di sini. Fungsi RPC memiliki hak aksesnya sendiri.
  const supabase = createClient(cookieStore);
  
  const { email, password, organization_name, full_name } = await req.json();

  if (!email || !password || !organization_name || !full_name) {
    return NextResponse.json({ error: "Email, password, nama lengkap, dan nama organisasi harus diisi." }, { status: 400 });
  }
  
  if (password.length < 8) {
     return NextResponse.json({ error: "Password harus memiliki setidaknya 8 karakter." }, { status: 400 });
  }

  // Panggil fungsi RPC yang telah diperkuat untuk menangani seluruh proses pendaftaran.
  // Logika validasi duplikasi sekarang ada di dalam fungsi ini.
  const { error } = await supabase.rpc('signup_owner', {
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
    // Fallback untuk error lain yang tidak terduga.
    return NextResponse.json({ error: "Gagal melakukan pendaftaran. Silakan coba lagi." }, { status: 500 });
  }

  return NextResponse.json(
    {
      message: "Pendaftaran berhasil! Silakan periksa email Anda untuk verifikasi.",
    },
    { status: 201 },
  );
}
