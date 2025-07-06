import { useState, useEffect, useMemo } from "react";
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
  selectedMentors = [],
  mentors = [],
  onTimeSelect,
  selectedDate,
  selectedTime,
  selectedMentorIds = [],
  onDateTimeSelect,
  availabilityData,
  isLoadingAvailability = false,
  sessionDuration = 30,
  isCouncilMode = false
}: CalendarAvailabilityProps) {
  const [date, setDate] = useState<Date | undefined>(selectedDate);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const mentorIds = selectedMentors.length > 0 ? selectedMentors : selectedMentorIds;
  
  const detectedCouncilMode = useMemo(() => {
    const result = isCouncilMode || sessionDuration === 60 || mentorIds.length > 1;
    // detectedCouncilMode calculation: {
      isCouncilMode,
      sessionDuration,
      mentorIdsLength: mentorIds.length,
      result
    });
    return result;
  }, [isCouncilMode, sessionDuration, mentorIds]);
  
  // CalendarAvailability props: {
    mentorIds,
    isCouncilMode: detectedCouncilMode,
    sessionDuration,
    originalIsCouncilMode: isCouncilMode,
    selectedMentorsLength: selectedMentors.length,
    selectedMentorIdsLength: selectedMentorIds.length,
    mentorIdsArray: mentorIds
  });

  // Generate time slots based on session duration
  const generateTimeSlots = (duration: number) => {
    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 17; // 5 PM
    
    // // console.log('[DEBUG] generateTimeSlots called with duration:', duration);
    
    // Always check duration explicitly to ensure correct slot generation
    if (duration === 30) {
      // 30-minute intervals for individual sessions
      for (let hour = startHour; hour < endHour; hour++) {
        // // console.log('[DEBUG] Adding 30-min slots for hour:', hour);
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    } else {
      // 60-minute intervals for council sessions (duration !== 30)
      for (let hour = startHour; hour < endHour; hour++) {
        // // console.log('[DEBUG] Adding 60-min slot for hour:', hour);
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
      }
    }
    
    // // console.log('[DEBUG] Final slots array:', slots);
    return slots;
  };
  
  const timeSlots = useMemo(() => {
    const duration = detectedCouncilMode ? 60 : 30;
    // // console.log('[DEBUG] Using session duration for slots:', duration);
    // // console.log('[DEBUG] Final duration decision:', duration, {
      detectedCouncilMode,
      isCouncilMode,
      sessionDuration,
      selectedMentorsCount: selectedMentors.length,
      selectedMentorIdsCount: selectedMentorIds.length
    });
    const slots = generateTimeSlots(duration);
    // // console.log('[DEBUG] Generated slots:', slots);
    return slots;
  }, [detectedCouncilMode]);

  // For individual sessions, always show all slots as available
  useEffect(() => {
    if (!date) return;

    if (!detectedCouncilMode) {
      // Individual booking - show all slots as available, no API calls
      const slots = timeSlots.map(time => ({ time, available: true }));
      setAvailableSlots(slots);
    } else if (mentorIds.length > 0) {
      // Council mode - would need API call, but simplified for now
      const slots = timeSlots.map(time => ({ time, available: true }));
      setAvailableSlots(slots);
    }
  }, [date, detectedCouncilMode, timeSlots]);

  const handleTimeClick = (time: string) => {
    if (!date) return;
    
    if (onTimeSelect) {
      onTimeSelect(date, time);
    }
    
    if (onDateTimeSelect) {
      onDateTimeSelect(date, time);
    }
  };

  const isTimeSelected = (time: string) => {
    return selectedTime === time && date && selectedDate && isSameDay(date, selectedDate);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 mb-4">Select Date</h3>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border border-slate-200"
          disabled={(date) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return date < today;
          }}
        />
      </div>

      {date && (
        <div>
          <h3 className="text-lg font-medium text-slate-900 mb-4">
            Available Times - {format(date, 'MMMM d, yyyy')}
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            {detectedCouncilMode 
              ? "Select an hour-long time slot with your council" 
              : "Select a 30-minute time slot with your mentor"
            }
          </p>
          
          {loading && (
            <div className="text-center py-4">
              <p className="text-slate-600">Loading availability...</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {availableSlots.map((slot) => (
              <Button
                key={slot.time}
                variant={isTimeSelected(slot.time) ? "default" : "outline"}
                className={`
                  flex items-center justify-center h-12
                  ${slot.available 
                    ? (isTimeSelected(slot.time) 
                      ? 'bg-slate-900 hover:bg-slate-800 text-white' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')
                    : 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed'
                  }
                `}
                onClick={() => slot.available && handleTimeClick(slot.time)}
                disabled={!slot.available}
              >
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">{slot.time}</span>
                  {slot.available ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </Button>
            ))}
          </div>

          {availableSlots.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-slate-600">No available time slots for this date.</p>
            </div>
          )}

          {selectedTime && (
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium text-slate-900">
                  Time Selected: {format(date, 'MMM d, yyyy')} at {selectedTime}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}