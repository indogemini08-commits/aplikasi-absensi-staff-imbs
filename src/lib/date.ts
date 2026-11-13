/**
 * Asia/Jakarta (WIB, UTC+7) Timezone utilities.
 * Ensures consistent time calculations between server and client.
 */

export const TIMEZONE = 'Asia/Jakarta';

/**
 * Returns current date in YYYY-MM-DD formatted string in Asia/Jakarta.
 */
export function getWIBDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // Output: YYYY-MM-DD
}

/**
 * Returns current time in HH:mm:ss formatted string in Asia/Jakarta.
 */
export function getWIBTimeString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatter.format(date); // Output: HH:mm:ss
}

/**
 * Returns full ISO-like timestamp string adjusted for Asia/Jakarta (e.g. 2026-11-13T07:45:00+07:00).
 */
export function getWIBTimestamp(date: Date = new Date()): string {
  const dateStr = getWIBDateString(date);
  const timeStr = getWIBTimeString(date);
  return `${dateStr}T${timeStr}+07:00`;
}

/**
 * Formats a date into Indonesian readable format, e.g. "Jumat, 13 November 2026".
 */
export function formatIndonesianDate(dateInput: string | Date): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput.includes('T') ? dateInput : `${dateInput}T00:00:00+07:00`) : dateInput;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Formats a short Indonesian date, e.g. "13 Nov 2026".
 */
export function formatIndonesianDateShort(dateInput: string | Date): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput.includes('T') ? dateInput : `${dateInput}T00:00:00+07:00`) : dateInput;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Calculates late minutes between actual clock-in time and scheduled start time + grace period.
 * times are strings in "HH:mm" or "HH:mm:ss" format.
 * Returns { isLate: boolean, minutesLate: number }
 */
export function calculateLateness(actualTimeStr: string, scheduledTimeStr: string, graceMinutes: number = 0): {
  isLate: boolean;
  minutesLate: number;
} {
  const [actH, actM] = actualTimeStr.split(':').map(Number);
  const [schH, schM] = scheduledTimeStr.split(':').map(Number);

  const actTotalMinutes = actH * 60 + actM;
  const schTotalMinutes = schH * 60 + schM;

  const diff = actTotalMinutes - schTotalMinutes;
  if (diff > graceMinutes) {
    return {
      isLate: true,
      minutesLate: diff,
    };
  }
  return {
    isLate: false,
    minutesLate: 0,
  };
}

/**
 * Calculates day difference between two YYYY-MM-DD dates inclusive.
 */
export function calculateDaysBetween(startDateStr: string, endDateStr: string): number {
  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Returns Indonesian name for day of week.
 */
export function getIndonesianDayName(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(`${dateInput}T00:00:00+07:00`) : dateInput;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TIMEZONE,
    weekday: 'long',
  }).format(d);
}

