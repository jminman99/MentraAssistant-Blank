
import { useEffect, useMemo, useState } from "react";
import { startOfMonth, endOfMonth, format, eachDayOfInterval, isSameMonth, isToday, addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

type MapDay = Record<string, string[]>;

interface AvailabilityResponse {
  data: string[] | { dates: string[], times: Record<string, string[]> };
  cached: boolean;
  timestamp: string;
}

export default function BookingCalendar({
  appointmentTypeId,
  timezone,
  onSelect
}: {
  appointmentTypeId: string;
  timezone?: string;
  onSelect: (iso: string) => void;
}) {
  const tz = useMemo(() => timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Kentucky/Louisville", [timezone]);
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [dates, setDates] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [times, setTimes] = useState<MapDay>({});
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const ym = format(month, "yyyy-MM");

  // Load available dates for the current month
  useEffect(() => {
    async function loadMonth() {
      if (!appointmentTypeId) return;

      setLoadingMonth(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/availability/month?appointmentTypeId=${encodeURIComponent(appointmentTypeId)}&timezone=${encodeURIComponent(tz)}&month=${encodeURIComponent(ym)}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const result: AvailabilityResponse = await response.json();
        const monthDates = Array.isArray(result.data) ? result.data : [];
        
        setDates(new Set(monthDates));
      } catch (err) {
        console.error("Failed to load month availability:", err);
        setError(err instanceof Error ? err.message : "Failed to load availability");
        setDates(new Set());
      } finally {
        setLoadingMonth(false);
      }
    }

    loadMonth();
  }, [appointmentTypeId, tz, ym]);

  // Load times for a specific date
  const loadTimes = async (date: string) => {
    if (!appointmentTypeId || times[date]) return;

    setLoadingDay(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/availability/day?appointmentTypeId=${encodeURIComponent(appointmentTypeId)}&timezone=${encodeURIComponent(tz)}&date=${encodeURIComponent(date)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const result: AvailabilityResponse = await response.json();
      const dayTimes = Array.isArray(result.data) ? result.data : [];
      
      setTimes(prev => ({
        ...prev,
        [date]: dayTimes
      }));
    } catch (err) {
      console.error("Failed to load day availability:", err);
      setError(err instanceof Error ? err.message : "Failed to load times");
    } finally {
      setLoadingDay(false);
    }
  };

  // Load a range of availability (for better performance)
  const loadRange = async (startDate: string, endDate: string) => {
    if (!appointmentTypeId) return;

    setLoadingMonth(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/availability/range?appointmentTypeId=${encodeURIComponent(appointmentTypeId)}&timezone=${encodeURIComponent(tz)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const result: AvailabilityResponse = await response.json();
      
      if (typeof result.data === 'object' && 'dates' in result.data) {
        setDates(new Set(result.data.dates));
        setTimes(prev => ({ ...prev, ...result.data.times }));
      }
    } catch (err) {
      console.error("Failed to load range availability:", err);
      setError(err instanceof Error ? err.message : "Failed to load availability");
    } finally {
      setLoadingMonth(false);
    }
  };

  // Handle date selection
  const handleDateSelect = async (date: string) => {
    setSelected(date);
    await loadTimes(date);
  };

  // Handle time selection
  const handleTimeSelect = (timeIso: string) => {
    onSelect(timeIso);
  };

  // Calendar day renderer
  const modifiers = useMemo(() => ({
    available: (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return dates.has(dateStr);
    },
    selected: (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return selected === dateStr;
    }
  }), [dates, selected]);

  const modifiersStyles = {
    available: {
      backgroundColor: '#e3f2fd',
      color: '#1976d2',
      fontWeight: 'bold'
    },
    selected: {
      backgroundColor: '#1976d2',
      color: 'white'
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Calendar
        mode="single"
        month={month}
        onMonthChange={setMonth}
        modifiers={modifiers}
        modifiersStyles={modifiersStyles}
        onDayClick={(date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          if (dates.has(dateStr)) {
            handleDateSelect(dateStr);
          }
        }}
        disabled={(date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          return !dates.has(dateStr);
        }}
        className="rounded-md border"
      />

      {loadingMonth && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600 mt-2">Loading availability...</p>
        </div>
      )}

      {selected && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">
            Available times for {selected}
          </h3>
          
          {loadingDay ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600 mt-1">Loading times...</p>
            </div>
          ) : times[selected] && times[selected].length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {times[selected].map((timeIso) => {
                const timeObj = new Date(timeIso);
                const timeStr = timeObj.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  timeZone: tz
                });
                
                return (
                  <Button
                    key={timeIso}
                    variant="outline"
                    size="sm"
                    onClick={() => handleTimeSelect(timeIso)}
                    className="text-xs"
                  >
                    {timeStr}
                  </Button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No available times for this date</p>
          )}
        </div>
      )}

      {/* Load Range Button for testing */}
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const start = format(month, 'yyyy-MM-dd');
            const end = format(endOfMonth(month), 'yyyy-MM-dd');
            loadRange(start, end);
          }}
          disabled={loadingMonth}
        >
          Load Full Month Range
        </Button>
      </div>
    </div>
  );
}
