import { League } from "@/lib/services/leagues";

export interface MySummary {
  points: number;
  totalPoints: number;
  challengePoints: number;
  avgRR: number | null;
  restUsed: number;
  restUnused: number;
  missedDays: number;
  teamPoints: number;
  teamRank: number | null;
  teamAvgRR: number | null;
  teamChallengePoints: number;
}

export interface RecentDay {
  date: string;
  label: string;
  subtitle: string;
  status?: string;
  pointsLabel: string;
  submission?: any;
  entryCount?: number;
}

export interface DashboardSummaryData {
  league: League;
  stats: any; // We can further define this if needed
  mySummary: MySummary;
  recentDays: RecentDay[];
  rejectedCount: number;
  isMonthlyFrequency: boolean;
}
