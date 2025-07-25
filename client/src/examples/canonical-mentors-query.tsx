import { useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface HumanMentor {
  id: number;
  user: {
    firstName: string;
    lastName: string;
  };
  expertise: string;
  rating: string;
  hourlyRate: string;
  organizationId: number;
}

export function useSubscriptionAccess() {
  const { user, isLoaded } = useAuth();

  return useMemo(() => {
    if (!isLoaded) {
      return { hasAccess: false, isLoading: true };
    }

    if (!user) {
      return { hasAccess: false, isLoading: false };
    }

    // Since we're now single-tier, all authenticated users have access
    return { hasAccess: true, isLoading: false };
  }, [user?.id, isLoaded]);
}

export function useCanonicalMentorsQuery() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  return useQuery({
    queryKey: ['human-mentors'],
    queryFn: () => apiRequest<HumanMentor[]>('/api/human-mentors', {}, () => getToken({ template: 'mentra-api' })),
    enabled: isLoaded && isSignedIn,
    staleTime: 300000
  });
}