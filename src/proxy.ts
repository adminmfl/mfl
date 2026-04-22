import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  const isAuthRoute =
    req.nextUrl.pathname.startsWith('/login') ||
    req.nextUrl.pathname.startsWith('/signup');
  const isCompleteProfile =
    req.nextUrl.pathname.startsWith('/complete-profile');
  const isProtected = [
    '/dashboard',
    '/dashboard',
    '/team',
    '/leaderboards',
    '/rules',
    '/my-challenges',
    '/governor',
    '/profile',
  ].some((p) => req.nextUrl.pathname.startsWith(p));

  // Only validate token for protected routes
  if (isProtected || isCompleteProfile) {
    try {
      const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (!token) {
        const url = new URL('/login', req.url);
        return NextResponse.redirect(url);
      }

      // Check if profile needs completion
      if ((token as any).needsProfileCompletion && !isCompleteProfile) {
        const url = new URL('/complete-profile', req.url);
        return NextResponse.redirect(url);
      }

      // If profile is complete and trying to access complete-profile, redirect to dashboard
      if (!(token as any).needsProfileCompletion && isCompleteProfile) {
        const url = new URL('/dashboard', req.url);
        return NextResponse.redirect(url);
      }
    } catch (error) {
      // Invalid token, redirect to login
      const url = new URL('/login', req.url);
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next|favicon.ico|api|.*\\.html|.*\\.css|.*\\.js|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.ico).*)',
  ],
};
