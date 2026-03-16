/**
 * Time utilities — Cloudflare Workers always run in UTC.
 * Peru (Lima) is UTC-5 with NO daylight saving time.
 */

const PERU_OFFSET_MS = -5 * 60 * 60 * 1000; // -5 hours in milliseconds

/**
 * Returns a Date object representing the current moment in Peru time.
 * Use this instead of `new Date()` whenever you need "local" datetime.
 */
export const getPeruDate = (): Date => new Date(Date.now() + PERU_OFFSET_MS);

/**
 * Returns an ISO-8601 string in Peru local time, suitable for storing
 * in D1 as a datetime value (no timezone suffix — treated as local).
 * Example: "2026-03-14 15:40:01"
 */
export const getPeruISOString = (): string => {
  const d = getPeruDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    ` ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
};
