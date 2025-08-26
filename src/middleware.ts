import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // This is a simplified check. A more robust implementation might involve
  // actually verifying the session cookie on the server.
  // For now, we check for the presence of the cookie as a hint of being logged in.
  const hasSession = request.cookies.getAll().some(c => c.name.includes('firebase'));

  const isDashboardRoute = pathname.startsWith('/dashboard');

  // If user seems to be logged out and tries to access a protected dashboard route, redirect to login
  if (!hasSession && isDashboardRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // The logic to redirect a logged-in user from a public page to the dashboard
  // has been removed from here. It is now handled by the client-side AuthProvider
  // to prevent a race condition where the middleware redirects before the user profile is loaded.

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
