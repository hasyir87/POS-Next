import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// FIX: Using the consistent environment variable name for the service role key.
const supabaseServiceKey = process.env.SERVICE_ROLE_KEY_SUPABASE;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase URL or Service Role Key. Please check your environment variables.');
}

// Client dengan service role untuk operasi admin
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});