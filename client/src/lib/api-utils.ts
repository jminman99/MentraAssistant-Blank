
import { parseApiJson } from "@/lib/utils";
import { getClerkToken } from "@/lib/auth-helpers";

/**
 * Standardized fetch with Clerk token authentication
 */
export async function fetchWithClerkToken(
  getToken: () => Promise<string>, 
  url: string, 
  options: RequestInit = {}
) {
  try {
    const token = await getClerkToken(getToken);
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
  } catch (error) {
    console.error('Error in fetchWithClerkToken:', error);
    throw error;
  }
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
