import { parseLocalYmd, MS_PER_DAY } from "./date-utils";

export function getLeagueProgress(startDateStr: string, endDateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const totalDays =
    Math.ceil((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1;
  const daysElapsed = Math.max(
    0,
    Math.ceil((today.getTime() - startDate.getTime()) / MS_PER_DAY),
  );
  const daysRemaining = Math.max(
    0,
    Math.ceil((endDate.getTime() - today.getTime()) / MS_PER_DAY),
  );
  const progressPercent = Math.min(
    100,
    Math.round((daysElapsed / totalDays) * 100),
  );

  return {
    totalDays,
    daysElapsed,
    daysRemaining,
    progressPercent,
  };
}

export function checkIsTrialPeriod(startDateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const leagueStart = parseLocalYmd(startDateStr || "");
  return leagueStart ? today < leagueStart : false;
}
