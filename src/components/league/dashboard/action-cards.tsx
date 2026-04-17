import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, ClipboardCheck, Gift } from 'lucide-react';
import { DynamicReportDialog } from '@/components/leagues/dynamic-report-dialog';

interface ActionCardsProps {
  id: string;
  league: {
    start_date: string;
    end_date: string;
    status: string;
    rest_days: number;
  };
}

export function ActionCards({ id, league }: ActionCardsProps) {
  const showReport = league.start_date && league.end_date && league.status !== 'completed';
  const showDonate = league.rest_days > 0 && league.status !== 'completed';

  return (
    <div className="px-4 lg:px-6 space-y-4">
      {showReport && (
        <DynamicReportDialog
          leagueId={id}
          leagueStartDate={league.start_date}
          leagueEndDate={league.end_date}
          trigger={
            <Card className="hover:shadow-md transition-all hover:border-primary/30 cursor-pointer group">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-lg shrink-0">
                  <ClipboardCheck className="size-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold group-hover:text-primary transition-colors">My League Summary</h3>
                  <p className="text-sm text-muted-foreground">Download your latest report</p>
                </div>
                <ArrowRight className="size-5 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
              </CardContent>
            </Card>
          }
        />
      )}

      {showDonate && (
        <Link href={`/leagues/${id}/rest-day-donations`} className="block">
          <Card className="hover:shadow-md transition-all hover:border-primary/30 cursor-pointer group">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shrink-0">
                <Gift className="size-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold group-hover:text-primary transition-colors">Donate Rest Days</h3>
                <p className="text-sm text-muted-foreground">Help a teammate in need</p>
              </div>
              <ArrowRight className="size-5 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
            </CardContent>
          </Card>
        </Link>
      )}
    </div>
  );
}
