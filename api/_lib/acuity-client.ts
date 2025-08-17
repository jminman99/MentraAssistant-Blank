interface AcuityConfig {
  apiKey: string;
  userId: string;
  baseUrl?: string;
  defaultTimeout?: number;
  maxRetries?: number;
}

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

class AcuityApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isRetryable: boolean = false,
    public isTimeout: boolean = false
  ) {
    super(message);
    this.name = 'AcuityApiError';
  }
}

export class AcuityClient {
  private config: Required<AcuityConfig>;
  private authHeader: string;

  constructor(config: AcuityConfig) {
    this.config = {
      baseUrl: 'https://acuityscheduling.com/api/v1',
      defaultTimeout: 10000,
      maxRetries: 3,
      ...config
    };

    const credentials = Buffer.from(`${this.config.userId}:${this.config.apiKey}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateBackoffDelay(attempt: number, baseDelay: number = 1000, maxDelay: number = 30000): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  private async fetchWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOptions: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = this.config.maxRetries,
      baseDelay = 1000,
      maxDelay = 30000
    } = retryOptions;

    let lastError: AcuityApiError = new AcuityApiError('Unknown error'); // Initialize lastError

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.defaultTimeout);

      try {
        const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
          ...options,
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json',
            ...options.headers
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          return data;
        }

        // Handle specific HTTP status codes
        const errorText = await response.text().catch(() => 'Unknown error');

        if (response.status === 429) {
          // Rate limit - always retry
          lastError = new AcuityApiError(
            `Rate limited by Acuity API: ${errorText}`,
            429,
            true
          );
        } else if (response.status >= 500) {
          // Server errors - retry
          lastError = new AcuityApiError(
            `Acuity server error: ${response.status} - ${errorText}`,
            response.status,
            true
          );
        } else if (response.status >= 400) {
          // Client errors - don't retry
          throw new AcuityApiError(
            `Acuity client error: ${response.status} - ${errorText}`,
            response.status,
            false
          );
        } else {
          lastError = new AcuityApiError(
            `Unexpected response: ${response.status} - ${errorText}`,
            response.status,
            false
          );
        }

      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof AcuityApiError) {
          lastError = error;
        } else if (error.name === 'AbortError') {
          lastError = new AcuityApiError(
            'Request timeout',
            undefined,
            true,
            true
          );
        } else {
          const errorMessage = error instanceof Error ? error.message : String(error);
          lastError = new AcuityApiError(
            `Network error: ${errorMessage}`,
            undefined,
            true
          );
        }
      }

      // Don't retry if error is not retryable or we've exhausted attempts
      if (!lastError.isRetryable || attempt === maxRetries) {
        break;
      }

      // Wait before retrying
      const delay = this.calculateBackoffDelay(attempt, baseDelay, maxDelay);
      await this.sleep(delay);
    }

    // Throw the last recorded error
    throw lastError;
  }

  async getAvailabilityMonth(appointmentTypeId: string, timezone: string, month: string): Promise<any> {
    const endpoint = `/availability/dates?appointmentTypeId=${appointmentTypeId}&timezone=${encodeURIComponent(timezone)}&month=${month}`;
    return this.fetchWithRetry(endpoint);
  }

  async getAvailabilityDay(appointmentTypeId: string, timezone: string, date: string): Promise<any> {
    const endpoint = `/availability/times?appointmentTypeId=${appointmentTypeId}&timezone=${encodeURIComponent(timezone)}&date=${date}`;
    return this.fetchWithRetry(endpoint);
  }

  async getAvailabilityRange(
    appointmentTypeId: string, 
    timezone: string, 
    startDate: string, 
    endDate: string
  ): Promise<{ dates: string[], times: Record<string, string[]> }> {
    // Calculate month windows needed for the range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const monthsToFetch = new Set<string>();

    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
      monthsToFetch.add(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
      current.setMonth(current.getMonth() + 1);
    }

    // Fetch all months concurrently
    const monthPromises = Array.from(monthsToFetch).map(month => 
      this.getAvailabilityMonth(appointmentTypeId, timezone, month)
    );

    const monthResults = await Promise.all(monthPromises);

    // Merge and filter results
    const allDates = new Set<string>();
    monthResults.forEach(result => {
      result.forEach((date: string) => {
        if (date >= startDate && date <= endDate) {
          allDates.add(date);
        }
      });
    });

    // Fetch times for all available dates with concurrency limiting
    const dates = Array.from(allDates).sort();
    const times: Record<string, string[]> = {};

    // Process in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < dates.length; i += batchSize) {
      const batch = dates.slice(i, i + batchSize);
      const timePromises = batch.map(date => 
        this.getAvailabilityDay(appointmentTypeId, timezone, date)
          .then(result => ({ date, times: result }))
          .catch(error => ({ date, times: [], error }))
      );

      const batchResults = await Promise.all(timePromises);
      batchResults.forEach(({ date, times: dateTimes }) => {
        times[date] = Array.isArray(dateTimes) ? dateTimes.sort() : [];
      });
    }

    return { dates, times };
  }
}

// Factory function for creating configured client
export function createAcuityClient(): AcuityClient {
  const apiKey = process.env.ACUITY_API_KEY;
  const userId = process.env.ACUITY_USER_ID;

  if (!apiKey || !userId) {
    throw new Error('Missing required Acuity configuration: ACUITY_API_KEY and ACUITY_USER_ID must be set');
  }

  return new AcuityClient({ apiKey, userId });
}