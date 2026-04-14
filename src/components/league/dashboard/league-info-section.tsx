import { 
  Calendar, 
  Timer, 
  Moon, 
  Users, 
  Shield, 
  Globe, 
  Lock, 
  Flame 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import { getLeagueProgress } from '@/lib/utils/leagues';

interface LeagueInfoSectionProps {
  league: {
    start_date: string;
    end_date: string;
    status: string;
    rest_days: number;
    member_count?: number;
    num_teams: number;
    is_public: boolean;
    is_exclusive: boolean;
  };
}

function formatDate(dateString: string): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function LeagueInfoSection({ league }: LeagueInfoSectionProps) {
  const { totalDays, daysElapsed, daysRemaining, progressPercent } = getLeagueProgress(
    league.start_date,
    league.end_date
  );

  return (
    <div className="px-4 lg:px-6">
      <div className="rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">League Information</h2>
          <p className="text-sm text-muted-foreground">Configuration and settings overview</p>
        </div>
        
        {/* Progress Bar (for launched/active leagues) */}
        {(league.status === 'active' || league.status === 'launched') && (
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="size-5 text-primary" />
                <span className="font-medium">League Progress</span>
              </div>
              <Badge variant="outline" className="font-mono">
                {progressPercent}% Complete
              </Badge>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <div className="flex justify-between mt-3 text-sm">
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{daysElapsed}</span> days elapsed
              </span>
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{daysRemaining}</span> days remaining
              </span>
            </div>
          </div>
        )}

        {/* Key stats row 1: Start Date, End Date, Days Total */}
        <div className="grid grid-cols-3 divide-x border-b">
          <div className="p-4 flex flex-col items-center text-center">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Calendar className="size-5 text-primary" />
            </div>
            <p className="text-sm font-bold text-primary tabular-nums whitespace-nowrap">{formatDate(league.start_date)}</p>
            <p className="text-xs text-muted-foreground">Start Date</p>
          </div>
          <div className="p-4 flex flex-col items-center text-center">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Calendar className="size-5 text-primary" />
            </div>
            <p className="text-sm font-bold text-primary tabular-nums whitespace-nowrap">{formatDate(league.end_date)}</p>
            <p className="text-xs text-muted-foreground">End Date</p>
          </div>
          <div className="p-4 flex flex-col items-center text-center">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Timer className="size-5 text-primary" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{totalDays}</p>
            <p className="text-xs text-muted-foreground">Days Total</p>
          </div>
        </div>

        {/* Key stats row 2: Rest Days (if >0), Players, Teams */}
        <div className={`grid ${league.rest_days > 0 ? 'grid-cols-3' : 'grid-cols-2'} divide-x border-b`}>
          {league.rest_days > 0 && (
            <div className="p-4 flex flex-col items-center text-center">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Moon className="size-5 text-primary" />
              </div>
              <p className="text-2xl font-bold tabular-nums">{league.rest_days}</p>
              <p className="text-xs text-muted-foreground">Rest Days</p>
            </div>
          )}
          <div className="p-4 flex flex-col items-center text-center">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Users className="size-5 text-primary" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{league.member_count ?? 0}</p>
            <p className="text-xs text-muted-foreground">Players</p>
          </div>
          <div className="p-4 flex flex-col items-center text-center">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Shield className="size-5 text-primary" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{league.num_teams || 0}</p>
            <p className="text-xs text-muted-foreground">Teams</p>
          </div>
        </div>

        {/* Bottom row: Visibility, Join Type */}
        <div className="border-t p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 md:flex-col md:items-start min-w-0">
              <span className="text-sm text-muted-foreground">Visibility</span>
              <Badge variant={league.is_public ? 'default' : 'secondary'}>
                {league.is_public ? (
                  <><Globe className="size-3 mr-1" />Public</>
                ) : (
                  <><Lock className="size-3 mr-1" />Private</>
                )}
              </Badge>
            </div>
            <div className="flex flex-col gap-1 md:flex-col md:items-start min-w-0">
              <span className="text-sm text-muted-foreground">Join Type</span>
              <Badge variant="outline">
                {league.is_exclusive ? 'Invite Only' : 'Open'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
