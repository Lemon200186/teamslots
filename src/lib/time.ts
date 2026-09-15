import { fromZonedTime, toZonedTime, format } from "date-fns-tz";

export const SLOT_MINUTES = 15;
export const SLOTS_PER_DAY = (24 * 60) / SLOT_MINUTES; // 96

/**
 * The core timezone-correctness primitive for the whole product.
 *
 * A grid cell is identified by (candidate date, slot index) which on their
 * own mean nothing — "slot 32 on 2026-09-21" is only a real instant once you
 * say *in which timezone*. Every participant paints in their own timezone;
 * we convert their picks to an absolute UTC instant before saving, and
 * convert back to whichever timezone is currently being *viewed* in when
 * rendering. This is what lets two people in different timezones look at
 * the same grid and each see "their" 00:00-24:00, while still comparing
 * apples to apples underneath.
 */
export function slotToUtc(dateStr: string, slotIndex: number, timeZone: string): Date {
  const minutes = slotIndex * SLOT_MINUTES;
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return fromZonedTime(`${dateStr}T${hh}:${mm}:00`, timeZone);
}

export function utcToSlot(utcDate: Date, timeZone: string): { dateStr: string; slotIndex: number } {
  const zoned = toZonedTime(utcDate, timeZone);
  const dateStr = format(zoned, "yyyy-MM-dd", { timeZone });
  const minutes = zoned.getHours() * 60 + zoned.getMinutes();
  return { dateStr, slotIndex: Math.floor(minutes / SLOT_MINUTES) };
}

/** The N candidate calendar dates for an event, starting at event.startDate. */
export function candidateDates(startDate: string, dayCount: number): string[] {
  const [y, m, d] = startDate.split("-").map(Number);
  const dates: string[] = [];
  for (let i = 0; i < dayCount; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    dates.push(dt.toISOString().slice(0, 10));
  }
  return dates;
}

/** Monday of the current week, as "YYYY-MM-DD" (UTC calendar, not timezone-shifted). */
export function mondayOfThisWeek(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  return monday.toISOString().slice(0, 10);
}
