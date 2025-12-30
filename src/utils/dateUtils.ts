/**
 * Date utilities for subscription management
 */

// For testing: allow overriding the current date
let mockDate: Date | null = null;

/**
 * Get the current date (or mocked date for testing)
 */
export function getCurrentDate(): Date {
  return mockDate || new Date();
}

/**
 * Get the current timestamp in milliseconds
 */
export function getCurrentTimestamp(): number {
  return getCurrentDate().getTime();
}

/**
 * Set a mock date for testing purposes
 * @param date - The date to use, or null to use real time
 */
export function setMockDate(date: Date | null): void {
  mockDate = date;
  if (date) {
    console.log('[dateUtils] Mock date set to:', date.toISOString());
  } else {
    console.log('[dateUtils] Mock date cleared, using real time');
  }
}

/**
 * Set mock date to end of current month (for testing renewals)
 */
export function setMockDateToEndOfMonth(): void {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  setMockDate(endOfMonth);
}

/**
 * Clear mock date and use real time
 */
export function clearMockDate(): void {
  setMockDate(null);
}

/**
 * Check if a date is in the past
 */
export function isExpired(date: Date | string | number): boolean {
  const targetTime = typeof date === 'number' ? date : new Date(date).getTime();
  return targetTime < getCurrentTimestamp();
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date | string | number): boolean {
  const targetTime = typeof date === 'number' ? date : new Date(date).getTime();
  return targetTime > getCurrentTimestamp();
}

/**
 * Get days until a future date
 */
export function daysUntil(date: Date | string | number): number {
  const targetTime = typeof date === 'number' ? date : new Date(date).getTime();
  const diff = targetTime - getCurrentTimestamp();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get days since a past date
 */
export function daysSince(date: Date | string | number): number {
  const targetTime = typeof date === 'number' ? date : new Date(date).getTime();
  const diff = getCurrentTimestamp() - targetTime;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Get start of day (midnight)
 */
export function startOfDay(date: Date = getCurrentDate()): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day (23:59:59.999)
 */
export function endOfDay(date: Date = getCurrentDate()): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get start of month
 */
export function startOfMonth(date: Date = getCurrentDate()): Date {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of month
 */
export function endOfMonth(date: Date = getCurrentDate()): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
