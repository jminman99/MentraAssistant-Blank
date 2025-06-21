import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, User } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import CalendarAvailability from "@/components/calendar-availability";

interface HumanMentor {
  id: number;
  user: {
    firstName: string;
    lastName: string;
  };
  expertise: string;
  bio: string;
  rating: string | null;
  hourlyRate: string;
}

export default function IndividualScheduling() {
  const [, params] = useRoute("/schedule/:mentorId");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const mentorId = params?.mentorId ? parseInt(params.mentorId) : null;
  const [mentors, setMentors] = useState<HumanMentor[]>([]);
  const [isLoadingMentors, setIsLoadingMentors] = useState(true);
  const [sessionGoals, setSessionGoals] = useState("");
  const [selectedDateTime, setSelectedDateTime] = useState<{date: Date; time: string} | null>(null);

  // Fetch mentors (same pattern as council booking)
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const response = await fetch('/api/human-mentors', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setMentors(data || []);
        }
      } catch (error) {
        console.error('Failed to fetch mentors:', error);
      } finally {
        setIsLoadingMentors(false);
      }
    };
    fetchMentors();
  }, []);

  const mentor = mentors.find(m => m.id === mentorId);

  const handleDateTimeSelect = (date: Date, time: string) => {
    setSelectedDateTime({ date, time });
  };

  // Individual session booking mutation (same pattern as council booking)
  const { mutate: bookIndividualSession, isPending: isBooking } = useMutation({
    mutationFn: async () => {
      if (!selectedDateTime || !mentorId) throw new Error("Missing booking data");
      
      const scheduledDateTime = new Date(selectedDateTime.date);
      const [hours, minutes] = selectedDateTime.time.split(':');
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const requestBody = {
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
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Booking failed');
      }

      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Session Booked Successfully!",
        description: result.message || `Your session with ${mentor?.user?.firstName} has been scheduled.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      navigate('/dashboard');
    },
    onError: (error: any) => {
      console.error('Individual booking error:', error);
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to book individual session",
        variant: "destructive",
      });
    },
  });

  const handleBookSession = () => {
    if (!selectedDateTime || !sessionGoals.trim() || !mentorId) {
      toast({
        title: "Missing information",
        description: "Please select a date/time and enter session goals.",
        variant: "destructive",
      });
      return;
    }
    bookIndividualSession();
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

  if (isLoadingMentors) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading mentor information...</p>
          </CardContent>
        </Card>
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
    <div className="container mx-auto px-4 py-8 pb-40 lg:pb-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Individual Session
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Book a one-hour session with {mentor.user.firstName} {mentor.user.lastName}.
        </p>

        {/* Mentor Info */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>{mentor.user.firstName} {mentor.user.lastName}</CardTitle>
              <CardDescription>
                {mentor.expertise} • ${mentor.hourlyRate}/hour • {mentor.rating} rating
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Calendar Section - Using exact same pattern as council booking */}
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Choose Your Session Date & Time
          </h2>
          
          <CalendarAvailability
            selectedMentorIds={[mentorId]}
            onDateTimeSelect={handleDateTimeSelect}
            availabilityData={{}}
            isLoadingAvailability={false}
          />
        </div>

        {/* Session Details Form - Same pattern as council booking */}
        {selectedDateTime && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Session Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="session-goals" className="text-base font-medium">
                  What do you hope to accomplish in this session?
                </Label>
                <Textarea
                  id="session-goals"
                  value={sessionGoals}
                  onChange={(e) => setSessionGoals(e.target.value)}
                  placeholder="Describe your goals, challenges, or what you'd like guidance on..."
                  className="mt-2"
                  rows={4}
                />
              </div>

              <Button
                onClick={handleBookSession}
                disabled={isBooking || !sessionGoals.trim()}
                className="w-full mb-8"
                size="lg"
              >
                {isBooking ? 'Booking Session...' : `Book Individual Session ($${mentor.hourlyRate})`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}