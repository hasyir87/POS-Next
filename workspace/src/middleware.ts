
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Firebase Auth SDK (v9+) automatically manages session persistence in IndexedDB.
  // The official libraries (client and admin) handle session verification.
  // Manually checking for a specific cookie is less reliable and not the standard practice anymore.
  // We get the user from the auth state on the client, and for server components/API routes, we'd use the Admin SDK.
  // Since middleware runs on the edge, we simplify its logic to just routing, not session verification.
  
  // We assume that if the user is accessing dashboard routes, the client-side AuthContext will handle verification.
  // If the user is not authenticated, AuthContext will redirect them.
  // This middleware's main job is to handle the initial routing logic for users who are definitively logged out
  // or for protecting API routes if we were to add any server-side checks here.

  // Let's keep it simple and effective: if you're not logged in (which client-side will handle), you can't see the dashboard.
  // The client-side AuthProvider is now the primary guard. The middleware can be simplified or used for other purposes later.
  // For now, let's remove the logic to prevent potential conflicts with client-side redirects. A more advanced
  // setup might involve server-side session verification, but let's stick to the Firebase client SDK's strengths first.
  
  // A simple middleware could just be `return NextResponse.next()` and let the client handle it.
  // Let's keep a simplified version of the original logic just in case.

  // This is a simplified check. A more robust implementation might involve
  // actually verifying the session cookie on the server.
  // For now, we check for the presence of ANY firebase auth cookie as a hint of being logged in.
  const hasAuthCookie = request.cookies.getAll().some(cookie => cookie.name.startsWith('firebase:authUser'));

  const isPublicRoute = ['/', '/signup', '/unauthorized'].includes(pathname);
  const isDashboardRoute = pathname.startsWith('/dashboard');

  // If user seems to be logged in and tries to access a public route, redirect to dashboard
  if (hasAuthCookie && isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If user seems to be logged out and tries to access a protected dashboard route, redirect to login
  if (!hasAuthCookie && isDashboardRoute) {
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
