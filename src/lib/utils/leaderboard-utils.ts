import { format, parseISO, addDays } from "date-fns";

export interface WeekPreset {
  label: string;
  startDate: string;
  endDate: string;
  weekNumber: number;
}

/**
 * Calculates week presets based on league start and end dates.
 */
export function calculateWeekPresets(
  leagueStartDate: string,
  leagueEndDate: string,
): WeekPreset[] {
  const start = parseISO(leagueStartDate);
  const end = parseISO(leagueEndDate);
  const today = new Date();
  const weeks: WeekPreset[] = [];

  let weekStart = start;
  let weekNumber = 1;

  while (weekStart <= end && weekStart <= today) {
    const weekEnd = addDays(weekStart, 6);
    const actualEnd = weekEnd > end ? end : weekEnd;

    weeks.push({
      label: `Week ${weekNumber}`,
      startDate: format(weekStart, "yyyy-MM-dd"),
      endDate: format(actualEnd, "yyyy-MM-dd"),
      weekNumber,
    });

    weekStart = addDays(weekStart, 7);
    weekNumber++;
  }

  return weeks;
}

/**
 * Normalizes points by team size.
 */
export function calculateNormalizedPoints(
  points: number,
  memberCount: number,
  maxTeamSize: number,
): number {
  const count = Math.max(1, memberCount);
  return Math.round(points * (maxTeamSize / count));
}
