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
    // Redirect pengguna ke halaman login (root page)
    const redirectUrl = new URL('/', req.nextUrl.origin);
    return NextResponse.redirect(redirectUrl);
  }

  // Jika pengguna sudah login tetapi mengakses root page, redirect ke dashboard
  if (user && req.nextUrl.pathname === '/') {
    const redirectUrl = new URL('/dashboard', req.nextUrl.origin);
    return NextResponse.redirect(redirectUrl);
  }

  // Jika pengguna sudah login atau mengakses route lain, lanjutkan request
  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'], // Terapkan middleware ke semua route kecuali API dan assets
};
