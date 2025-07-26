
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarDays, Clock, Star, Check } from "lucide-react";
import { format } from "date-fns";
import { getClerkToken } from "@/lib/auth-helpers";

const individualBookingSchema = z.object({
  humanMentorId: z.number().min(1, "Please select a mentor"),
  scheduledDate: z.string().min(1, "Please select a date and time"),
  duration: z.number().min(30, "Minimum 30 minutes"),
  sessionGoals: z.string().min(10, "Please describe your goals for the session"),
});

type IndividualBookingData = z.infer<typeof individualBookingSchema>;

interface HumanMentor {
  id: number;
  user: {
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  expertise: string;
  bio: string;
  rating: string | null;
  hourlyRate: string;
}

interface SessionBooking {
  id: number;
  scheduledDate: string;
  duration: number;
  sessionGoals: string;
  status: string;
  humanMentor: {
    user: {
      firstName: string;
      lastName: string;
    };
    expertise: string;
  };
}

function IndividualSessionsList() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['/api/session-bookings'],
    enabled: isLoaded && isSignedIn,
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const token = await getClerkToken(getToken);

      const response = await fetch('/api/session-bookings', {
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
        <p>Loading your individual sessions...</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
        Your Individual Sessions ({sessions.length})
      </h2>

      {sessions.length === 0 ? (
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400">No individual sessions scheduled yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((booking: SessionBooking) => (
            <Card key={booking.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  Session with {booking.humanMentor.user.firstName} {booking.humanMentor.user.lastName}
                </CardTitle>
                <CardDescription>
                  {booking.status === 'scheduled' ? 'Confirmed Session' : booking.status}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    <span className="text-sm">
                      {format(new Date(booking.scheduledDate), 'PPP')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span className="text-sm">
                      {format(new Date(booking.scheduledDate), 'p')} ({booking.duration} min)
                    </span>
                  </div>
                  <Badge variant="outline" className="w-fit">
                    {booking.humanMentor.expertise}
                  </Badge>
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

export default function IndividualBooking() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const [selectedMentor, setSelectedMentor] = useState<HumanMentor | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);

  const form = useForm<IndividualBookingData>({
    resolver: zodResolver(individualBookingSchema),
    defaultValues: {
      humanMentorId: 0,
      scheduledDate: "",
      duration: 60,
      sessionGoals: "",
    },
  });

  // Fetch available mentors
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

  // Submit individual session booking
  const { mutate: bookIndividualSession, isPending: isBooking } = useMutation({
    mutationFn: async (data: IndividualBookingData) => {
      const token = await getClerkToken(getToken);

      const requestBody = {
        humanMentorId: data.humanMentorId,
        scheduledDate: data.scheduledDate,
        duration: data.duration,
        sessionGoals: data.sessionGoals,
      };

      const response = await fetch('/api/session-bookings', {
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
        throw new Error(result.error || result.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return result;
    },
    onSuccess: (response: any) => {
      toast({
        title: "Individual Session Booked!",
        description: response.message || "Your individual session has been successfully booked.",
      });
      setShowBookingDialog(false);
      setSelectedMentor(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/session-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/human-mentors'] });
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

  const handleSelectMentor = (mentor: HumanMentor) => {
    setSelectedMentor(mentor);
    form.setValue('humanMentorId', mentor.id);
    setShowBookingDialog(true);
  };

  const onSubmit = (data: IndividualBookingData) => {
    bookIndividualSession(data);
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
            Individual Sessions
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
            Book one-on-one sessions with expert mentors for personalized guidance
          </p>

          <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold text-white mb-2">
              Direct Access to Expertise
            </h2>
            <p className="text-slate-300 mb-3">
              Connect with individual mentors for focused, personalized guidance tailored to your specific needs and goals.
            </p>
            <div className="bg-slate-700/20 border border-slate-600/30 rounded-lg p-3">
              <p className="text-slate-100 font-medium">
                Individual Plan: Hourly sessions with expert mentors
              </p>
            </div>
          </div>
        </div>

        {/* Mentor Selection */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Select Your Mentor
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mentors?.map((mentor: HumanMentor) => (
              <Card 
                key={mentor.id} 
                className="cursor-pointer transition-all duration-200 hover:shadow-md"
                onClick={() => handleSelectMentor(mentor)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {mentor.user.firstName} {mentor.user.lastName}
                    </CardTitle>
                    <div className="flex items-center gap-2">
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
                    <span className="text-sm font-medium">
                      ${mentor.hourlyRate}/hour
                    </span>
                    <Button size="sm" variant="outline">
                      Book Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {mentors && mentors.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                No mentors available
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Check back later for available mentors.
              </p>
            </div>
          )}
        </div>

        {/* Display existing individual sessions */}
        <IndividualSessionsList />

        {/* Booking Dialog */}
        <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Book Individual Session</DialogTitle>
              <DialogDescription>
                Schedule your one-on-one session with {selectedMentor?.user.firstName} {selectedMentor?.user.lastName}.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Selected Mentor Summary */}
                {selectedMentor && (
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Selected Mentor:</h4>
                    <div className="flex items-center gap-3">
                      <img 
                        src={selectedMentor.user.profileImage || `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=64&h=64`} 
                        alt={`${selectedMentor.user.firstName} ${selectedMentor.user.lastName}`} 
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium">
                          {selectedMentor.user.firstName} {selectedMentor.user.lastName}
                        </p>
                        <p className="text-sm text-slate-600">{selectedMentor.expertise}</p>
                        <p className="text-sm text-slate-500">${selectedMentor.hourlyRate}/hour</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Date & Time */}
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Date & Time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          min={new Date().toISOString().slice(0, 16)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Duration */}
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Duration</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                          <SelectItem value="90">90 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Session Goals */}
                <FormField
                  control={form.control}
                  name="sessionGoals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Goals</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What would you like to achieve in this session?"
                          className="min-h-[100px]"
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
                    disabled={isBooking}
                    className="flex-1"
                  >
                    {isBooking ? "Booking..." : "Confirm Session"}
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
