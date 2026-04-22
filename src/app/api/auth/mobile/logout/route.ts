import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { verifyRefreshToken } from '@/lib/auth/mobile-tokens';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      // No token to revoke — still return success (idempotent)
      return NextResponse.json({ success: true });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      // Token is already invalid — success
      return NextResponse.json({ success: true });
    }

    // Clear latest_refresh_jti to revoke all refresh tokens for this user
    const supabase = getSupabaseServiceRole();
    await supabase
      .from('users')
      .update({ latest_refresh_jti: null })
      .eq('user_id', payload.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[mobile/logout] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
