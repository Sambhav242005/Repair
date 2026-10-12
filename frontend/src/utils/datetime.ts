/**
 * Utilities for formatting dates strictly in Asia/Kolkata (IST: UTC+5:30)
 * and converting browser datetime-local values into ISO 8601 strings with timezone offset.
 */

export function formatKolkata(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    // Use Intl.DateTimeFormat targeting Asia/Kolkata
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d) + ' IST';
  } catch {
    return isoString;
  }
}

export function formatKolkataTimeOnly(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d) + ' IST';
  } catch {
    return isoString;
  }
}

/**
 * Converts a datetime-local wall time entered by a faculty member in Asia/Kolkata
 * to a UTC ISO string. The browser's own timezone must not affect the chosen time.
 */
export function datetimeLocalToIso(val: string): string {
  if (!val) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(val);
  if (!match) throw new RangeError('Expected a date and time in YYYY-MM-DDTHH:mm format.');
  const [, year, month, day, hour, minute] = match.map(Number);
  const wallClockMillis = Date.UTC(year, month - 1, day, hour, minute);
  const wallClock = new Date(wallClockMillis);
  if (wallClock.getUTCFullYear() !== year || wallClock.getUTCMonth() !== month - 1 || wallClock.getUTCDate() !== day || wallClock.getUTCHours() !== hour || wallClock.getUTCMinutes() !== minute) {
    throw new RangeError('Date and time is not valid.');
  }
  const d = new Date(wallClockMillis - 330 * 60 * 1000);
  return d.toISOString();
}

/**
 * Prepares a default datetime-local string (e.g. today at specified offset hours)
 */
export function getDefaultDatetimeLocal(offsetHours = 1): string {
  const d = new Date(Date.now() + offsetHours * 3600 * 1000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatPaise(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return 'Not quoted';
  if (paise === 0) return '₹0 (In-house check)';
  const rupees = (paise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  });
  return rupees;
}
