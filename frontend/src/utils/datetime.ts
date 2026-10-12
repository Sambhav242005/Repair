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
 * Converts a browser datetime-local input string (YYYY-MM-DDTHH:mm) into an ISO string.
 * Note: input value is in local system time, so we convert it cleanly to an ISO 8601 UTC string.
 */
export function datetimeLocalToIso(val: string): string {
  if (!val) return '';
  const d = new Date(val);
  return d.toISOString();
}

/**
 * Prepares a default datetime-local string (e.g. today at specified offset hours)
 */
export function getDefaultDatetimeLocal(offsetHours = 1): string {
  const d = new Date(Date.now() + offsetHours * 3600 * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
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
