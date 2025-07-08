import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let errorMessage = `${res.status}: ${text}`;
    
    // Handle token expiration errors specifically
    if (res.status === 401) {
      try {
        const errorData = JSON.parse(text);
        if (errorData.code === 'TOKEN_EXPIRED') {
          errorMessage = 'Session expired. Please sign in again.';
        }
      } catch (parseError) {
        // If we can't parse the error, use the default message
      }
    }
    
    throw new Error(errorMessage);
  }
}

// Global token provider function - will be set by ClerkTokenProvider
let getTokenFn: (() => Promise<string | null>) | null = null;

export function setTokenProvider(tokenFn: () => Promise<string | null>) {
  getTokenFn = tokenFn;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  // Add Content-Type for requests with data
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add fresh Clerk token if available
  if (getTokenFn) {
    try {
      const token = await getTokenFn();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Failed to get fresh token:", error);
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // Add fresh Clerk token if available
    if (getTokenFn) {
      try {
        const token = await getTokenFn();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      } catch (error) {
        console.error("Failed to get fresh token for query:", error);
      }
    }

    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
