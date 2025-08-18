export interface NormalizedTime {
  iso: string;
  date: string;
  timezone: string;
}

export class TimeNormalizationError extends Error {
  constructor(message: string, public input?: any) {
    super(message);
    this.name = 'TimeNormalizationError';
  }
}

/**
 * Validates and normalizes ISO timestamp strings
 */
export function normalizeISOString(input: string, fallbackTimezone?: string): string {
  if (!input || typeof input !== 'string') {
    throw new TimeNormalizationError('Input must be a non-empty string', input);
  }

  // Remove any whitespace
  const cleaned = input.trim();

  // Check for basic ISO format
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:?\d{2})$/;

  if (!isoRegex.test(cleaned)) {
    throw new TimeNormalizationError('Invalid ISO timestamp format', input);
  }

  // Fix missing colon in timezone offset (e.g., -0400 -> -04:00)
  let normalized = cleaned;
  const offsetMatch = normalized.match(/([+-]\d{2})(\d{2})$/);
  if (offsetMatch && !normalized.includes(':')) {
    normalized = normalized.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  }

  // Validate that the date is actually parseable
  const date = new Date(normalized);
  if (isNaN(date.getTime())) {
    throw new TimeNormalizationError('Invalid date value', input);
  }

  return normalized;
}

/**
 * Validates YYYY-MM format
 */
export function validateMonthFormat(month: string): boolean {
  const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
  return monthRegex.test(month);
}

/**
 * Validates YYYY-MM-DD format
 */
export function validateDateFormat(date: string): boolean {
  const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  if (!dateRegex.test(date)) return false;

  // Verify it's a valid date
  const parsed = new Date(date + 'T00:00:00');
  return !isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date);
}

/**
 * Validates timezone string
 */
export function validateTimezone(timezone: string): boolean {
  try {
    // Test if timezone is valid by trying to format a date with it
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the calendar date for a timestamp in a specific timezone
 */
export function getCalendarDate(isoString: string, timezone: string): string {
  const date = new Date(isoString);

  // Use Intl.DateTimeFormat to get the local date components
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  return formatter.format(date); // Returns YYYY-MM-DD
}

/**
 * Buckets time slots by their calendar date in the specified timezone
 */
export function bucketTimesByDate(
  times: string[],
  timezone: string
): Record<string, string[]> {
  const buckets: Record<string, string[]> = {};

  for (const time of times) {
    try {
      const normalized = normalizeISOString(time);
      const calendarDate = getCalendarDate(normalized, timezone);

      if (!buckets[calendarDate]) {
        buckets[calendarDate] = [];
      }

      buckets[calendarDate].push(normalized);
    } catch (error) {
      console.warn('Skipping invalid time slot:', time, error instanceof Error ? error.message : String(error));
    }
  }

  // Sort times within each bucket
  Object.keys(buckets).forEach(date => {
    buckets[date].sort();
  });

  return buckets;
}

/**
 * Validates date range parameters
 */
export function validateDateRange(startDate: string, endDate: string): void {
  if (!validateDateFormat(startDate)) {
    throw new TimeNormalizationError('Invalid start date format. Expected YYYY-MM-DD', startDate);
  }

  if (!validateDateFormat(endDate)) {
    throw new TimeNormalizationError('Invalid end date format. Expected YYYY-MM-DD', endDate);
  }

  if (startDate > endDate) {
    throw new TimeNormalizationError('Start date must be before or equal to end date', { startDate, endDate });
  }

  // Reasonable range limits (e.g., max 1 year)
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff > 365) {
    throw new TimeNormalizationError('Date range cannot exceed 365 days', { startDate, endDate, daysDiff });
  }
}

/**
 * Ensures all timestamps in an array are properly normalized
 */
export function normalizeTimeArray(times: any[]): string[] {
  if (!Array.isArray(times)) {
    return [];
  }

  return times
    .filter(time => typeof time === 'string' && time.trim())
    .map(time => {
      try {
        return normalizeISOString(time);
      } catch (error) {
        // Applying the requested change to the error handling.
        throw new Error(`Invalid ISO string format: ${error instanceof Error ? error.message : String(error)}`);
      }
    })
    .filter((time): time is string => time !== null)
    .sort();
}

export function asIso(value: any): string {
  // Add detailed logging to catch the error
  console.log('[asIso] Input value:', value, 'Type:', typeof value, 'Constructor:', value?.constructor?.name);

  if (!value) {
    console.log('[asIso] Empty value, returning empty string');
    return '';
  }

  // If it's already a string in ISO format, return it
  if (typeof value === 'string') {
    console.log('[asIso] String input:', value);
    // Check if it's already an ISO string
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      console.log('[asIso] Already ISO format, returning as-is');
      return value;
    }
    // Try to parse it as a date
    console.log('[asIso] Attempting to parse string as date');
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) {
      console.warn('[asIso] Invalid date string:', value);
      return '';
    }
    const result = parsed.toISOString();
    console.log('[asIso] Parsed and converted to ISO:', result);
    return result;
  }

  // If it's a Date object
  if (value instanceof Date) {
    console.log('[asIso] Date object input');
    if (isNaN(value.getTime())) {
      console.warn('[asIso] Invalid Date object:', value);
      return '';
    }
    const result = value.toISOString();
    console.log('[asIso] Date converted to ISO:', result);
    return result;
  }

  // Check if it has toISOString method but isn't a Date
  if (value && typeof value.toISOString === 'function') {
    console.log('[asIso] Object has toISOString method, attempting to call');
    try {
      const result = value.toISOString();
      console.log('[asIso] toISOString succeeded:', result);
      return result;
    } catch (error) {
      console.error('[asIso] toISOString failed:', error, 'Value:', value);
      return '';
    }
  }

  console.error('[asIso] UNEXPECTED VALUE TYPE - This might be the source of the error!');
  console.error('[asIso] Value:', value);
  console.error('[asIso] Type:', typeof value);
  console.error('[asIso] Constructor:', value?.constructor?.name);
  console.error('[asIso] Has toISOString?', value && typeof value.toISOString);
  console.error('[asIso] Stack trace:', new Error().stack);

  return '';
}