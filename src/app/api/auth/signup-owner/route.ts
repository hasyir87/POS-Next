
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const cookieStore = cookies();
  // We use the standard server client here, which has the anon key.
  // The actual user creation is handled by the RPC function with elevated privileges.
  const supabase = createClient(cookieStore);
  
  const { email, password, organization_name, full_name } = await req.json();

  if (!email || !password || !organization_name || !full_name) {
    return NextResponse.json({ error: "Email, password, nama lengkap, dan nama organisasi harus diisi." }, { status: 400 });
  }
  
  if (password.length < 8) {
     return NextResponse.json({ error: "Password harus memiliki setidaknya 8 karakter." }, { status: 400 });
  }

  // Call the RPC function to handle the entire signup process securely
  // Explicitly name the parameters to match the SQL function definition
  const { error } = await supabase.rpc('signup_owner', {
    p_email: email,
    p_password: password,
    p_full_name: full_name,
    p_organization_name: organization_name
  });

  if (error) {
    console.error("Signup RPC error:", error);
    // Provide more specific feedback based on the error message from the DB function
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
