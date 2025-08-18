
// src/lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js'

// PENTING: Inisialisasi client Supabase dengan service_role key untuk operasi admin.
// Kunci-kunci ini HANYA boleh digunakan di lingkungan server dan TIDAK BOLEH diekspos ke client.
// Pastikan NEXT_PUBLIC_SUPABASE_URL dan SERVICE_ROLE_KEY_SUPABASE diatur di environment variables Anda.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY_SUPABASE;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Supabase URL or Service Role Key is missing from environment variables.');
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
