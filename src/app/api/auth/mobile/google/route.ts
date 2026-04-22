import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { issueTokenPair } from '@/lib/auth/mobile-tokens';
import { isRateLimited } from '@/lib/rateLimiter';

interface GoogleTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenPayload | null> {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) return null;
    const payload = await res.json();

    // Verify audience matches our Google client ID
    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) return null;
    if (!payload.email || !payload.email_verified) return null;

    return {
      sub: payload.sub,
      email: payload.email,
      email_verified: payload.email_verified === 'true' || payload.email_verified === true,
      name: payload.name,
      picture: payload.picture,
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown')
      .split(',')[0]
      .trim();
    if (isRateLimited(`mobile-google:${ip}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json({ error: 'Google ID token is required' }, { status: 400 });
    }

    const googleUser = await verifyGoogleIdToken(idToken);
    if (!googleUser) {
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
    }

    const supabase = getSupabaseServiceRole();

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('user_id, username, email, password_hash, platform_role, is_active')
      .eq('email', googleUser.email)
      .maybeSingle();

    let isNewUser = false;
    let userId: string;
    let username: string;
    let email: string;
    let platformRole: 'admin' | 'user';

    if (existingUser) {
      if (!(existingUser as any).is_active) {
        return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
      }
      userId = String((existingUser as any).user_id);
      username = String((existingUser as any).username);
      email = String((existingUser as any).email);
      platformRole = ((existingUser as any).platform_role || 'user') as 'admin' | 'user';
    } else {
      // Create new user
      isNewUser = true;
      const newUsername = googleUser.email.split('@')[0].toLowerCase();
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          username: newUsername,
          email: googleUser.email,
          password_hash: '', // Empty for OAuth users — needs profile completion
          platform_role: 'user',
          is_active: true,
        })
        .select('user_id, username, email, platform_role')
        .single();

      if (error || !newUser) {
        console.error('[mobile/google] Error creating user:', error);
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
      }

      userId = String((newUser as any).user_id);
      username = String((newUser as any).username);
      email = String((newUser as any).email);
      platformRole = ((newUser as any).platform_role || 'user') as 'admin' | 'user';
    }

    const authUser = { id: userId, email, platform_role: platformRole };
    const tokens = await issueTokenPair(authUser);

    return NextResponse.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { ...authUser, source: 'mobile' as const },
      isNewUser,
    });
  } catch (err) {
    console.error('[mobile/google] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
