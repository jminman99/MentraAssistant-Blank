

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

// Development mock data for when API isn't available
const mockMentors = {
  success: true,
  data: [
    {
      id: 1,
      name: 'Sarah Johnson',
      title: 'Senior Engineering Manager',
      bio: 'Former VP of Engineering at multiple startups. Specializes in technical leadership and scaling engineering teams.',
      expertise: ['Technical Leadership', 'Team Building', 'Career Growth'],
      yearsExperience: 12,
      rating: 4.9,
      isAvailable: true,
      availability: {
        today: true,
        tomorrow: true,
        thisWeek: true,
        nextAvailable: 'Today',
        timeSlots: [
          { time: '9:00', available: true },
          { time: '10:30', available: true },
          { time: '14:00', available: true }
        ]
      }
    },
    {
      id: 2,
      name: 'Marcus Chen',
      title: 'Product Strategy Director',
      bio: 'Led product development at Fortune 500 companies. Expert in product strategy and market positioning.',
      expertise: ['Product Strategy', 'Market Analysis', 'User Research'],
      yearsExperience: 8,
      rating: 4.8,
      isAvailable: true,
      availability: {
        today: false,
        tomorrow: true,
        thisWeek: true,
        nextAvailable: 'Tomorrow',
        timeSlots: [
          { time: '11:00', available: true },
          { time: '15:30', available: true }
        ]
      }
    }
  ],
  hasAccess: true,
  user: {
    id: 1,
    email: 'dev@example.com',
    firstName: 'Dev',
    lastName: 'User'
  }
};

export function useHumanMentors() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const clerkPublishableKey = (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY;

  return useQuery({
    queryKey: ['human-mentors'],
    enabled: clerkPublishableKey ? (isLoaded && isSignedIn) : true, // Always enabled in dev mode
    queryFn: async () => {
      console.log('[fetch mentors] starting request');
      
      // In development mode without Clerk, return mock data
      if (!clerkPublishableKey) {
        console.log('[DEV MODE] Using development mentor data');
        return mockMentors;
      }
      
      if (!getToken) {
        console.error('[fetch mentors] no getToken function available');
        throw new Error('No authentication available');
      }

      const token = await getToken();
      
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
