// src/app/api/pricing/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getPricing, updatePricing } from '@/lib/services/pricing';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';

export async function GET() {
  try {
    const pricing = await getPricing();
    if (!pricing) {
      return NextResponse.json({ error: 'Pricing not found' }, { status: 404 });
    }
    return NextResponse.json({ pricing });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const pricing = await updatePricing(session.user.id, body);
    return NextResponse.json({ pricing });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
