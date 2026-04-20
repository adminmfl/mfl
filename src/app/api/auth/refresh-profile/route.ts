import { NextRequest, NextResponse } from 'next/server';
import { needsProfileCompletion } from '@/lib/services/users';
import { getAuthUser } from '@/lib/auth/get-auth-user';

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const needsCompletion = await needsProfileCompletion(authUser.id);
    return NextResponse.json({ needsProfileCompletion: needsCompletion });
  } catch (err) {
    console.error('Unexpected error in refresh-profile:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
