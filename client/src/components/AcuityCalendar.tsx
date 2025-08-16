
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  format, isSameMonth, isToday
} from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle } from "lucide-react";

type AvailabilityMap = Record<string, string[]>;

interface AcuityCalendarProps {
  appointmentTypeId: string;
  initialMonth?: Date;
  timezone?: string;
  onSelect?: (isoTime: string) => void;
}

function ymd(d: Date) { return format(d, "yyyy-MM-dd"); }
function ym(d: Date)  { return format(d, "yyyy-MM"); }

export default function AcuityCalendar({
  appointmentTypeId,
  initialMonth = new Date(),
  timezone,
  onSelect
}: AcuityCalendarProps) {
  const tz = useMemo(
    () => timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Kentucky/Louisville",
    [timezone]
  );

  const [month, setMonth] = useState<Date>(startOfMonth(initialMonth));
  const [monthDates, setMonthDates] = useState<Set<string>>(new Set());
  const [timesByDate, setTimesByDate] = useState<AvailabilityMap>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthCache = useRef<Map<string, Set<string>>>(new Map());

  // Fetch available dates for the month
  const fetchMonthDates = async (targetMonth: Date) => {
    const monthKey = ym(targetMonth);
    
    if (monthCache.current.has(monthKey)) {
      setMonthDates(monthCache.current.get(monthKey)!);
      return;
    }

    setLoadingMonth(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        appointmentTypeId,
        month: monthKey,
        timezone: tz
      });

      const response = await fetch(`/api/get-acuity-dates?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (data.success && data.availableDates) {
        const datesSet = new Set(data.availableDates);
        setMonthDates(datesSet);
        monthCache.current.set(monthKey, datesSet);
      } else {
        setMonthDates(new Set());
      }
    } catch (err) {
      console.error('Failed to fetch month dates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dates');
      setMonthDates(new Set());
    } finally {
      setLoadingMonth(false);
    }
  };

  // Fetch available times for a specific date
  const fetchDayTimes = async (date: string) => {
    if (timesByDate[date]) {
      return; // Already cached
    }

    setLoadingDay(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        appointmentTypeId,
        date,
        timezone: tz
      });

      const response = await fetch(`/api/get-acuity-availability?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (data.success && data.availability) {
        setTimesByDate(prev => ({
          ...prev,
          [date]: data.availability[date] || []
        }));
      } else {
        setTimesByDate(prev => ({
          ...prev,
          [date]: []
        }));
      }
    } catch (err) {
      console.error('Failed to fetch day times:', err);
      setError(err instanceof Error ? err.message : 'Failed to load times');
      setTimesByDate(prev => ({
        ...prev,
        [date]: []
      }));
    } finally {
      setLoadingDay(false);
    }
  };

  // Load month data when month changes
  useEffect(() => {
    fetchMonthDates(month);
  }, [month, appointmentTypeId, tz]);

  // Load day data when date is selected
  useEffect(() => {
    if (selectedDate && monthDates.has(selectedDate)) {
      fetchDayTimes(selectedDate);
    }
  }, [selectedDate, appointmentTypeId, tz]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDate(null);
      return;
    }

    const dateStr = ymd(date);
    setSelectedDate(dateStr);
  };

  const handleTimeSelect = (time: string) => {
    if (onSelect) {
      onSelect(time);
    }
  };

  const isDateAvailable = (date: Date) => {
    return monthDates.has(ymd(date));
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: tz
      });
    } catch {
      return isoString;
    }
  };

  const availableTimes = selectedDate ? (timesByDate[selectedDate] || []) : [];

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div>
        <h3 className="text-lg font-medium text-slate-900 mb-4">
          Select Date
          {loadingMonth && <span className="text-sm text-slate-500 ml-2">(Loading...)</span>}
        </h3>
        
        <Calendar
          mode="single"
          selected={selectedDate ? new Date(selectedDate) : undefined}
          onSelect={handleDateSelect}
          month={month}
          onMonthChange={setMonth}
          disabled={(date) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return date < today || !isDateAvailable(date);
          }}
          className="rounded-md border border-slate-200"
        />
        
        {monthDates.size === 0 && !loadingMonth && (
          <p className="text-sm text-slate-500 mt-2">
            No available dates found for {format(month, 'MMMM yyyy')}
          </p>
        )}
      </div>

      {selectedDate && (
        <div>
          <h3 className="text-lg font-medium text-slate-900 mb-4">
            Available Times - {format(new Date(selectedDate), 'MMMM d, yyyy')}
            {loadingDay && <span className="text-sm text-slate-500 ml-2">(Loading...)</span>}
          </h3>

          {loadingDay ? (
            <div className="text-center py-4">
              <p className="text-slate-600">Loading available times...</p>
            </div>
          ) : availableTimes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600">No available time slots for this date.</p>
              <p className="text-sm text-slate-500 mt-1">Please try selecting a different date.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableTimes.map((time, index) => (
                <Button
                  key={`${time}-${index}`}
                  variant="outline"
                  className="flex items-center justify-center h-12 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  onClick={() => handleTimeSelect(time)}
                >
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">{formatTime(time)}</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
