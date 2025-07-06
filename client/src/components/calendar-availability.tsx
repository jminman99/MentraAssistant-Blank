import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { format, addDays, isSameDay } from "date-fns";

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  const mentorIds = selectedMentors.length > 0 ? selectedMentors : selectedMentorIds;
  
  const detectedCouncilMode = useMemo(() => {
    const result = isCouncilMode || sessionDuration === 60 || mentorIds.length > 1;
    return result;
  }, [isCouncilMode, sessionDuration, mentorIds]);

  const generateTimeSlots = useCallback((duration: number) => {
    const slots: TimeSlot[] = [];
    const startHour = 9; // 9 AM
    const endHour = 17; // 5 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      if (duration === 30) {
        slots.push({
          time: `${hour.toString().padStart(2, '0')}:00`,
          available: true,
        });
        slots.push({
          time: `${hour.toString().padStart(2, '0')}:30`,
          available: true,
        });
      } else {
        slots.push({
          time: `${hour.toString().padStart(2, '0')}:00`,
          available: true,
        });
      }
    }
    
    return slots;
  }, []);

  const duration = detectedCouncilMode ? 60 : sessionDuration;
  const timeSlots = generateTimeSlots(duration);

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
    if (onDateTimeSelect && selectedTime) {
      onDateTimeSelect(date, selectedTime);
    }
  };

  const handleTimeSelect = (time: string) => {
    if (onTimeSelect) {
      onTimeSelect(currentDate, time);
    }
    if (onDateTimeSelect) {
      onDateTimeSelect(currentDate, time);
    }
  };

  const dates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <div>
        <h4 className="font-medium text-slate-900 mb-3">Select Date</h4>
        <div className="grid grid-cols-7 gap-2">
          {dates.map((date) => (
            <Button
              key={date.toISOString()}
              variant={isSameDay(date, selectedDate || currentDate) ? "default" : "outline"}
              className="h-12 flex flex-col items-center justify-center text-xs"
              onClick={() => handleDateSelect(date)}
            >
              <div className="font-medium">{format(date, 'EEE')}</div>
              <div>{format(date, 'd')}</div>
            </Button>
          ))}
        </div>
      </div>

      {/* Time Selection */}
      <div>
        <h4 className="font-medium text-slate-900 mb-3">
          Available Times ({duration} minutes)
        </h4>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {timeSlots.map((slot) => (
            <Button
              key={slot.time}
              variant={selectedTime === slot.time ? "default" : "outline"}
              className="h-10 text-sm"
              onClick={() => handleTimeSelect(slot.time)}
              disabled={!slot.available}
            >
              {slot.time}
            </Button>
          ))}
        </div>
      </div>

      {detectedCouncilMode && (
        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
          Council sessions require 60-minute time slots for comprehensive guidance.
        </div>
      )}
    </div>
  );
}

export { CalendarAvailability };