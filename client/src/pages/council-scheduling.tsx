import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarDays, Clock, Users, Check, Star } from "lucide-react";
import { format, addDays } from "date-fns";
import CalendarAvailability from "@/components/calendar-availability";

const councilBookingSchema = z.object({
  selectedMentorIds: z.array(z.number()).min(3, "Select at least 3 mentors").max(5, "Maximum 5 mentors allowed"),
  sessionGoals: z.string().min(10, "Please describe your goals for the session"),
  questions: z.string().optional(),
  preferredDate: z.date(),
  preferredTime: z.string(),
});

type CouncilBookingData = z.infer<typeof councilBookingSchema>;

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

function CouncilSessionsList() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['/api/council-bookings'],
    enabled: isLoaded && isSignedIn,
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const token = await getClerkToken(getToken);

      const response = await fetch('/api/council-bookings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    },
  });

  const sessions = Array.isArray(sessionsData?.data) ? sessionsData.data : [];

  if (isLoading) {
    return (
      <div className="mb-8 text-center">
        <p>Loading your council sessions...</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
        Your Council Sessions ({sessions.length})
      </h2>

      {sessions.length === 0 ? (
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400">No council sessions scheduled yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((booking: any) => (
            <Card key={booking.sessionId || booking.id}>
              <CardHeader>
                <CardTitle className="text-lg">Council Session</CardTitle>
                <CardDescription>
                  {booking.status === 'pending' ? 'Coordinating with mentors...' : booking.status}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    <span className="text-sm">
                      {booking.scheduledDate ? format(new Date(booking.scheduledDate), 'PPP') : 'Date TBD'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span className="text-sm">
                      {booking.scheduledDate ? format(new Date(booking.scheduledDate), 'p') : 'Time TBD'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="text-sm">{booking.mentorCount || 3} mentors</span>
                  </div>
                  {booking.sessionGoals && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Session Goals:</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{booking.sessionGoals}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function for getting Clerk token
async function getClerkToken(getToken: any): Promise<string> {
  if (!getToken) {
    throw new Error('No authentication available');
  }

  let token: string | null = null;
  try {
    token = await getToken();
  } catch {
    throw new Error('Failed to get authentication token');
  }

  if (!token) {
    throw new Error('Session expired—please sign in');
  }

  return token;
}

export default function CouncilScheduling() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available mentors for council sessions  
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const [selectedMentors, setSelectedMentors] = useState<number[]>([]);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();

  const form = useForm<CouncilBookingData>({
    resolver: zodResolver(councilBookingSchema),
    defaultValues: {
      selectedMentorIds: [],
      sessionGoals: "",
      questions: "",
      preferredDate: addDays(new Date(), 7), // Default to next week
      preferredTime: "",
    },
  });

  // Fetch available mentors for council sessions
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/human-mentors'],
    enabled: isLoaded && isSignedIn,
    queryFn: async () => {
      const token = await getClerkToken(getToken);

      const res = await fetch('/api/human-mentors', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const raw = await res.text().catch(() => '');
      if (!res.ok) {
        try {
          const j = JSON.parse(raw);
          throw new Error(j.message || j.error || `HTTP ${res.status}`);
        } catch {
          throw new Error(raw || `HTTP ${res.status}`);
        }
      }

      let json: any = {};
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(`Non-JSON response: ${raw}`);
      }

      if (json?.success === false) {
        throw new Error(json.message || json.error || 'Failed to load mentors');
      }
      return json;
    },
  });

  const mentors = Array.isArray(data?.data) ? data.data : [];

  // Redirect to login if not authenticated
  if (isLoaded && !isSignedIn) {
    navigate('/sign-in');
    return null;
  }

  // Don't render if user data isn't available
  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  // Submit council session booking
  const { mutate: bookCouncilSession, isPending: isBooking } = useMutation({
    mutationFn: async (data: CouncilBookingData) => {
      const token = await getClerkToken(getToken);

      const requestBody = {
        selectedMentorIds: data.selectedMentorIds,
        sessionGoals: data.sessionGoals,
        questions: data.questions,
        preferredDate: data.preferredDate.toISOString(),
        preferredTimeSlot: data.preferredTime,
      };

      const response = await fetch('/api/council-sessions/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return result;
    },
    onSuccess: (response: any) => {
      toast({
        title: "Council Session Confirmed!",
        description: response.message || "Your council session has been automatically confirmed. Calendar invites will be sent shortly.",
      });
      setShowBookingDialog(false);
      setSelectedMentors([]);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/council-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/human-mentors'] });
      navigate('/sessions');
    },
    onError: (error: Error) => {
      const isSessionExpired = error.message.includes('Session expired') || 
                              error.message.includes('TOKEN_EXPIRED') ||
                              error.message.includes('401');

      if (isSessionExpired) {
        toast({
          title: "Session Expired",
          description: "Please sign in again",
          variant: "destructive",
        });
        navigate('/sign-in');
      } else {
        toast({
          title: "Booking Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const toggleMentorSelection = (mentorId: number) => {
    setSelectedMentors(prev => {
      const newSelection = prev.includes(mentorId)
        ? prev.filter(id => id !== mentorId)
        : [...prev, mentorId];

      // Update form value
      form.setValue('selectedMentorIds', newSelection);
      return newSelection;
    });
  };

  const canAddMoreMentors = selectedMentors.length < 5;
  const hasMinimumMentors = selectedMentors.length >= 3;

  const onSubmit = (data: CouncilBookingData) => {
    bookCouncilSession(data);
  };

  if (!isLoaded || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">{!isLoaded ? "Loading..." : "Loading mentors..."}</div>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl pb-32 lg:pb-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Council Sessions
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
            Build your council of 3-5 mentors for <strong>ONE single one-hour session</strong> where all mentors participate together
          </p>

          <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold text-white mb-2">
              "Sometimes you need one man who's lived it. Sometimes you need a council who's seen it all."
            </h2>
            <p className="text-slate-300 mb-3">
              Select your panel of mentors and we'll coordinate a single session where all your chosen guides come together to provide comprehensive wisdom for your specific challenge.
            </p>
            <div className="bg-slate-700/20 border border-slate-600/30 rounded-lg p-3">
              <p className="text-slate-100 font-medium">
                Council Plan: One monthly council session included for $49
              </p>
            </div>
          </div>
        </div>

        {/* Mentor Selection */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Select Your Council ({selectedMentors.length}/5)
            </h2>
            <div className="flex items-center gap-4">
              <Badge variant={hasMinimumMentors ? "default" : "secondary"}>
                {hasMinimumMentors ? "Ready to Book" : `Need ${3 - selectedMentors.length} more`}
              </Badge>
              <Button 
                onClick={() => setShowBookingDialog(true)}
                disabled={!hasMinimumMentors}
                className="bg-slate-800 hover:bg-slate-700"
              >
                Book Council Session
              </Button>
            </div>
          </div>



          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mentors?.map((mentor: HumanMentor) => (
              <Card 
                key={mentor.id} 
                className={`cursor-pointer transition-all duration-200 ${
                  selectedMentors.includes(mentor.id)
                    ? 'ring-2 ring-slate-800 bg-slate-50 dark:bg-slate-800'
                    : 'hover:shadow-md'
                } ${
                  !canAddMoreMentors && !selectedMentors.includes(mentor.id)
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
                onClick={() => {
                  if (canAddMoreMentors || selectedMentors.includes(mentor.id)) {
                    toggleMentorSelection(mentor.id);
                  }
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {mentor.user.firstName} {mentor.user.lastName}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {selectedMentors.includes(mentor.id) && (
                        <Check className="h-5 w-5 text-green-600" />
                      )}
                      {mentor.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm">{mentor.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="w-fit">
                    {mentor.expertise}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-3 line-clamp-3">
                    {mentor.bio}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      Council Member
                    </span>
                    <Checkbox 
                      checked={selectedMentors.includes(mentor.id)}
                      className="pointer-events-none"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {mentors && mentors.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                No mentors available
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Check back later for available mentors.
              </p>
            </div>
          )}
        </div>

        {/* Display existing council sessions */}
        <CouncilSessionsList />

        {/* Booking Dialog */}
        <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Book Your Council Session</DialogTitle>
              <DialogDescription>
                Complete the details for your council session with {selectedMentors.length} mentors.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Selected Mentors Summary */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Your Selected Council:</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(mentors) && selectedMentors.map((mentorId) => {
                      const mentor = Array.isArray(mentors)
                        ? mentors.find(m => m.id === mentorId)
                        : undefined;
                      return mentor ? (
                        <Badge key={mentorId} variant="secondary">
                          {mentor.user?.firstName} {mentor.user?.lastName} - {mentor.expertise}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>

                {/* Calendar Availability */}
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900">Select Date & Time</h4>
                  <p className="text-sm text-slate-600">
                    Choose an hour-long time slot when all selected mentors are available.
                  </p>
                  <CalendarAvailability
                    selectedMentors={selectedMentors}
                    mentors={mentors || []}
                    onTimeSelect={(date, time) => {
                      setSelectedDate(date);
                      setSelectedTime(time);
                      form.setValue('preferredDate', date);
                      form.setValue('preferredTime', time);
                    }}
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    sessionDuration={60}
                    isCouncilMode={true}
                  />
                </div>

                {/* Session Goals */}
                <FormField
                  control={form.control}
                  name="sessionGoals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Goals</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what you want to accomplish in this council session..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Optional Questions */}
                <FormField
                  control={form.control}
                  name="questions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specific Questions (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any specific questions you'd like to ask the council?"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowBookingDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isBooking || !selectedDate || !selectedTime}
                    className="flex-1"
                  >
                    {isBooking ? "Booking..." : "Confirm Council Session"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}