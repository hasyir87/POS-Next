import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/database';

// --- GET: Mengambil semua promosi untuk organisasi pengguna yang sedang login ---
export async function GET(req: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

  try {
    // 1. Dapatkan sesi pengguna untuk otorisasi
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    // 2. Dapatkan profil pengguna untuk menemukan organization_id mereka
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile || !profile.organization_id) {
      return NextResponse.json({ error: 'Profile or organization not found for user.' }, { status: 404 });
    }

    // 3. Ambil promosi HANYA untuk organisasi tersebut
    // FIX: Menambahkan filter .eq() untuk mencegah kebocoran data antar toko
    const { data: promotions, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('organization_id', profile.organization_id);

    if (error) {
      console.error('Error fetching promotions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(promotions);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// --- POST: Membuat promosi baru untuk organisasi pengguna ---
export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

  try {
    // 1. Dapatkan sesi dan profil pengguna
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile || !profile.organization_id) {
      return NextResponse.json({ error: 'Profile or organization not found for user.' }, { status: 404 });
    }
    
    const promotionData = await req.json();

    // 2. Insert promosi baru dengan menyertakan organization_id
    // FIX: Menambahkan organization_id ke data yang di-insert
    const { data, error } = await supabase
      .from('promotions')
      .insert([
        {
          ...promotionData,
          organization_id: profile.organization_id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating promotion:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
