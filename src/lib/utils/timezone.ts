/**
 * Default user timezone — single-user product, India Standard Time.
 * Centralizes the timezone constant so crons and date logic stay consistent.
 */
export const USER_TIMEZONE = "Asia/Kolkata";

/** Get today's date string (YYYY-MM-DD) in the user's timezone. */
export function getTodayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: USER_TIMEZONE });
}

/** Get the start-of-day Date object in IST. */
export function getTodayBoundaryIST(): Date {
  const dateStr = getTodayIST();
  return new Date(`${dateStr}T00:00:00+05:30`);
}
