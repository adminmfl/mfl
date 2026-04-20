import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { verifyRefreshToken, issueTokenPair } from '@/lib/auth/mobile-tokens';
import { isRateLimited } from '@/lib/rateLimiter';

export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown')
      .split(',')[0]
      .trim();
    if (isRateLimited(`mobile-refresh:${ip}`, 20, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token is required' }, { status: 400 });
    }

    // Verify the refresh token signature and claims
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }

    // Re-read user from DB to sync platform_role, email changes, and check jti
    const supabase = getSupabaseServiceRole();
    const { data: user, error } = await supabase
      .from('users')
      .select('user_id, username, email, platform_role, is_active, latest_refresh_jti')
      .eq('user_id', payload.id)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    if (!(user as any).is_active) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    // Verify jti matches (single-device session enforcement)
    if ((user as any).latest_refresh_jti !== payload.jti) {
      // Token was rotated or revoked — possible token theft
      // Clear all refresh tokens for this user as a safety measure
      await supabase
        .from('users')
        .update({ latest_refresh_jti: null })
        .eq('user_id', payload.id);

      return NextResponse.json({ error: 'Token has been revoked' }, { status: 401 });
    }

    // Issue new token pair (rotates the refresh token)
    const authUser = {
      id: String((user as any).user_id),
      email: String((user as any).email),
      platform_role: ((user as any).platform_role || 'user') as 'admin' | 'user',
    };

    const tokens = await issueTokenPair(authUser);

    return NextResponse.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { ...authUser, source: 'mobile' as const },
    });
  } catch (err) {
    console.error('[mobile/refresh] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
