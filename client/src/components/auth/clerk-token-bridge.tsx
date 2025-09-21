import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { getBearer } from '@/lib/auth/getBearer';
import { setTokenProvider } from '@/lib/queryClient';
import { vercelApiClient } from '@/lib/api-client-vercel';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Bridges Clerk authentication into shared fetch utilities so every API
 * request automatically attaches the latest Clerk session token.
 */
export function ClerkTokenBridge() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const initialized = useRef(false);
  const lastProvider = useRef<(() => Promise<string | null>) | null>(null);

  const provider = useCallback(async () => {
    try {
      return await getBearer(getToken);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to fetch Clerk token', error);
      }
      return null;
    }
  }, [getToken]);

  if (!initialized.current) {
    setTokenProvider(provider);
    vercelApiClient.setTokenProvider(provider);
    initialized.current = true;
  }

  useEffect(() => {
    if (lastProvider.current === provider) {
      return;
    }

    lastProvider.current = provider;
    setTokenProvider(provider);
    vercelApiClient.setTokenProvider(provider);

    queryClient.invalidateQueries({
      predicate: ({ queryKey }) =>
        Array.isArray(queryKey) && typeof queryKey[0] === 'string' && queryKey[0].startsWith('/api/'),
    });
  }, [provider, queryClient]);

  return null;
}

export default ClerkTokenBridge;
