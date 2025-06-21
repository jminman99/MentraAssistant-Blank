import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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

export default function FreshIndividualBooking() {
  const [, params] = useRoute("/schedule/:mentorId");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const mentorId = params?.mentorId ? parseInt(params.mentorId) : null;
  const [mentors, setMentors] = useState<HumanMentor[]>([]);
  const [isLoadingMentors, setIsLoadingMentors] = useState(true);
  const [sessionGoals, setSessionGoals] = useState("");
  const [selectedDateTime, setSelectedDateTime] = useState<{date: Date; time: string} | null>(null);

  console.log("=== FRESH INDIVIDUAL BOOKING PAGE ===");
  console.log("Mentor ID:", mentorId);

  // Fetch mentors
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        console.log("Fetching mentors for individual booking...");
        const response = await fetch('/api/human-mentors', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          console.log("Received mentors:", data);
          setMentors(data || []);
        } else {
          console.error("Failed to fetch mentors:", response.status);
        }
      } catch (error) {
        console.error('Error fetching mentors:', error);
      } finally {
        setIsLoadingMentors(false);
      }
    };
    fetchMentors();
  }, []);

  const mentor = mentors.find(m => m.id === mentorId);

  const handleDateTimeSelect = (date: Date, time: string) => {
    console.log("Date/time selected:", date, time);
    setSelectedDateTime({ date, time });
  };

  // Individual session booking mutation
  const { mutate: bookSession, isPending: isBooking } = useMutation({
    mutationFn: async () => {
      if (!selectedDateTime || !mentorId) {
        throw new Error("Missing required booking information");
      }
      
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

      console.log("Sending booking request:", requestBody);

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Booking failed:", errorData);
        throw new Error(errorData.message || 'Failed to book session');
      }

      return response.json();
    },
    onSuccess: (result) => {
      console.log("Booking successful:", result);
      toast({
        title: "Session Booked Successfully!",
        description: `Your session with ${mentor?.user?.firstName} has been scheduled.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      navigate('/dashboard');
    },
    onError: (error: any) => {
      console.error('Booking error:', error);
      toast({
        title: "Booking Failed",
        description: error.message || "Unable to book session",
        variant: "destructive",
      });
    },
  });

  const handleBookSession = () => {
    if (!selectedDateTime || !mentorId) {
      toast({
        title: "Missing Information",
        description: "Please select a date and time for your session.",
        variant: "destructive",
      });
      return;
    }
    console.log("Initiating booking...");
    bookSession();
  };

  if (!mentorId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No mentor ID provided</p>
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
            <p className="text-center text-muted-foreground">Mentor not found (ID: {mentorId})</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-40 lg:pb-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          FRESH Individual Session Booking
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Book a one-hour session with {mentor.user.firstName} {mentor.user.lastName}.
        </p>

        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>{mentor.user.firstName} {mentor.user.lastName}</CardTitle>
              <CardDescription>
                {mentor.expertise} • ${mentor.hourlyRate}/hour • {mentor.rating || 'New'} rating
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Select Date & Time (UNIFIED CALENDAR)
          </h2>
          
          <div className="bg-blue-50 p-4 rounded mb-4">
            <p className="text-sm">Using CalendarAvailability with selectedMentorIds=[{mentorId}]</p>
          </div>
          
          <CalendarAvailability
            selectedMentorIds={[mentorId]}
            onDateTimeSelect={handleDateTimeSelect}
            availabilityData={{}}
            isLoadingAvailability={false}
          />
        </div>

        {selectedDateTime && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Session Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="session-goals-fresh" className="text-base font-medium">
                  Session Goals (Optional)
                </Label>
                <Textarea
                  id="session-goals-fresh"
                  value={sessionGoals}
                  onChange={(e) => setSessionGoals(e.target.value)}
                  placeholder="What would you like to discuss or accomplish in this session?"
                  className="mt-2"
                  rows={4}
                />
              </div>

              <Button
                onClick={handleBookSession}
                disabled={isBooking || !selectedDateTime}
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