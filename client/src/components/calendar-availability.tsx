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
  sessionDuration?: number;
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
  isCouncilMode = false,
}: CalendarAvailabilityProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  const mentorIds = selectedMentors.length > 0 ? selectedMentors : selectedMentorIds;

  const detectedCouncilMode = useMemo(() => {
    return isCouncilMode || sessionDuration === 60 || mentorIds.length > 1;
  }, [isCouncilMode, sessionDuration, mentorIds]);

  const generateTimeSlots = useCallback((duration: number) => {
    const slots: TimeSlot[] = [];
    const startHour = 9;
    const endHour = 17;

    for (let hour = startHour; hour < endHour; hour++) {
      if (duration === 30) {
        slots.push({
          time: `${hour.toString().padStart(2, "0")}:00`,
          available: true,
        });
        slots.push({
          time: `${hour.toString().padStart(2, "0")}:30`,
          available: true,
        });
      } else {
        slots.push({
          time: `${hour.toString().padStart(2, "0")}:00`,
          available: true,
        });
      }
    }

    return slots;
  }, []);

  const timeSlots = useMemo(() => {
    return generateTimeSlots(sessionDuration);
  }, [generateTimeSlots, sessionDuration]);

  const handleDateChange = (direction: "prev" | "next") => {
    const newDate =
      direction === "next"
        ? addDays(currentDate, 1)
        : addDays(currentDate, -1);
    setCurrentDate(newDate);
  };

  const handleTimeSelect = (time: string) => {
    if (onTimeSelect) {
      onTimeSelect(currentDate, time);
    }
    if (onDateTimeSelect) {
      onDateTimeSelect(currentDate, time);
    }
  };

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <div className="flex justify-between items-center mb-2">
        <Button onClick={() => handleDateChange("prev")}>Previous</Button>
        <span className="font-semibold text-slate-700">
          {format(currentDate, "PPP")}
        </span>
        <Button onClick={() => handleDateChange("next")}>Next</Button>
      </div>

      {/* Time Slots */}
      <div className="grid grid-cols-3 gap-3">
        {timeSlots.map((slot) => (
          <Button
            key={slot.time}
            variant={selectedTime === slot.time ? "default" : "outline"}
            onClick={() => handleTimeSelect(slot.time)}
            disabled={!slot.available}
          >
            {slot.time}
          </Button>
        ))}
      </div>
    </div>
  );
}

export { CalendarAvailability };