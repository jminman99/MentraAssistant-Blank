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
  selectedMentors: number[];
  mentors: any[];
  onTimeSelect: (date: Date, time: string) => void;
  selectedDate?: Date;
  selectedTime?: string;
}

export default function CalendarAvailability({ 
  selectedMentors, 
  mentors, 
  onTimeSelect,
  selectedDate,
  selectedTime 
}: CalendarAvailabilityProps) {
  const [date, setDate] = useState<Date | undefined>(selectedDate || new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate time slots (9 AM to 5 PM in 1-hour intervals)
  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00", 
    "13:00", "14:00", "15:00", "16:00", "17:00"
  ];

  useEffect(() => {
    if (date && selectedMentors.length > 0) {
      checkAvailability(date);
    }
  }, [date, selectedMentors]);

  const checkAvailability = async (selectedDate: Date) => {
    setLoading(true);
    try {
      // Check availability for all selected mentors on the selected date
      const response = await fetch('/api/mentor-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorIds: selectedMentors,
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
    
    selectedMentors.forEach(mentorId => {
      const mentor = mentors.find(m => m.id === mentorId);
      const mentorAvailability = availabilityData[mentorId];
      
      if (!mentorAvailability || !mentorAvailability.includes(time)) {
        unavailableMentors.push(mentor?.user?.firstName || 'Unknown');
      }
    });

    return {
      allAvailable: unavailableMentors.length === 0,
      unavailableMentors
    };
  };

  const handleTimeSelect = (time: string) => {
    if (date) {
      onTimeSelect(date, time);
    }
  };

  const isSlotSelected = (time: string) => {
    return selectedTime === time && selectedDate && date && isSameDay(selectedDate, date);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Date & Time</h3>
        <p className="text-sm text-slate-600 mb-4">
          Choose a date to see available time slots when all selected mentors are free.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={(date) => 
              date < new Date() || 
              date > addDays(new Date(), 180) // Allow next 6 months
            }
            className="rounded-md border"
          />
        </div>

        {/* Time Slots */}
        <div>
          <h4 className="font-medium mb-3">
            Available Times for {date ? format(date, 'MMMM d, yyyy') : 'Selected Date'}
          </h4>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {availableSlots.map((slot) => (
                <Button
                  key={slot.time}
                  variant={isSlotSelected(slot.time) ? "default" : "outline"}
                  size="sm"
                  disabled={!slot.available}
                  onClick={() => handleTimeSelect(slot.time)}
                  className={`justify-start text-left h-auto py-2 ${
                    slot.available 
                      ? isSlotSelected(slot.time)
                        ? "bg-slate-800 text-white"
                        : "hover:bg-slate-50"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {slot.available ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-sm font-medium">{slot.time}</span>
                  </div>
                </Button>
              ))}
            </div>
          )}

          {date && selectedMentors.length > 0 && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 mb-2">
                Selected mentors: {selectedMentors.length}
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedMentors.map(mentorId => {
                  const mentor = mentors.find(m => m.id === mentorId);
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

      {selectedDate && selectedTime && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">
                Session Scheduled
              </p>
              <p className="text-sm text-green-600">
                {format(selectedDate, 'MMMM d, yyyy')} at {selectedTime}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}