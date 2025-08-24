import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { UserType } from '@/generated/prisma';

interface DecodedToken {
  id: number;
  username: string;
  email: string;
  userType: UserType;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = [
    '/auth/signin',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/users/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/',
  ];

  // Check if the path is public
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // Redirect to signin if no token
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as DecodedToken;

    // Check user type based route access
    const userType = decoded.userType;

    // Define protected routes for each user type
    const routePermissions = {
      [UserType.SYSTEM_ADMIN]: ['/system-admin'],
      [UserType.GARAGE_ADMIN]: ['/garage-admin'],
      [UserType.MECHANIC]: ['/mechanic'],
      [UserType.CUSTOMER]: ['/customer'],
    };

    // Check if user has access to the requested route
    const allowedRoutes = routePermissions[userType] || [];
    const hasAccess = allowedRoutes.some(route => pathname.startsWith(route));

    if (!hasAccess) {
      // Redirect to appropriate dashboard based on user type
      const dashboards = {
        [UserType.SYSTEM_ADMIN]: '/system-admin',
        [UserType.GARAGE_ADMIN]: '/garage-admin',
        [UserType.MECHANIC]: '/mechanic',
        [UserType.CUSTOMER]: '/customer',
      };

      return NextResponse.redirect(new URL(dashboards[userType], request.url));
    }

    // Add user info to request headers for API routes
    const response = NextResponse.next();
    response.headers.set('x-user-id', decoded.id.toString());
    response.headers.set('x-user-type', decoded.userType);
    response.headers.set('x-username', decoded.username);

    return response;
  } catch (error) {
    console.error('Token verification failed:', error);
    // Redirect to signin if token is invalid
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (*.svg, *.png, *.jpg, *.jpeg, *.gif, *.webp)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};