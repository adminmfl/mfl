import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Redirect HTML file URLs to clean routes
  if (pathname === '/mfl-residential-wired.html') {
    return NextResponse.redirect(new URL('/communities', req.url))
  }

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup')
  const isCompleteProfile = pathname.startsWith('/complete-profile')
  const isAdminRoute = pathname.startsWith('/admin')
  const protectedPrefixes = ['/dashboard', '/leagues', '/submissions', '/payments', '/profile', '/help', '/admin']
  const isProtected = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  const requiresAuthCheck = isAuthRoute || isCompleteProfile || isProtected

  if (!requiresAuthCheck) {
    return NextResponse.next()
  }

  let token: Record<string, unknown> | null = null
  try {
    token = (await getToken({ req, secret: process.env.NEXTAUTH_SECRET })) as Record<string, unknown> | null
  } catch {
    token = null
  }

  const callbackUrl = req.nextUrl.searchParams.get('callbackUrl')
  const isSafeCallback = Boolean(callbackUrl && callbackUrl.startsWith('/'))
  const requestedPathWithQuery = `${pathname}${req.nextUrl.search}`

  if (!token) {
    if (isProtected || isCompleteProfile) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', requestedPathWithQuery)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  const needsProfileCompletion = Boolean(token.needsProfileCompletion)
  const platformRole = typeof token.platform_role === 'string' ? token.platform_role : 'user'
  const defaultRedirect = platformRole === 'admin' ? '/admin' : '/dashboard'

  if (needsProfileCompletion && !isCompleteProfile) {
    return NextResponse.redirect(new URL('/complete-profile', req.url))
  }

  if (!needsProfileCompletion && isCompleteProfile) {
    return NextResponse.redirect(new URL(defaultRedirect, req.url))
  }

  if (isAuthRoute) {
    if (needsProfileCompletion) {
      return NextResponse.redirect(new URL('/complete-profile', req.url))
    }

    if (isSafeCallback) {
      const resolvedCallback = callbackUrl as string
      if (resolvedCallback === '/dashboard' && platformRole === 'admin') {
        return NextResponse.redirect(new URL('/admin', req.url))
      }
      return NextResponse.redirect(new URL(resolvedCallback, req.url))
    }

    return NextResponse.redirect(new URL(defaultRedirect, req.url))
  }

  if (isAdminRoute && platformRole !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next|favicon.ico|api|.*\\.html|.*\\.css|.*\\.js|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.ico).*)',
  ],
}



