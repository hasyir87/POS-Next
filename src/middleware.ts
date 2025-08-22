import { NextResponse, type NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionToken = request.cookies.get('firebase-session-token');

  const publicRoutes = ['/', '/signup', '/unauthorized']

  const isPublicRoute = publicRoutes.includes(pathname)
  const isDashboardRoute = pathname.startsWith('/dashboard')

  if (sessionToken && isPublicRoute) {
    // If user is logged in and tries to access a public route, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!sessionToken && isDashboardRoute) {
    // If user is not logged in and tries to access a protected dashboard route, redirect to login
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
