import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { vercelApiClient } from '../lib/api-client-vercel';
import { setTokenProvider } from '../lib/queryClient';

/**
 * Connects Clerk's authentication tokens to the API client
 * Ensures every API request has fresh, valid tokens
 */
export function ClerkTokenProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn && getToken) {
      // Create a token provider function that always gets fresh tokens
      const tokenProvider = async () => {
        try {
          const token = await getToken();
          console.log('🔑 Fresh token fetched:', token ? 'Token obtained' : 'No token');
          return token;
        } catch (error) {
          console.error('❌ Token fetch failed:', error);
          return null;
        }
      };

      // Wire up both API clients with the same token provider
      vercelApiClient.setTokenProvider(tokenProvider);
      setTokenProvider(tokenProvider);
      
      console.log('✅ Clerk token provider connected to both API clients');
    } else if (isLoaded && !isSignedIn) {
      // Clear token providers when user is not signed in
      vercelApiClient.setTokenProvider(async () => null);
      setTokenProvider(async () => null);
      console.log('🔄 Token providers cleared (user not signed in)');
    }
  }, [getToken, isLoaded, isSignedIn]);

  return <>{children}</>;
}