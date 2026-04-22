import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSupabaseServiceRole } from '@/lib/supabase/client'
import { isRateLimited } from '@/lib/rateLimiter'
import { getUserById, updateUserProfile } from '@/lib/services/users'
import { getAuthUser } from '@/lib/auth/get-auth-user'

export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
    if (isRateLimited(`complete-profile:${ip}`, 8, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const body = await req.json()
    const { username, password, dateOfBirth, gender, phone } = body || {}

    if (!username || !password || !dateOfBirth || !gender) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role for username check (bypasses RLS during onboarding)
    const supabase = getSupabaseServiceRole()

    // Username uniqueness check (exclude current user)
    const { data: existing } = await supabase
      .from('users')
      .select('user_id')
      .eq('username', String(username).toLowerCase())
      .neq('user_id', authUser.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(String(password), 10)

    // Update user profile using service layer with service role (bypasses RLS during onboarding)
    const updatedUser = await updateUserProfile(
      authUser.id as string,
      {
        username: String(username).toLowerCase(),
        password_hash: hashed,
        date_of_birth: dateOfBirth,
        gender: gender,
        phone: phone || null,
      },
      true // Use service role
    )

    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    console.log('complete-profile updated user via service:', authUser.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('complete-profile error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
