/**
 * Safe Array Utilities
 * Provides safe wrappers for array operations to prevent "x.find is not a function" errors
 */

export function safeFind<T>(
  array: T[] | undefined | null,
  predicate: (value: T, index: number, obj: T[]) => boolean
): T | undefined {
  return Array.isArray(array) ? array.find(predicate) : undefined;
}

export function safeMap<T, U>(
  array: T[] | undefined | null,
  callback: (value: T, index: number, array: T[]) => U
): U[] {
  return Array.isArray(array) ? array.map(callback) : [];
}

export function safeFilter<T>(
  array: T[] | undefined | null,
  predicate: (value: T, index: number, array: T[]) => boolean
): T[] {
  return Array.isArray(array) ? array.filter(predicate) : [];
}

export function safeForEach<T>(
  array: T[] | undefined | null,
  callback: (value: T, index: number, array: T[]) => void
): void {
  if (Array.isArray(array)) {
    array.forEach(callback);
  }
}

export function safeReduce<T, U>(
  array: T[] | undefined | null,
  callback: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U,
  initialValue: U
): U {
  return Array.isArray(array) ? array.reduce(callback, initialValue) : initialValue;
}

export function safeLength(array: any[] | undefined | null): number {
  return Array.isArray(array) ? array.length : 0;
}

export function ensureArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

export function isValidArray<T>(value: any): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

// Type guard for checking if data exists and is a valid array
export function hasValidArrayData<T>(data: any): data is T[] {
  return data && Array.isArray(data) && data.length > 0;
}

// Safe array access with default values
export function safeArrayAccess<T>(
  array: T[] | undefined | null,
  index: number,
  defaultValue?: T
): T | undefined {
  if (!Array.isArray(array) || index < 0 || index >= array.length) {
    return defaultValue;
  }
  return array[index];
}

// Console warning for undefined arrays in development
export function warnIfUndefinedArray(value: any, context: string): void {
  if (process.env.NODE_ENV === 'development' && !Array.isArray(value)) {
    console.warn(`[SafeArrays] Non-array value detected in ${context}:`, value);
  }
}