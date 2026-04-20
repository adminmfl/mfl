import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getUserLeaguesWithRoles } from '@/lib/services/leagues';
import { getUserDashboardSummary } from '@/lib/services/user-dashboard';
import DashboardClient from './dashboard-client';

/**
 * Dashboard Page - Server Component
 *
 * Fetches initial data on the server to avoid waterfalls and improve hydration.
 * Parallelizes league and summary data fetching.
 */
export default async function DashboardPage() {
  const session = await getServerSession(authOptions as any);
  const userId = session?.user?.id;

  if (!userId) {
    return null; // Should be handled by layout but safety first
  }

  // Parallel Fetch: Leagues and Summary with error handling
  const [leagues, summary] = await Promise.all([
    getUserLeaguesWithRoles(userId).catch(() => []),
    getUserDashboardSummary(userId).catch(() => null),
  ]);

  return <DashboardClient initialLeagues={leagues} initialSummary={summary} />;
}
