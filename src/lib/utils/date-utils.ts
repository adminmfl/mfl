export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function localYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocalYmd(ymd: string): Date | null {
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(String(ymd));
  if (!match) return null;
  const [y, m, d] = ymd.split("-").map((p) => Number(p));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export function startOfWeekAnchored(d: Date, anchorDay: number) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay();
  const diff = (day - anchorDay + 7) % 7; // days since last anchor day
  out.setDate(out.getDate() - diff);
  return out;
}

export function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export function formatWeekRange(startLocal: Date) {
  const endLocal = addDays(startLocal, 6);
  const startText = startLocal.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const endText = endLocal.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startText} – ${endText}`;
}
