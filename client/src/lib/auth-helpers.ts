
import { useAuth } from "@clerk/clerk-react";

export async function getClerkToken(getToken: any): Promise<string> {
  if (!getToken) {
    throw new Error('No authentication available');
  }

  let token: string | null = null;
  try {
    token = await getToken();
  } catch {
    throw new Error('Failed to get authentication token');
  }

  if (!token) {
    throw new Error('Session expired—please sign in');
  }

  return token;
}

export function useClerkToken() {
  const { getToken } = useAuth();
  return (token: any) => getClerkToken(token || getToken);
}
