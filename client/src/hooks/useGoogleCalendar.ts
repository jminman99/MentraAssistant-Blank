import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';

export function useGoogleCalendarStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['googleCalendarStatus', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/google/status', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch Google Calendar status');
      }
      
      return response.json();
    },
    enabled: !!user,
  });
}

export function useConnectGoogleCalendar() {
  const connectGoogleCalendar = () => {
    window.location.href = '/api/google/connect';
  };

  return { connectGoogleCalendar };
}