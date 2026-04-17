import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { getUserLeaguesWithRoles } from "@/lib/services/leagues";
import { getUserDashboardSummary } from "@/lib/services/user-dashboard";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions as any);
  const userId = session?.user?.id;

  if (!userId) {
    return null; // Should be handled by layout but safety first
  }

  // Parallel Fetch: Leagues and Summary
  const [leagues, summary] = await Promise.all([
    getUserLeaguesWithRoles(userId),
    getUserDashboardSummary(userId),
  ]);

  return (
    <DashboardClient 
      initialLeagues={leagues} 
      initialSummary={summary} 
    />
  );
}
