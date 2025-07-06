import { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { format, addDays, isSameDay, parse, isAfter, isBefore } from "date-fns";

interface TimeSlot {
  time: string;
  available: boolean;
  mentorId?: number;
  mentorName?: string;
}

interface CalendarAvailabilityProps {
  selectedMentors?: number[];
  mentors: any[];
  onTimeSelect?: (date: Date, time: string) => void;
  selectedDate?: Date;
  selectedTime?: string;
  selectedMentorIds?: number[];
  onDateTimeSelect?: (date: Date, time: string) => void;
  availabilityData?: any;
  isLoadingAvailability?: boolean;
  sessionDuration?: number; // 30 for individual, 60 for council
  isCouncilMode?: boolean;
}

export default function CalendarAvailability({ 
  selectedMentors, 
  mentors, 
  onTimeSelect,
  selectedDate,
  selectedTime,
  selectedMentorIds,
  onDateTimeSelect,
  availabilityData,
  isLoadingAvailability,
  sessionDuration = 30,
  isCouncilMode = false
}: CalendarAvailabilityProps) {
  
  // Use council props if available, otherwise use individual props
  const mentorIds = selectedMentorIds || selectedMentors || [];
  const handleTimeSelect = onDateTimeSelect || onTimeSelect || (() => {});
  
  const detectedCouncilMode = useMemo(() => {
    const result = isCouncilMode || sessionDuration === 60 || mentorIds.length > 1;
    // console.log('[DEBUG] detectedCouncilMode calculation:', {
      isCouncilMode,
      sessionDuration,
      mentorIdsLength: mentorIds.length,
      result
    });
    return result;
  }, [isCouncilMode, sessionDuration, mentorIds]);
  
  // console.log('[DEBUG] CalendarAvailability props:', { 
    mentorIds,
    isCouncilMode: detectedCouncilMode,
    sessionDuration
  });
  
  // Override to force council mode interface for both individual and council booking
  const displayMentorIds = selectedMentorIds || selectedMentors || [];
  const isDisplayingCalendar = true; // Always show calendar for individual booking
  const [date, setDate] = useState<Date | undefined>(selectedDate || new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate time slots based on session duration
  const generateTimeSlots = (duration: number) => {
    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 17; // 5 PM
    
    if (duration === 30) {
      // 30-minute slots for individual sessions
      for (let hour = startHour; hour < endHour; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    } else {
      // 60-minute slots for council sessions
      for (let hour = startHour; hour < endHour; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
      }
    }
    
    return slots;
  };
  
  const timeSlots = useMemo(() => {
    const duration = detectedCouncilMode ? 60 : 30;
    // console.log('[DEBUG] Using session duration for slots:', duration);
    return generateTimeSlots(duration);
  }, [detectedCouncilMode]);

  // Memoize individual booking slots
  const individualSlots = useMemo(() => 
    timeSlots.map(time => ({ time, available: true })),
    [timeSlots]
  );

  useEffect(() => {
    if (!date) return;

    if (!detectedCouncilMode) {
      // For individual booking - show all slots as available immediately
      setAvailableSlots(timeSlots.map(time => ({ time, available: true })));
    } else if (displayMentorIds.length > 0) {
      // Only call API for council mode with selected mentors
      checkAvailability(date);
    }
  }, [date, displayMentorIds, detectedCouncilMode]);

  const checkAvailability = useCallback(async (selectedDate: Date) => {
    if (!detectedCouncilMode || displayMentorIds.length === 0) {
      return; // Skip API calls for individual booking
    }
    
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const cacheKey = `${dateKey}-${displayMentorIds.join(',')}`;
    
    // Simple cache to prevent duplicate requests
    if (window.availabilityCache && window.availabilityCache[cacheKey]) {
      setAvailableSlots(window.availabilityCache[cacheKey]);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/mentor-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mentorIds: displayMentorIds,
          date: dateKey
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Process availability data to find common free slots
        const slots = timeSlots.map(time => {
          const availability = checkMentorAvailability(data, time);
          return {
            time,
            available: availability.allAvailable,
            unavailableMentors: availability.unavailableMentors
          };
        });
        
        // Cache the result
        if (!window.availabilityCache) window.availabilityCache = {};
        window.availabilityCache[cacheKey] = slots;
        
        setAvailableSlots(slots);
      } else {
        // Fallback: show all slots as available
        setAvailableSlots(individualSlots);
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      // Fallback: show all slots as available
      setAvailableSlots(individualSlots);
    } finally {
      setLoading(false);
    }
  }, [detectedCouncilMode, displayMentorIds, timeSlots, individualSlots]);

  const checkMentorAvailability = (availabilityData: any, time: string) => {
    // For individual sessions, just check if we have availability data
    if (!detectedCouncilMode) {
      return {
        allAvailable: true, // Show all slots as available for individual booking
        unavailableMentors: []
      };
    }
    
    // For council sessions, check all mentors
    const unavailableMentors: string[] = [];
    
    mentorIds.forEach(mentorId => {
      const mentor = mentors?.find(m => m.id === mentorId);
      const mentorAvailability = availabilityData?.[mentorId];
      
      if (!mentorAvailability || !mentorAvailability.includes(time)) {
        unavailableMentors.push(mentor?.user?.firstName || 'Unknown');
      }
    });

    return {
      allAvailable: unavailableMentors.length === 0,
      unavailableMentors
    };
  };

  const handleTimeClick = (time: string) => {
    if (date) {
      handleTimeSelect(date, time);
    }
  };

  const isSlotSelected = (time: string) => {
    return selectedTime === time && selectedDate && date && isSameDay(selectedDate, date);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const sessionTypeText = detectedCouncilMode ? "60-min" : "30-min";
  const sessionDescription = detectedCouncilMode 
    ? "Select an hour-long time slot with your council"
    : "Select a 30-minute time slot with your mentor";

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h4 className="font-medium text-slate-900 mb-1">Choose Date & Time</h4>
        <p className="text-sm text-slate-600">{sessionDescription}</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={(date) => 
              date < new Date() || 
              date > addDays(new Date(), 180) // 6 months ahead
            }
            className="rounded-md border"
          />
        </div>

        {/* Time Slots */}
        <div>
          <h4 className="font-medium mb-3">Available {sessionTypeText} Slots</h4>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-slate-600">Checking availability...</p>
            </div>
          ) : date ? (
            <div className="grid grid-cols-2 gap-2">
              {availableSlots.map((slot) => (
                <div key={slot.time} className="relative">
                  <Button
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    size="sm"
                    disabled={!slot.available}
                    onClick={() => handleTimeSelect(date, slot.time)}
                    className={`w-full justify-start ${
                      !slot.available 
                        ? 'opacity-50 cursor-not-allowed' 
                        : selectedTime === slot.time 
                          ? 'bg-slate-900 text-white' 
                          : 'hover:bg-slate-100'
                    }`}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {formatTime(slot.time)}
                    {!slot.available && (
                      <XCircle className="h-3 w-3 ml-auto text-red-500" />
                    )}
                    {slot.available && selectedTime === slot.time && (
                      <CheckCircle className="h-3 w-3 ml-auto" />
                    )}
                  </Button>
                  
                  {/* Show unavailable mentors for council mode */}
                  {detectedCouncilMode && !slot.available && slot.unavailableMentors && slot.unavailableMentors.length > 0 && (
                    <div className="mt-1">
                      <p className="text-xs text-red-600">
                        Unavailable: {slot.unavailableMentors.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-600">Select a date to see available times</p>
          )}

          {date && displayMentorIds.length > 0 && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 mb-2">
                Selected mentors: {displayMentorIds.length}
              </p>
              <div className="flex flex-wrap gap-1">
                {Array.isArray(displayMentorIds) ? displayMentorIds.map(mentorId => {
                  const mentor = Array.isArray(mentors) ? mentors.find(m => m.id === mentorId) : null;
                  return (
                    <Badge key={mentorId} variant="secondary" className="text-xs">
                      {mentor?.user?.firstName} {mentor?.user?.lastName}
                    </Badge>
                  );
                }) : []}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedTime && date && (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>
              {detectedCouncilMode ? "Council session" : "Individual session"} selected for{' '}
              <strong>{format(date, 'MMM d, yyyy')}</strong> at{' '}
              <strong>{formatTime(selectedTime)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}