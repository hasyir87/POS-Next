import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function testConnection() {
  try {
    // Test query ke table profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Error connecting to Supabase:', error.message)
      return false
    }

    console.log('Successfully connected to Supabase!')
    console.log('Sample data:', data)
    return true
  } catch (err) {
    console.error('Error:', err)
    return false
  }
}
