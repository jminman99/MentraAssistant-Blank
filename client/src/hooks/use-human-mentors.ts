

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

export function useHumanMentors() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  return useQuery({
    queryKey: ['human-mentors'],
    queryFn: async () => {
      console.log('[fetch mentors] starting request');
      
      if (!getToken) {
        console.error('[fetch mentors] no getToken function available');
        throw new Error('No authentication available');
      }

      // Get fresh token
      const token = await getToken({ template: 'mentra-api' });
      console.debug('[apiRequest] url', '/api/human-mentors', 'token?', !!token);
      
      if (!token) {
        console.error('[fetch mentors] failed to get token');
        throw new Error('Failed to get authentication token');
      }

      const response = await fetch('/api/human-mentors', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[fetch mentors] response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[fetch mentors] error response:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('[fetch mentors] success:', data);
      return data;
    },
    enabled: isLoaded && isSignedIn,
  });
}
