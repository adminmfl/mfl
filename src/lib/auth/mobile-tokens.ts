import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────

export interface MobileAccessTokenPayload {
  id: string;
  email: string;
  platform_role: 'admin' | 'user';
  v: 1;
  iss: 'mfl-mobile';
  type: 'access';
}

export interface MobileRefreshTokenPayload {
  id: string;
  v: 1;
  iss: 'mfl-mobile';
  type: 'refresh';
  jti: string;
}

export interface MobileAuthUser {
  id: string;
  email: string;
  platform_role: 'admin' | 'user';
}

export interface MobileTokenPair {
  accessToken: string;
  refreshToken: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const MOBILE_SECRET = process.env.MFL_MOBILE_JWT_SECRET!;
const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days

// ─── Token Generation ────────────────────────────────────────────────

export function generateAccessToken(user: MobileAuthUser): string {
  const payload: Omit<MobileAccessTokenPayload, 'iat' | 'exp'> = {
    id: user.id,
    email: user.email,
    platform_role: user.platform_role,
    v: 1,
    iss: 'mfl-mobile',
    type: 'access',
  };
  return jwt.sign(payload, MOBILE_SECRET, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

export function generateRefreshToken(userId: string): { token: string; jti: string } {
  const jti = uuidv4();
  const payload: Omit<MobileRefreshTokenPayload, 'iat' | 'exp'> = {
    id: userId,
    v: 1,
    iss: 'mfl-mobile',
    type: 'refresh',
    jti,
  };
  const token = jwt.sign(payload, MOBILE_SECRET, {
    algorithm: 'HS256',
    expiresIn: REFRESH_TOKEN_TTL,
  });
  return { token, jti };
}

/**
 * Issues a new access+refresh token pair and persists the refresh jti to the users table.
 */
export async function issueTokenPair(user: MobileAuthUser): Promise<MobileTokenPair> {
  const accessToken = generateAccessToken(user);
  const { token: refreshToken, jti } = generateRefreshToken(user.id);

  // Persist jti for single-device session enforcement / revocation
  const supabase = getSupabaseServiceRole();
  await supabase
    .from('users')
    .update({ latest_refresh_jti: jti })
    .eq('user_id', user.id);

  return { accessToken, refreshToken };
}

// ─── Token Verification ─────────────────────────────────────────────

export function verifyRefreshToken(token: string): MobileRefreshTokenPayload | null {
  try {
    const payload = jwt.verify(token, MOBILE_SECRET, {
      algorithms: ['HS256'],
      issuer: 'mfl-mobile',
    }) as MobileRefreshTokenPayload & { iat: number; exp: number };
    if (payload.v !== 1) return null;
    if (payload.type !== 'refresh') return null;
    return payload;
  } catch {
    return null;
  }
}
