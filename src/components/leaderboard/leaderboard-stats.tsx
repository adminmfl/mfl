/**
 * Leaderboard Stats - Compact Horizontal Bar
 * Displays summary statistics in a single line.
 */

import Trophy from 'lucide-react/dist/esm/icons/trophy';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Clock3 from 'lucide-react/dist/esm/icons/clock-3';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';

import type { LeaderboardStats as StatsType } from '@/hooks/use-league-leaderboard';

// ============================================================================
// Types
// ============================================================================

interface LeaderboardStatsProps {
  stats: StatsType;
}

// ============================================================================
// Compact Stat Item
// ============================================================================

interface StatItemProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  colorClass: string;
}

function StatItem({ label, value, icon: Icon, colorClass }: StatItemProps) {
  return (
    <div className="flex min-w-[140px] items-center gap-3 rounded-lg border bg-background px-3 py-2 shadow-sm">
      <span className={`flex size-8 items-center justify-center rounded-md ${colorClass} bg-current/10`}>
        <Icon className="size-4 text-current" />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-sm font-semibold tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component - Compact Horizontal Bar
// ============================================================================

export function LeaderboardStats({ stats }: LeaderboardStatsProps) {
  const approvalRate = stats.total_submissions > 0
    ? Math.round((stats.approved / stats.total_submissions) * 100)
    : 0;

  const rejected = stats.total_submissions - stats.approved - stats.pending;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border bg-card/60 p-2 sm:p-3">
      <div className="w-full text-center mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Your Activity Submissions
        </span>
      </div>
      <StatItem
        label="Submissions"
        value={stats.total_submissions}
        icon={Trophy}
        colorClass="text-primary"
      />
      <StatItem
        label="Approved"
        value={`${stats.approved} (${approvalRate}%)`}
        icon={CheckCircle2}
        colorClass="text-emerald-500"
      />
      <StatItem
        label="Pending"
        value={stats.pending}
        icon={Clock3}
        colorClass="text-amber-500"
      />
      <StatItem
        label="Rejected"
        value={rejected}
        icon={TrendingUp}
        colorClass="text-red-500"
      />
    </div>
  );
}

export default LeaderboardStats;

