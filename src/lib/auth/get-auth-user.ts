import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import jwt from 'jsonwebtoken';
import { authOptions } from './config';

// ─── Types ───────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  platform_role: 'admin' | 'user';
  source: 'nextauth' | 'mobile';
}

interface MobileAccessTokenPayload {
  id: string;
  email: string;
  platform_role: 'admin' | 'user';
  v: number;
  iss: string;
  type: string;
  iat: number;
  exp: number;
}

// ─── Token Verification ─────────────────────────────────────────────

const MOBILE_SECRET = process.env.MFL_MOBILE_JWT_SECRET;

function verifyMobileAccessToken(token: string): MobileAccessTokenPayload | null {
  if (!MOBILE_SECRET) {
    console.error('[get-auth-user] MFL_MOBILE_JWT_SECRET is not set');
    return null;
  }
  try {
    const payload = jwt.verify(token, MOBILE_SECRET, {
      algorithms: ['HS256'],
      issuer: 'mfl-mobile',
    }) as MobileAccessTokenPayload;
    if (payload.v !== 1) return null;
    if (payload.type !== 'access') return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Main Helper ─────────────────────────────────────────────────────

/**
 * Unified auth helper for API routes.
 * Checks Bearer token first (mobile), falls back to NextAuth session (web).
 * Returns a normalized AuthUser or null.
 */
export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  // 1. Check Bearer token first (mobile)
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // Skip if it matches CRON_SECRET (cron jobs use Bearer too)
    if (token === process.env.CRON_SECRET) return null;
    const payload = verifyMobileAccessToken(token);
    if (payload) {
      return {
        id: payload.id,
        email: payload.email,
        platform_role: payload.platform_role,
        source: 'mobile',
      };
    }
    // Invalid/expired Bearer = reject (don't fall through to cookie)
    // The mobile client handles 401 by attempting a refresh
    return null;
  }

  // 2. Fall back to NextAuth session (web)
  const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
  if (!session?.user?.id) return null;
  return {
    id: String(session.user.id),
    email: String(session.user.email),
    platform_role: (session.user as any).platform_role || 'user',
    source: 'nextauth',
  };
}
