import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

export function useHumanMentors() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  return useQuery({
    queryKey: ["/api/mentors"],
    enabled: isLoaded && !!user && !!getToken,
    queryFn: async () => {
      if (!getToken) {
        throw new Error('No authentication available');
      }

      const token = await getToken();
      if (!token) {
        throw new Error('No Clerk token (check JWT template name in Clerk dashboard)');
      }

      console.log('[fetch mentors] making request to /api/mentors');
      const res = await fetch('/api/mentors', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('[fetch mentors] response status:', res.status);

      // Parse response with improved error handling
      const raw = await res.text().catch(() => '');
      if (!res.ok) {
        try {
          const j = JSON.parse(raw);
          throw new Error(j.message || j.error || `HTTP ${res.status}`);
        } catch {
          throw new Error(raw || `HTTP ${res.status}`);
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