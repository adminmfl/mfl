import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { getUserLeaguesWithRoles } from "@/lib/services/leagues";
import AppLayoutClient from "./app-layout-client";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions as any);

  if (!session) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const userId = session.user.id;
  
  // Parallel fetch session (already done) and leagues (server-side)
  // Request memoization will handle cases where individual pages also call this
  const leagues = await getUserLeaguesWithRoles(userId);

  return (
    <AppLayoutClient 
      session={session} 
      initialLeagues={leagues}
    >
      {children}
    </AppLayoutClient>
  );
}
