// src/lib/utils/error.ts
interface SupabaseError {
  code: string
  message: string
  details?: string
}

export function handleSupabaseError(error: SupabaseError | null): string | null {
  if (!error) return null

  switch (error.code) {
    case '23505':
      return 'Data sudah ada di database'
    case '42501':
      return 'Anda tidak memiliki izin untuk aksi ini'
    case '42P01':
      return 'Tabel tidak ditemukan'
    default:
      console.error('Supabase Error:', error)
      return `Terjadi kesalahan: ${error.message}`
  }
}

// Contoh penggunaan di komponen:
import { handleSupabaseError } from '@/lib/utils/error'

const { data, error } = await supabase.from('products').insert(...)
if (error) {
  const errorMessage = handleSupabaseError(error)
  toast.error(errorMessage)
}
