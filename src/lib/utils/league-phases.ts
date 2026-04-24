/**
 * League Phase Utilities
 *
 * Determines and manages league phases:
 * - Active: League is running
 * - Trophy: 14 days after end_date (read-only, celebration)
 * - Archive: Up to 90 days total (data visible, warning)
 * - Deleted: After 90 days (data archived/deleted)
 */

export type LeaguePhase = 'active' | 'trophy' | 'archive' | 'deleted';

export interface LeaguePhaseInfo {
  phase: LeaguePhase;
  isReadOnly: boolean;
  daysRemaining: number;
  daysSinceEnd: number;
  cutoffDate: Date | null;
  message: string;
}

const TROPHY_MODE_DAYS = 14;
const ARCHIVE_DAYS = 90; // Total days before deletion

/**
 * Parse a date string in YYYY-MM-DD format
 */
function parseUtcDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Get the current league phase based on league status and end date
 */
export function getLeaguePhase(
  leagueStatus: string | null | undefined,
  endDate: string | null | undefined,
): LeaguePhaseInfo {
  const status = String(leagueStatus || 'draft').toLowerCase();

  // Active leagues (regardless of end date)
  if (status === 'active' || status === 'launched' || status === 'scheduled') {
    return {
      phase: 'active',
      isReadOnly: false,
      daysRemaining: 999,
      daysSinceEnd: -1,
      cutoffDate: null,
      message: 'League is active',
    };
  }

  if (!endDate) {
    return {
      phase: 'active',
      isReadOnly: false,
      daysRemaining: 999,
      daysSinceEnd: -1,
      cutoffDate: null,
      message: 'League phase unknown',
    };
  }

  const endDateTime = parseUtcDate(endDate);
  if (!endDateTime) {
    return {
      phase: 'active',
      isReadOnly: false,
      daysRemaining: 999,
      daysSinceEnd: -1,
      cutoffDate: null,
      message: 'Invalid end date',
    };
  }

  const now = new Date();
  const daysSinceEnd = Math.floor(
    (now.getTime() - endDateTime.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Trophy phase: 0-14 days after end
  if (daysSinceEnd >= 0 && daysSinceEnd <= TROPHY_MODE_DAYS) {
    const trophyCutoff = new Date(endDateTime);
    trophyCutoff.setDate(trophyCutoff.getDate() + TROPHY_MODE_DAYS);

    return {
      phase: 'trophy',
      isReadOnly: true,
      daysRemaining: Math.max(0, TROPHY_MODE_DAYS - daysSinceEnd),
      daysSinceEnd,
      cutoffDate: trophyCutoff,
      message: `🏆 Trophy Mode: League ended ${daysSinceEnd} day${daysSinceEnd === 1 ? '' : 's'} ago. Data locked for celebration!`,
    };
  }

  // Archive phase: 15-90 days after end
  if (daysSinceEnd > TROPHY_MODE_DAYS && daysSinceEnd <= ARCHIVE_DAYS) {
    const archiveCutoff = new Date(endDateTime);
    archiveCutoff.setDate(archiveCutoff.getDate() + ARCHIVE_DAYS);
    const daysRemaining = ARCHIVE_DAYS - daysSinceEnd;

    return {
      phase: 'archive',
      isReadOnly: true,
      daysRemaining,
      daysSinceEnd,
      cutoffDate: archiveCutoff,
      message: `📦 Archived: League data will be archived in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`,
    };
  }

  // Deleted phase: after 90 days
  return {
    phase: 'deleted',
    isReadOnly: true,
    daysRemaining: 0,
    daysSinceEnd,
    cutoffDate: null,
    message: 'This league data has been archived.',
  };
}

/**
 * Check if league is in trophy celebration mode (first 14 days)
 */
export function isInTrophyMode(
  leagueStatus: string | null,
  endDate: string | null,
): boolean {
  const phase = getLeaguePhase(leagueStatus, endDate);
  return phase.phase === 'trophy';
}

/**
 * Check if league is in archive mode (days 15-90)
 */
export function isInArchiveMode(
  leagueStatus: string | null,
  endDate: string | null,
): boolean {
  const phase = getLeaguePhase(leagueStatus, endDate);
  return phase.phase === 'archive';
}

/**
 * Check if league should show deletion notice (after 90 days)
 */
export function isInDeletionPhase(
  leagueStatus: string | null,
  endDate: string | null,
): boolean {
  const phase = getLeaguePhase(leagueStatus, endDate);
  return phase.phase === 'deleted';
}

/**
 * Check if league is read-only (trophy, archive, or deleted)
 */
export function isLeagueReadOnly(
  leagueStatus: string | null,
  endDate: string | null,
): boolean {
  const phase = getLeaguePhase(leagueStatus, endDate);
  return phase.isReadOnly;
}

/**
 * Format days remaining for display
 */
export function formatDaysRemaining(days: number): string {
  if (days <= 0) return 'Ending today';
  if (days === 1) return '1 day left';
  if (days <= 7) return `${days} days left`;
  return `${Math.ceil(days / 7)} weeks left`;
}
