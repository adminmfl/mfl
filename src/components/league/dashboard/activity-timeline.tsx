'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SubmissionDetailDialog } from '@/components/submissions';
import { useRouter } from 'next/navigation';

interface ActivityTimelineProps {
  id: string;
  leagueStartDate: string;
  isLeagueEnded: boolean;
}

export function ActivityTimeline({ id, leagueStartDate, isLeagueEnded }: ActivityTimelineProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    
    async function fetchData() {
      try {
        const tzOffsetMinutes = new Date().getTimezoneOffset();
        const ianaTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        let url = `/api/leagues/${id}/dashboard-summary?tzOffsetMinutes=${tzOffsetMinutes}&ianaTimezone=${encodeURIComponent(ianaTimezone)}`;
        
        // Date range logic
        const MS_PER_DAY = 24 * 60 * 60 * 1000;
        const parseLocal = (ymd: string) => {
          const [y, m, d] = ymd.split('-').map(Number);
          return new Date(y, m - 1, d);
        };
        const localYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        const startOfWeekAnchored = (d: Date, anchor: number) => {
          const out = new Date(d);
          out.setHours(0,0,0,0);
          const diff = (out.getDay() - anchor + 7) % 7;
          out.setDate(out.getDate() - diff);
          return out;
        };

        const leagueStart = parseLocal(leagueStartDate);
        const anchorDay = leagueStart.getDay();
        const currentWeekStart = startOfWeekAnchored(new Date(), anchorDay);
        const rangeStart = new Date(currentWeekStart);
        rangeStart.setDate(rangeStart.getDate() - (weekOffset * 7));
        const rangeEnd = new Date(rangeStart);
        rangeEnd.setDate(rangeEnd.getDate() + 6);

        url += `&startDate=${localYmd(rangeStart)}&endDate=${localYmd(rangeEnd)}`;
        
        const res = await fetch(url);
        const json = await res.json();
        if (mounted && json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Timeline fetch error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
    return () => { mounted = false; };
  }, [id, leagueStartDate, weekOffset]);

  const handleReupload = (submission: any) => {
    const params = new URLSearchParams({
      resubmit: submission.id,
      date: submission.date,
      type: submission.type,
    });
    if (submission.workout_type) params.set('workout_type', submission.workout_type);
    router.push(`/leagues/${id}/submit?${params.toString()}`);
  };

  const headerLabel = useMemo(() => {
    if (!data) return 'Loading…';
    const first = data.recentDays[0];
    const last = data.recentDays[data.recentDays.length - 1];
    if (!first || !last) return '…';
    // Simplified label
    return `${new Date(first.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})} – ${new Date(last.date).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}`;
  }, [data]);

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b flex items-center justify-between py-3">
          <Badge variant="secondary" className="text-sm px-3 py-1 font-semibold">
            {headerLabel}
          </Badge>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w + 1)} disabled={loading} aria-label="Previous week">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={loading || weekOffset === 0} aria-label="Next week">
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y" aria-busy={loading} aria-live="polite">
            {loading ? (
              <>
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <li key={i} className="px-4 py-3 flex items-center justify-between gap-3" aria-hidden="true">
                    <div className="space-y-1">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-12" />
                  </li>
                ))}
              </>
            ) : data?.recentDays.length === 0 ? (
              <li className="px-4 py-6 text-sm text-muted-foreground text-center">No recent activity.</li>
            ) : (
              data?.recentDays.map((row: any) => (
                <li key={row.date} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{row.label}</span>
                    <span className={`text-sm ${getStatusColor(row.status)}`}>{row.subtitle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium tabular-nums text-right" aria-label={`Points: ${row.pointsLabel}`}>{row.pointsLabel}</div>
                    {row.submission && (
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => { setSelectedSubmission(row.submission); setDetailDialogOpen(true); }} aria-label={`View submission details for ${row.label}`}>
                        <Eye className="size-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>

      <SubmissionDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        submission={selectedSubmission}
        isOwner
        onReupload={isLeagueEnded ? undefined : (id) => handleReupload(selectedSubmission)}
      />
    </div>
  );
}

function getStatusColor(status: string) {
  const s = status?.toLowerCase() || '';
  if (s.includes('approved') || s.includes('accepted')) return 'text-emerald-600';
  if (s.includes('pending')) return 'text-yellow-600';
  if (s.includes('rejected')) return 'text-red-600';
  return 'text-muted-foreground';
}
