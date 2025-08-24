
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password harus diisi." }, { status: 400 });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message || "Email atau password salah." }, { status: 401 });
    }

    if (!data.session) {
      return NextResponse.json({ error: "Gagal membuat sesi. Silakan coba lagi." }, { status: 500 });
    }
    
    return NextResponse.json(data.session, { status: 200 });
    
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan internal." }, { status: 500 });
  }
}
