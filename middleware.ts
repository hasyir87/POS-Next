// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Jika pengguna mengakses route yang dilindungi (/dashboard) dan belum login
  if (!user && req.nextUrl.pathname.startsWith('/dashboard')) {
    // Redirect pengguna ke halaman login
    const redirectUrl = new URL('/login', req.nextUrl.origin); // Ganti '/login' jika halaman login Anda berbeda
    return NextResponse.redirect(redirectUrl);
  }

  // Jika pengguna sudah login atau mengakses route lain, lanjutkan request
  return res;
}

export const config = {
  matcher: ['/dashboard/:path*'], // Terapkan middleware ke semua route di bawah /dashboard
};
