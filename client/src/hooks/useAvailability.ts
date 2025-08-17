import { useQuery, UseQueryResult, useMutation, UseMutationResult } from "@tanstack/react-query";
import { jsonGet } from "@/lib/fetcher";

type MonthResponse = {
  success: true;
  data: string[];           // ["YYYY-MM-DD", ...]
  cached: boolean;
  timestamp: string;
};

type DayResponse = {
  success: true;
  data: string[]; // ISO strings w/ TZ offset
  cached: false;
  timestamp: string;
};

type RangeResponse = {
  success: true;
  data: { dates: string[]; times: Record<string, string[]> };
  cached: false;
  timestamp: string;
};

type SessionBookingRequest = {
  appointmentTypeId: string;
  date: string; // ISO date string
  time: string; // ISO time string with offset
  timezone: string;
};

type SessionBookingResponse = {
  id: string;
  appointmentTypeId: string;
  date: string;
  time: string;
  timezone: string;
  userId: string;
  createdAt: string;
};

export function useAvailabilityMonth(
  appointmentTypeId: string,
  timezone: string,
  monthYYYYMM: string,
  opts?: { enabled?: boolean }
): UseQueryResult<string[], Error> {
  const enabled = !!appointmentTypeId && !!timezone && !!monthYYYYMM && (opts?.enabled ?? true);

  return useQuery<string[], Error>({
    queryKey: ["availability", "month", appointmentTypeId, timezone, monthYYYYMM],
    queryFn: async () => {
      const url = `/api/availability/month?appointmentTypeId=${encodeURIComponent(
        appointmentTypeId
      )}&timezone=${encodeURIComponent(timezone)}&month=${encodeURIComponent(monthYYYYMM)}`;

      const res = await jsonGet<MonthResponse>(url);
      return res.data;
    },
    enabled,
    staleTime: 60_000,     // 1 minute
    gcTime: 5 * 60_000,    // 5 minutes
    retry: (failureCount, error) => {
      // don't hammer on auth errors
      if ((error as any)?.status === 401) return false;
      return failureCount < 2;
    },
  });
}

export function useAvailabilityDay(
  appointmentTypeId: string,
  timezone: string,
  dateYYYYMMDD: string,
  opts?: { enabled?: boolean }
): UseQueryResult<string[], Error> {
  const enabled = !!appointmentTypeId && !!timezone && !!dateYYYYMMDD && (opts?.enabled ?? true);

  return useQuery<string[], Error>({
    queryKey: ["availability", "day", appointmentTypeId, timezone, dateYYYYMMDD],
    queryFn: async () => {
      const url = `/api/availability/day?appointmentTypeId=${encodeURIComponent(
        appointmentTypeId
      )}&timezone=${encodeURIComponent(timezone)}&date=${encodeURIComponent(dateYYYYMMDD)}`;

      const res = await jsonGet<DayResponse>(url);
      return res.data;
    },
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: (failureCount, error) => {
      if ((error as any)?.status === 401) return false;
      return failureCount < 2;
    },
  });
}

export function useAvailabilityRange(
  appointmentTypeId: string,
  timezone: string,
  startDateYYYYMMDD: string,
  endDateYYYYMMDD: string,
  opts?: { enabled?: boolean }
): UseQueryResult<RangeResponse["data"], Error> {
  const enabled =
    !!appointmentTypeId && !!timezone && !!startDateYYYYMMDD && !!endDateYYYYMMDD && (opts?.enabled ?? true);

  return useQuery<RangeResponse["data"], Error>({
    queryKey: [
      "availability",
      "range",
      appointmentTypeId,
      timezone,
      startDateYYYYMMDD,
      endDateYYYYMMDD,
    ],
    queryFn: async () => {
      const url = `/api/availability/range?appointmentTypeId=${encodeURIComponent(
        appointmentTypeId
      )}&timezone=${encodeURIComponent(timezone)}&startDate=${encodeURIComponent(
        startDateYYYYMMDD
      )}&endDate=${encodeURIComponent(endDateYYYYMMDD)}`;

      const res = await jsonGet<RangeResponse>(url);
      return res.data;
    },
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: (failureCount, error) => {
      if ((error as any)?.status === 401) return false;
      return failureCount < 2;
    },
  });
}

// Hook for booking individual sessions
type SessionBookingData = {
  humanMentorId: string;
  scheduledDate: string;
  duration: number;
  sessionGoals: string;
};

type SessionBookingResponse = {
  success: boolean;
  data?: {
    message: string;
    bookingId?: string;
  };
  error?: {
    message: string;
  };
};

export function useSessionBooking(): UseMutationResult<SessionBookingResponse, Error, SessionBookingData> {
  return useMutation<SessionBookingResponse, Error, SessionBookingData>({
    mutationFn: async (bookingData) => {
      const response = await fetch('/api/session-bookings', {
        method: 'POST',
        credentials: 'include', // Send Clerk cookies automatically
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const text = await response.text();
      let result: any = null;
      try {
        result = text ? JSON.parse(text) : null;
      } catch {
        // non-JSON response
      }

      if (!response.ok) {
        const errorMessage = result?.error?.message || result?.message || text || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      return result as SessionBookingResponse;
    },
    retry: (failureCount, error) => {
      // don't retry on auth errors or client errors
      if ((error as any)?.status === 401 || (error as any)?.status === 400) return false;
      return failureCount < 1;
    },
  });
}