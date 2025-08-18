// src/lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js'

// PENTING: Inisialisasi client Supabase dengan service_role key untuk operasi admin.
// Kunci-kunci ini HANYA boleh digunakan di lingkungan server dan TIDAK BOLEH diekspos ke client.
// Pastikan NEXT_PUBLIC_SUPABASE_URL dan SERVICE_ROLE_KEY_SUPABASE diatur di environment variables Anda.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SERVICE_ROLE_KEY_SUPABASE!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
