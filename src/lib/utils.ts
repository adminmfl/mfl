import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseLeagueEndDateUtc(endDate?: string | null): Date | null {
  if (!endDate) return null;

  const [y, m, d] = String(endDate).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;

  const cutoff = new Date(Date.UTC(y, m - 1, d));
  cutoff.setUTCHours(cutoff.getUTCHours() + 33, 0, 0, 0);
  return cutoff;
}

export function isLeagueEnded(endDate?: string | null, now = new Date()): boolean {
  const cutoff = parseLeagueEndDateUtc(endDate);
  return cutoff ? now > cutoff : false;
}
