import { NextRequest, NextResponse } from 'next/server';
import { getPaymentsForUser } from '@/lib/services/payments';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { getAuthUser } from '@/lib/auth/get-auth-user';

// ============================================================================
// GET /api/user/payments
// ============================================================================

/**
 * Fetches all payments for the current user.
 *
 * Returns:
 * - payment_id, status, purpose, amounts
 * - razorpay_order_id, razorpay_payment_id
 * - league_name (if payment was for a league)
 * - created_at, completed_at
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authUser.id;

    const supabase = getSupabaseServiceRole();

    // Get payments with league info
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        payment_id,
        user_id,
        league_id,
        purpose,
        razorpay_order_id,
        razorpay_payment_id,
        status,
        base_amount,
        platform_fee,
        gst_amount,
        total_amount,
        currency,
        description,
        receipt,
        created_at,
        completed_at,
        leagues (
          league_name
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments:', error);
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
    }

    // Transform to include league_name directly
    const transformedPayments = (payments || []).map((payment: any) => ({
      payment_id: payment.payment_id,
      status: payment.status,
      purpose: payment.purpose,
      base_amount: Number(payment.base_amount),
      platform_fee: Number(payment.platform_fee),
      gst_amount: Number(payment.gst_amount),
      total_amount: Number(payment.total_amount),
      currency: payment.currency,
      description: payment.description,
      receipt: payment.receipt,
      razorpay_order_id: payment.razorpay_order_id,
      razorpay_payment_id: payment.razorpay_payment_id,
      league_id: payment.league_id,
      league_name: payment.leagues?.league_name || null,
      created_at: payment.created_at,
      completed_at: payment.completed_at,
    }));

    return NextResponse.json({ payments: transformedPayments });
  } catch (err) {
    console.error('Error in /api/user/payments:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
