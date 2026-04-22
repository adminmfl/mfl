import Link from 'next/link';
import Image from 'next/image';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AiWelcomeText } from './ai-welcome-text';
import { checkIsTrialPeriod } from '@/lib/utils/leagues';

interface DashboardHeaderProps {
  user: {
    name?: string | null;
    profile_picture_url?: string | null;
  };
  leagueId: string;
  startDate: string;
}

export function DashboardHeader({ user, leagueId, startDate }: DashboardHeaderProps) {
  const firstName = (user?.name || 'User').split(' ')[0];
  const isTrialPeriod = checkIsTrialPeriod(startDate);

  return (
    <div className="flex flex-col gap-1 px-4 lg:px-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="w-full">
        <div className="flex items-center gap-3 mb-1 w-full">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-sm font-normal text-muted-foreground">Welcome back, </span>
            {firstName}!
          </h1>
          {user?.profile_picture_url && (
            <div className="ml-auto">
              <Link href="/profile" aria-label="View my profile">
                <Avatar className="size-12 ring-2 ring-primary/20 hover:ring-primary/40 transition-all cursor-pointer">
                  <Image 
                    src={user.profile_picture_url} 
                    alt={user.name || 'Profile'} 
                    width={48}
                    height={48}
                    priority
                    className="aspect-square size-full object-cover rounded-full"
                  />
                  <AvatarFallback aria-hidden="true">{firstName[0]}</AvatarFallback>
                </Avatar>
              </Link>
            </div>
          )}
        </div>
        
        <AiWelcomeText leagueId={leagueId} />

        {isTrialPeriod && (
          <Badge className="mt-2 bg-amber-50 text-amber-700 border-amber-200">
            Trial Period
          </Badge>
        )}
      </div>
    </div>
  );
}
