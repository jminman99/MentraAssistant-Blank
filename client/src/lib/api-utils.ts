import { parseApiJson } from "@/lib/utils";
import { getClerkToken } from "@/lib/auth-helpers";

/**
 * Standardized fetch with Clerk token authentication
 */
export async function fetchWithClerkToken(
  getToken: () => Promise<string | null>,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let token: string | null = null;
  let attempts = 0;
  const maxAttempts = 3;

  // Retry loop to handle Clerk hydration race conditions
  while (attempts < maxAttempts && !token) {
    try {
      token = await getToken();
      if (token) break;
    } catch (error) {
      console.warn(`Token fetch attempt ${attempts + 1} failed:`, error);
    }

    attempts++;
    if (attempts < maxAttempts && !token) {
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 200 * attempts));
    }
  }

  if (!token) {
    throw new Error('No authentication token available after retries');
  }

  // Safely handle headers - ensure we have a plain object
  const baseHeaders: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Merge with existing headers if they exist
  if (options.headers) {
    if (options.headers instanceof Headers) {
      // Convert Headers object to plain object
      options.headers.forEach((value, key) => {
        baseHeaders[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      // Handle array format
      options.headers.forEach(([key, value]) => {
        baseHeaders[key] = value;
      });
    } else {
      // Handle plain object
      Object.assign(baseHeaders, options.headers);
    }
  }

  return fetch(url, {
    ...options,
    headers: baseHeaders,
  });
}

/**
 * Process API response with standardized error handling
 */
export async function processApiResponse<T = any>(response: Response): Promise<T> {
  const raw = await response.text().catch(() => '');

  if (!response.ok) {
    try {
      const errorData = parseApiJson(raw);
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
    } catch {
      throw new Error(raw || `HTTP ${response.status}`);
    }
  }

  try {
    const json = parseApiJson<T>(raw);
    if (json?.success === false) {
      throw new Error(json.message || json.error || 'API request failed');
    }
    return json;
  } catch {
    throw new Error(`Non-JSON response: ${raw}`);
  }
}

/**
 * Enhanced fetch with token, retry logic, and automatic response processing
 */
export async function fetchWithTokenAndProcess(getToken: any, endpoint: string, options: RequestInit = {}) {
  try {
    // Get fresh token with multiple fallback strategies
    let token;
    let tokenSource = 'unknown';

    try {
      token = await getToken({ template: 'mentra-api' });
      tokenSource = 'mentra-api';
    } catch (e1) {
      console.log('mentra-api template failed, trying default');
      try {
        token = await getToken({ template: 'default' });
        tokenSource = 'default';
      } catch (e2) {
        console.log('default template failed, trying without template');
        try {
          token = await getToken();
          tokenSource = 'no-template';
        } catch (e3) {
          console.error('All token strategies failed:', { e1, e2, e3 });
          throw new Error('No authentication token available');
        }
      }
    }

    if (!token) {
      throw new Error('No authentication token available');
    }

    console.log('🔑 Fresh token fetched:', token ? `Token obtained via ${tokenSource}` : 'No token');
    console.log('Auth token being sent:', token ? 'Token present' : 'No token');

    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log(`API Response [${endpoint}]:`, response.status, response.statusText);

    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
      } catch {
        errorText = 'Unable to read error response';
      }
      console.error(`API Error ${response.status} [${endpoint}]:`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`API Success [${endpoint}]:`, data?.data?.length || 'response received');
    return data;

  } catch (error) {
    console.error(`API request failed [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Standardized API data extraction
 */
export function extractApiData<T>(response: any): T[] {
  return Array.isArray(response?.data) ? response.data : [];
}

/**
 * Sort mentors by rating (highest first)
 */
export function sortMentorsByRating(mentors: any[]) {
  return [...mentors].sort((a, b) => {
    const ratingA = parseFloat(a.rating || '0');
    const ratingB = parseFloat(b.rating || '0');
    return ratingB - ratingA;
  });
}