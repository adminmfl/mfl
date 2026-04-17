'use client';

import { format, parseISO } from 'date-fns';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import dynamic from 'next/dynamic';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const CalendarComponent = dynamic(() => import('@/components/ui/calendar').then(mod => mod.Calendar), {
  ssr: false,
  loading: () => <div className="p-4 h-[300px] flex items-center justify-center">Loading Calendar...</div>
});

interface WeekPreset {
  weekNumber: number;
  label: string;
  startDate: string;
  endDate: string;
}

interface LeaderboardControlsProps {
  selectedWeek: number | 'all' | 'custom';
  startDate: Date | undefined;
  endDate: Date | undefined;
  filterOpen: boolean;
  setFilterOpen: (open: boolean) => void;
  weekPresets: WeekPreset[];
  handleWeekSelect: (week: number | 'all' | 'custom') => void;
  handleApplyDateRange: () => void;
  handleResetDateRange: () => void;
  setStartDate: (date: Date | undefined) => void;
  setEndDate: (date: Date | undefined) => void;
  refetch: () => void;
}

export function LeaderboardControls({
  selectedWeek,
  startDate,
  endDate,
  filterOpen,
  setFilterOpen,
  weekPresets,
  handleWeekSelect,
  handleApplyDateRange,
  handleResetDateRange,
  setStartDate,
  setEndDate,
  refetch,
}: LeaderboardControlsProps) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-normal shadow-sm hover:shadow"
          >
            <Calendar className="size-3.5 mr-1.5" />
            <span className="truncate max-w-[80px] sm:max-w-none">
              {selectedWeek === 'all'
                ? 'All Time'
                : selectedWeek === 'custom'
                  ? startDate && endDate
                    ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`
                    : 'Custom'
                  : weekPresets.find(
                      (w) => w.weekNumber === selectedWeek,
                    )?.label || 'All Time'}
            </span>
            <ChevronDown className="size-3.5 ml-1.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-72 p-0 shadow-lg border-muted"
          align="end"
        >
          <div className="flex flex-col gap-1 p-2">
            <Button
              variant={selectedWeek === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className="justify-start shadow-sm"
              onClick={() => handleWeekSelect('all')}
            >
              All Time
            </Button>

            {weekPresets.length > 0 && (
              <>
                <div className="text-xs font-medium text-muted-foreground px-2 py-2 mt-1">
                  Weeks
                </div>
                <div className="max-h-[240px] overflow-y-auto pr-1 space-y-1">
                  {[...weekPresets].reverse().map((week) => (
                    <Button
                      key={week.weekNumber}
                      variant={
                        selectedWeek === week.weekNumber
                          ? 'secondary'
                          : 'ghost'
                      }
                      size="sm"
                      className="justify-start w-full shadow-sm"
                      onClick={() => handleWeekSelect(week.weekNumber)}
                    >
                      <span className="font-medium">{week.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground pl-2">
                        {format(parseISO(week.startDate), 'MMM d')} –{' '}
                        {format(parseISO(week.endDate), 'MMM d')}
                      </span>
                    </Button>
                  ))}
                </div>
              </>
            )}

            <div className="text-xs font-medium text-muted-foreground px-2 py-2 mt-2">
              Custom Range
            </div>
            <div className="flex flex-col gap-2.5 p-3 rounded-md border bg-muted/20 shadow-inner">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'flex-1 text-xs shadow-sm hover:shadow',
                        !startDate && 'text-muted-foreground',
                      )}
                    >
                      {startDate ? format(startDate, 'MMM d') : 'Start'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 shadow-lg"
                    align="start"
                  >
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      disabled={(date) =>
                        endDate ? date > endDate : false
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">–</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'flex-1 text-xs shadow-sm hover:shadow',
                        !endDate && 'text-muted-foreground',
                      )}
                    >
                      {endDate ? format(endDate, 'MMM d') : 'End'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 shadow-lg"
                    align="start"
                  >
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) =>
                        startDate ? date < startDate : false
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs shadow-sm hover:shadow"
                  onClick={handleResetDateRange}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs shadow-sm hover:shadow-md"
                  onClick={handleApplyDateRange}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={refetch}
      >
        <RefreshCw className="size-3.5" />
      </Button>
    </div>
  );
}
