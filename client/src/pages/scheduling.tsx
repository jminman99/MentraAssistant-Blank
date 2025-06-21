import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, User } from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CalendarAvailability from "@/components/calendar-availability";

export default function Scheduling() {
  const [, params] = useRoute("/schedule/:mentorId");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const mentorId = params?.mentorId ? parseInt(params.mentorId) : null;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [sessionGoals, setSessionGoals] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch mentor information
  const { data: mentor, isLoading: mentorLoading } = useQuery({
    queryKey: ['/api/human-mentors', mentorId],
    enabled: !!mentorId,
  });

  // Fetch availability data
  const { data: availability, isLoading: availabilityLoading } = useQuery({
    queryKey: ['/api/mentor-availability', mentorId],
    enabled: !!mentorId,
  });

  const handleDateTimeSelect = (date: Date, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !mentorId) return;
    
    setIsLoading(true);
    try {
      const scheduledDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const bookingData = {
        humanMentorId: mentorId,
        sessionType: 'individual',
        scheduledAt: scheduledDateTime.toISOString(),
        duration: 60,
        sessionGoals: sessionGoals || null,
        meetingType: 'video',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Session Booked!",
          description: result.message || "Your session has been scheduled successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
        navigate('/dashboard');
      } else {
        const error = await response.json();
        console.error('[DEBUG] Booking error:', error);
        throw new Error(error.message || 'Booking failed');
      }
    } catch (error: any) {
      console.error('Booking failed:', error);
      toast({
        title: "Booking Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!mentorId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Invalid mentor ID</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mentorLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <div className="h-8 bg-slate-200 rounded animate-pulse" />
          <div className="h-64 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Mentor not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <img 
              src={mentor.user.profileImage || `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64`} 
              alt={`${mentor.user.firstName} ${mentor.user.lastName}`} 
              className="w-12 h-12 rounded-full object-cover"
            />
            Book a Session with {mentor.user.firstName} {mentor.user.lastName}
          </CardTitle>
          <CardDescription>
            {mentor.expertise} • ${mentor.hourlyRate}/hour • {mentor.rating}/5 rating
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Calendar and Time Selection - Full width unified interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Select Date & Time
          </CardTitle>
          <CardDescription>
            Choose when you'd like to meet with {mentor.user.firstName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CalendarAvailability
            selectedMentors={mentorId ? [mentorId] : []}
            mentors={mentor ? [mentor] : []}
            onTimeSelect={handleDateTimeSelect}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
          />
        </CardContent>
      </Card>

      {/* Session Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Session Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Session Goals (Optional)</label>
            <Textarea
              placeholder="What would you like to discuss or achieve in this session?"
              value={sessionGoals}
              onChange={(e) => setSessionGoals(e.target.value)}
              className="min-h-20"
            />
          </div>

          <Button
            onClick={handleBooking}
            disabled={!selectedDate || !selectedTime || isLoading}
            className="w-full"
          >
            {isLoading ? "Booking..." : "Book Session"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}