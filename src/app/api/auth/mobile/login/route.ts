import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { issueTokenPair } from '@/lib/auth/mobile-tokens';
import { isRateLimited } from '@/lib/rateLimiter';

export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown')
      .split(',')[0]
      .trim();
    if (isRateLimited(`mobile-login:${ip}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabase = getSupabaseServiceRole();
    const { data: user, error } = await supabase
      .from('users')
      .select('user_id, username, email, password_hash, platform_role, is_active')
      .eq('email', email)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!(user as any).is_active) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    if (!(user as any).password_hash) {
      return NextResponse.json({ error: 'Please set a password first via the web app' }, { status: 400 });
    }

    const match = await bcrypt.compare(password, String((user as any).password_hash));
    if (!match) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

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
    console.error('[mobile/login] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
