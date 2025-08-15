// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse, type NextRequest } from 'next/server'
import { getProfile } from '@/lib/api' // Sesuaikan dengan path yang ada

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  // 1. Check session
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Check role untuk route admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const profile = await getProfile(session.user.id) // Fungsi yang sudah ada di lib/api
    
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  return res
}

// Konfigurasi matcher (sesuaikan dengan route Anda)
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/transactions/:path*'
  ]
}
