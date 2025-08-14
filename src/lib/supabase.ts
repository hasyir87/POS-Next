
// src/lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// This function is kept for components that might need a standalone client instance,
// but AuthContext should be the primary way to access Supabase.
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase URL or Anon Key');
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// For simplicity, you can export a single instance for use outside of React components if needed.
export const supabase = createClient();
