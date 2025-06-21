import { useState, useEffect } from "react";
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
  const detectedCouncilMode = isCouncilMode;
  
  console.log('[DEBUG] CalendarAvailability props:', { 
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
      // 30-minute slots
      for (let hour = startHour; hour < endHour; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    } else {
      // 60-minute slots (default)
      for (let hour = startHour; hour < endHour; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
      }
    }
    
    return slots;
  };
  
  const timeSlots = generateTimeSlots(detectedCouncilMode ? 60 : sessionDuration);

  useEffect(() => {
    if (date) {
      if (displayMentorIds.length > 0) {
        checkAvailability(date);
      } else {
        // For individual booking, show available slots even without mentor selection
        const slots = timeSlots.map(time => ({
          time,
          available: true // Show all slots as available for individual booking
        }));
        setAvailableSlots(slots);
      }
    }
  }, [date, displayMentorIds]);

  const checkAvailability = async (selectedDate: Date) => {
    setLoading(true);
    try {
      // Check availability for all selected mentors on the selected date
      const response = await fetch('/api/mentor-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorIds: displayMentorIds,
          date: format(selectedDate, 'yyyy-MM-dd')
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
        
        setAvailableSlots(slots);
      } else {
        // Fallback: assume some slots are available
        const slots = timeSlots.map(time => ({
          time,
          available: Math.random() > 0.3, // Simulate 70% availability
        }));
        setAvailableSlots(slots);
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      // Fallback availability
      const slots = timeSlots.map(time => ({
        time,
        available: Math.random() > 0.3,
      }));
      setAvailableSlots(slots);
    } finally {
      setLoading(false);
    }
  };

  const checkMentorAvailability = (availabilityData: any, time: string) => {
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
    ? "Select a 60-min slot that works for all selected mentors"
    : "Select a 30-min slot with your mentor";

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
                {displayMentorIds.map(mentorId => {
                  const mentor = mentors?.find(m => m.id === mentorId);
                  return (
                    <Badge key={mentorId} variant="secondary" className="text-xs">
                      {mentor?.user?.firstName} {mentor?.user?.lastName}
                    </Badge>
                  );
                })}
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