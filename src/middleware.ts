
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // This is a simplified check. A more robust implementation might involve
  // actually verifying the session cookie on the server.
  // For now, we check for the presence of the cookie as a hint of being logged in.
  const hasSession = request.cookies.getAll().some(c => c.name.includes('firebase'));

  const isPublicRoute = ['/', '/signup', '/unauthorized'].includes(pathname);
  const isDashboardRoute = pathname.startsWith('/dashboard');

  // If user seems to be logged in and tries to access a public route, redirect to dashboard
  if (hasSession && isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If user seems to be logged out and tries to access a protected dashboard route, redirect to login
  if (!hasSession && isDashboardRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes are handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
