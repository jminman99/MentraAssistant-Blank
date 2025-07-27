export async function apiRequest(method: string, url: string, body?: unknown): Promise<Response> {
  let token: string | null = null;
  try {
    const anyWindow = window as any;
    if (anyWindow?.__clerk?.session?.getToken) {
      token = await anyWindow.__clerk.session.getToken();
    } else if (anyWindow?.Clerk?.session?.getToken) {
      token = await anyWindow.Clerk.session.getToken();
    }
  } catch {
    // Token fetch failed, continue without token
  }
  
  if (!token) console.warn("[apiRequest] No Clerk token available for", method, url);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(url, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
}