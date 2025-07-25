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

export const apiRequest = async (
  path: string,
  opts: RequestInit = {},
  getToken?: () => Promise<string | null>
): Promise<any> => {
  let token = null;

  // Try to get token from parameter or global provider
  if (getToken) {
    try {
      token = await getToken();
    } catch (error) {
      console.error("Failed to get token from parameter:", error);
    }
  } else if (getTokenFn) {
    try {
      token = await getTokenFn();
    } catch (error) {
      console.error("Failed to get token from global provider:", error);
    }
  }

  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
    credentials: "include",
    body:
      opts.body && typeof opts.body !== "string"
        ? JSON.stringify(opts.body)
        : opts.body,
  });

  if (res.status === 401) throw new Error("Unauthorized");
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || res.statusText);
  return json;
};

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