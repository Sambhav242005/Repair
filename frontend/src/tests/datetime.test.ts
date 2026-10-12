import { describe, it, expect } from 'vitest';
import {
  formatKolkata,
  formatBytes,
  formatPaise,
  datetimeLocalToIso,
} from '../utils/datetime';

describe('DateTime and Formatter Utilities (Asia/Kolkata)', () => {
  it('formats UTC timestamps strictly in Asia/Kolkata with IST suffix', () => {
    // 2026-10-12T08:00:00Z is 13:30 IST (+5:30)
    const formatted = formatKolkata('2026-10-12T08:00:00Z');
    expect(formatted).toContain('IST');
    expect(formatted).toContain('13:30');
    expect(formatted).toContain('12');
  });

  it('interprets datetime-local as Asia/Kolkata regardless of browser timezone', () => {
    const input = '2026-10-12T14:30';
    const iso = datetimeLocalToIso(input);
    expect(iso).toBe('2026-10-12T09:00:00.000Z');
  });

  it('rejects invalid date-time values rather than normalizing them silently', () => {
    expect(() => datetimeLocalToIso('2026-02-30T14:30')).toThrow(RangeError);
  });

  it('formats byte quantities into readable units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024 * 512)).toBe('512 MB');
    expect(formatBytes(1024 * 1024 * 1024 * 16)).toBe('16 GB');
  });

  it('formats Indian paise into INR currency representations', () => {
    expect(formatPaise(0)).toContain('₹0');
    expect(formatPaise(null)).toBe('Not quoted');
    expect(formatPaise(500000)).toContain('5,000');
  });
});
