import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { vercelApiClient } from '@/lib/api-client-vercel';

/**
 * Connects Clerk's authentication tokens to the API client
 * Ensures every API request has fresh, valid tokens
 */
export function ClerkTokenProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded && getToken) {
      // Wire up Clerk's getToken to the API client
      vercelApiClient.setTokenProvider(getToken);
      console.log('✅ Clerk token provider connected to API client');
    }
  }, [getToken, isLoaded]);

  return <>{children}</>;
}