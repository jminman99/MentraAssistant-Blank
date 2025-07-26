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
  const token = await getToken();

  if (!token) {
    throw new Error('No authentication token available');
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