
import { useEffect, useMemo, useState, useRef } from "react";
import { startOfMonth, endOfMonth, format, startOfToday } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

type MapDay = Record<string, string[]>;

interface MonthResponse {
  dates: string[];
}

interface DayResponse {
  times: string[];
}

interface RangeResponse {
  dates: string[];
  times: Record<string, string[]>;
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
  
  // Caching
  const monthCache = useRef<Map<string, Set<string>>>(new Map());
  const dayCache = useRef<Map<string, string[]>>(new Map());
  
  const ym = format(month, "yyyy-MM");
  const today = startOfToday();

  // Clear selected date if it's not in the new month's dates
  useEffect(() => {
    if (selected && !dates.has(selected)) {
      setSelected(null);
    }
  }, [dates, selected]);

  // Safe JSON parser helper
  const safeParseJSON = async (response: Response): Promise<any> => {
    const contentType = response.headers.get('content-type') || '';
    const bodyText = await response.text();
    
    if (!contentType.includes('application/json')) {
      throw new Error(`Server returned non-JSON content (${response.status}): ${bodyText.slice(0, 200)}...`);
    }
    
    try {
      return JSON.parse(bodyText);
    } catch (parseError) {
      throw new Error(`Invalid JSON from server: ${bodyText.slice(0, 200)}...`);
    }
  };

  // Load available dates for the current month
  useEffect(() => {
    async function loadMonth() {
      if (!appointmentTypeId) return;

      // Check cache first
      if (monthCache.current.has(ym)) {
        setDates(monthCache.current.get(ym)!);
        return;
      }

      const abortController = new AbortController();
      let active = true;

      setLoadingMonth(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/availability/month?appointmentTypeId=${encodeURIComponent(appointmentTypeId)}&timezone=${encodeURIComponent(tz)}&month=${encodeURIComponent(ym)}`,
          { signal: abortController.signal }
        );

        if (!response.ok) {
          const errorData = await safeParseJSON(response).catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result: MonthResponse = await safeParseJSON(response);
        const { dates: monthDates = [] } = result;
        
        if (!Array.isArray(monthDates)) {
          throw new Error('Unexpected availability payload - dates not an array');
        }

        // Filter to current month only and cache
        const filteredDates = monthDates.filter(d => d.startsWith(ym + '-'));
        const dateSet = new Set(filteredDates);
        
        if (active) {
          setDates(dateSet);
          monthCache.current.set(ym, dateSet);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        
        console.error("Failed to load month availability:", err);
        if (active) {
          const errorMsg = err instanceof Error ? err.message : "Failed to load availability";
          setError(`${errorMsg} for ${ym} (type ${appointmentTypeId.slice(0, 8)})`);
          setDates(new Set());
        }
      } finally {
        if (active) {
          setLoadingMonth(false);
        }
      }

      return () => {
        active = false;
        abortController.abort();
      };
    }

    loadMonth();
  }, [appointmentTypeId, tz, ym]);

  // Load times for a specific date
  const loadTimes = async (date: string) => {
    if (!appointmentTypeId) return;

    // Check cache first
    if (dayCache.current.has(date)) {
      setTimes(prev => ({
        ...prev,
        [date]: dayCache.current.get(date)!
      }));
      return;
    }

    const abortController = new AbortController();
    setLoadingDay(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/availability/day?appointmentTypeId=${encodeURIComponent(appointmentTypeId)}&timezone=${encodeURIComponent(tz)}&date=${encodeURIComponent(date)}`,
        { signal: abortController.signal }
      );

      if (!response.ok) {
        const errorData = await safeParseJSON(response).catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: DayResponse = await safeParseJSON(response);
      const { times: dayTimes = [] } = result;
      
      if (!Array.isArray(dayTimes)) {
        throw new Error('Unexpected availability payload - times not an array');
      }
      
      setTimes(prev => ({
        ...prev,
        [date]: dayTimes
      }));
      
      // Cache the result
      dayCache.current.set(date, dayTimes);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      
      console.error("Failed to load day availability:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to load times";
      setError(`${errorMsg} for ${date}`);
    } finally {
      setLoadingDay(false);
    }

    return () => {
      abortController.abort();
    };
  };

  // Load a range of availability (for better performance)
  const loadRange = async (startDate: string, endDate: string) => {
    if (!appointmentTypeId) return;

    const abortController = new AbortController();
    setLoadingMonth(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/availability/range?appointmentTypeId=${encodeURIComponent(appointmentTypeId)}&timezone=${encodeURIComponent(tz)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
        { signal: abortController.signal }
      );

      if (!response.ok) {
        const errorData = await safeParseJSON(response).catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: RangeResponse = await safeParseJSON(response);
      const { dates: rangeDates = [], times: rangeTimeMap = {} } = result;
      
      if (!Array.isArray(rangeDates) || typeof rangeTimeMap !== 'object') {
        throw new Error('Unexpected availability payload');
      }
      
      const dateSet = new Set(rangeDates);
      setDates(dateSet);
      setTimes(prev => ({ ...prev, ...rangeTimeMap }));
      
      // Cache results
      monthCache.current.set(ym, dateSet);
      Object.entries(rangeTimeMap).forEach(([date, times]) => {
        dayCache.current.set(date, times);
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      
      console.error("Failed to load range availability:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to load availability";
      setError(errorMsg);
    } finally {
      setLoadingMonth(false);
    }

    return () => {
      abortController.abort();
    };
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
      return dates.has(dateStr) && date >= today;
    },
    picked: (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return selected === dateStr;
    }
  }), [dates, selected, today]);

  const modifiersStyles = {
    available: {
      backgroundColor: '#e3f2fd',
      color: '#1976d2',
      fontWeight: 'bold'
    },
    picked: {
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
          if (dates.has(dateStr) && date >= today) {
            handleDateSelect(dateStr);
          }
        }}
        disabled={(date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          return !dates.has(dateStr) || date < today || loadingMonth;
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
          ) : times[selected]?.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {times[selected].map((timeIso) => {
                const timeObj = new Date(timeIso);
                const timeStr = timeObj.toLocaleTimeString([], { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true,
                  timeZone: tz
                });
                
                return (
                  <Button
                    key={timeIso}
                    variant="outline"
                    size="sm"
                    onClick={() => handleTimeSelect(timeIso)}
                    disabled={loadingDay}
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
            const start = format(startOfMonth(month), 'yyyy-MM-dd');
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
