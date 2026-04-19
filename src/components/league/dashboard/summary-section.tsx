import { getDashboardSummary } from "@/lib/services/dashboard-service";
import { StatsGrid } from "./stats-grid";

export async function SummarySection({ 
    id, 
    userId, 
    showRest,
    isLeagueEnded,
}: { 
    id: string; 
    userId: string; 
    showRest: boolean;
    isLeagueEnded: boolean;
}) {
    // This is the "heavy" fetch that was previously blocking the shell
    const dashboardSummary = await getDashboardSummary(id, userId);
    
    return (
        <StatsGrid 
            id={id} 
            showRest={showRest}
            isLeagueEnded={isLeagueEnded}
            initialData={dashboardSummary || undefined} 
        />
    );
}
