

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

export function useHumanMentors() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  return useQuery({
    queryKey: ['human-mentors'],
    enabled: isLoaded && isSignedIn,
    queryFn: async () => {
      console.log('[fetch mentors] starting request');
      
      if (!getToken) {
        console.error('[fetch mentors] no getToken function available');
        throw new Error('No authentication available');
      }

      // Try multiple token templates for compatibility
      let token: string | null = null;
      try {
        token = await getToken({ template: 'mentra-api' });
      } catch {
        // Fallback to default template
        try {
          token = await getToken({ template: 'default' });
        } catch {
          // Final fallback - no template
          token = await getToken();
        }
      }
      
      console.debug('[apiRequest] url', '/api/human-mentors', 'token?', !!token);
      
      if (!token) {
        console.error('[fetch mentors] failed to get token');
        throw new Error('No Clerk token (check JWT template name in Clerk dashboard)');
      }

      const response = await fetch('/api/human-mentors', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('[fetch mentors] response status:', response.status);

      // Parse response with improved error handling
      const raw = await response.text().catch(() => '');
      if (!response.ok) {
        try {
          const j = JSON.parse(raw);
          throw new Error(j.message || j.error || `HTTP ${response.status}`);
        } catch {
          throw new Error(raw || `HTTP ${response.status}`);
        }
      }

      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(`Non-JSON response: ${raw}`);
      }

      if (data?.success === false) {
        throw new Error(data.message || data.error || 'Failed to load mentors');
      }

      console.log('[fetch mentors] success:', data);
      return data;
    },
    staleTime: 0,
    retry: 0,
    refetchOnWindowFocus: false,
  });
}
