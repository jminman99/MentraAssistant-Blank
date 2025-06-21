import { useMutation } from '@tanstack/react-query';

interface BookingData {
  humanMentorId: number;
  scheduledAt: string;
  timezone: string;
  duration: number;
  meetingType: string;
  sessionGoals?: string;
  sessionType: string;
}

const useBookIndividualSession = () => {
  return useMutation({
    mutationFn: async (bookingData: BookingData) => {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for Replit + sessions
        body: JSON.stringify({
          humanMentorId: bookingData.humanMentorId,
          scheduledAt: bookingData.scheduledAt,        // ISO string e.g., '2025-06-21T15:00:00Z'
          timezone: bookingData.timezone,              // e.g., 'America/New_York'
          duration: bookingData.duration,              // in minutes, e.g., 30
          meetingType: bookingData.meetingType,        // 'video' | 'in-person'
          sessionGoals: bookingData.sessionGoals,      // optional
          sessionType: 'individual'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Booking failed');
      }

      return response.json();
    }
  });
};

export default useBookIndividualSession;