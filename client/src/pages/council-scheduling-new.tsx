import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Clock, Users, CheckCircle, Star } from "lucide-react";
import { format } from "date-fns";
import CalendarAvailability from "@/components/calendar-availability";

interface HumanMentor {
  id: number;
  user: {
    firstName: string;
    lastName: string;
  };
  expertise: string;
  rating: string | null;
  hourlyRate: string;
}

// Component to display council sessions
function CouncilSessionsList() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !user) {
      setIsLoading(authLoading);
      return;
    }

    const fetchSessions = async () => {
      try {
        console.log('Fetching council sessions for authenticated user...');
        const response = await fetch('/api/council-bookings', {
          credentials: 'include'
        });
        console.log('Response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Received sessions data:', data);
          setSessions(Array.isArray(data) ? data : []);
        } else {
          console.error('Failed to fetch sessions, status:', response.status);
          setSessions([]);
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setSessions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, [user, authLoading]);

  if (isLoading || !user) {
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

export default function CouncilScheduling() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedMentors, setSelectedMentors] = useState<number[]>([]);
  const [mentors, setMentors] = useState<HumanMentor[]>([]);
  const [isLoadingMentors, setIsLoadingMentors] = useState(true);
  const [sessionGoals, setSessionGoals] = useState("");
  const [questions, setQuestions] = useState("");
  const [selectedDateTime, setSelectedDateTime] = useState<{date: Date; time: string} | null>(null);
  const [availabilityData, setAvailabilityData] = useState<any>({});
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Fetch mentors
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

  const handleMentorToggle = (mentorId: number) => {
    setSelectedMentors(prev => {
      if (prev.includes(mentorId)) {
        return prev.filter(id => id !== mentorId);
      } else if (prev.length < 5) {
        return [...prev, mentorId];
      }
      return prev;
    });
  };

  const handleDateTimeSelect = (date: Date, time: string) => {
    setSelectedDateTime({ date, time });
  };

  // Book council session mutation
  const { mutate: bookCouncilSession, isPending: isBooking } = useMutation({
    mutationFn: async () => {
      if (!selectedDateTime) throw new Error("No date/time selected");
      
      const requestBody = {
        selectedMentorIds: selectedMentors,
        sessionGoals,
        questions,
        preferredDate: selectedDateTime.date.toISOString(),
        preferredTimeSlot: selectedDateTime.time,
      };
      
      return await apiRequest("POST", '/api/council-sessions/book', requestBody);
    },
    onSuccess: () => {
      toast({
        title: "Council session booked!",
        description: "Your council session has been scheduled successfully.",
      });
      // Reset form
      setSelectedMentors([]);
      setSessionGoals("");
      setQuestions("");
      setSelectedDateTime(null);
    },
    onError: (error: any) => {
      toast({
        title: "Booking failed",
        description: error.message || "Failed to book council session",
        variant: "destructive",
      });
    },
  });

  const handleBookSession = () => {
    if (!selectedDateTime || !sessionGoals.trim() || selectedMentors.length < 3) {
      toast({
        title: "Missing information",
        description: "Please select at least 3 mentors, a date/time, and enter session goals.",
        variant: "destructive",
      });
      return;
    }
    bookCouncilSession();
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-32 lg:pb-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Council Sessions
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Book a one-hour session with 3-5 mentors for comprehensive guidance.
        </p>

        {/* Display council sessions */}
        <CouncilSessionsList />

        {/* Booking Form */}
        <div className="space-y-6">
          {/* Mentor Selection */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Select Your Council (3-5 Mentors)
            </h2>
            {isLoadingMentors ? (
              <p>Loading mentors...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mentors.map((mentor) => (
                  <Card
                    key={mentor.id}
                    className={`cursor-pointer transition-all ${
                      selectedMentors.includes(mentor.id)
                        ? 'ring-2 ring-slate-500 border-slate-500'
                        : 'hover:border-slate-300'
                    }`}
                    onClick={() => handleMentorToggle(mentor.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                            {mentor.user.firstName} {mentor.user.lastName}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {mentor.expertise}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center">
                              <Star className="h-4 w-4 fill-current text-yellow-400" />
                              <span className="text-sm text-slate-600 dark:text-slate-400 ml-1">
                                {mentor.rating || "5.0"}
                              </span>
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              ${mentor.hourlyRate}/hr
                            </span>
                          </div>
                        </div>
                        {selectedMentors.includes(mentor.id) && (
                          <CheckCircle className="h-5 w-5 text-slate-500 mt-1" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Calendar Section */}
          {selectedMentors.length >= 3 && (
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Choose Your Session Date & Time
              </h2>
              
              <CalendarAvailability
                selectedMentorIds={selectedMentors}
                onDateTimeSelect={handleDateTimeSelect}
                availabilityData={availabilityData}
                isLoadingAvailability={isLoadingAvailability}
              />
            </div>
          )}

          {/* Session Details Form */}
          {selectedDateTime && (
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Session Details
              </h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="session-goals" className="text-base font-medium">
                    What do you hope to accomplish in this council session?
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

                <div>
                  <Label htmlFor="questions" className="text-base font-medium">
                    Specific Questions (Optional)
                  </Label>
                  <Textarea
                    id="questions"
                    value={questions}
                    onChange={(e) => setQuestions(e.target.value)}
                    placeholder="Any specific questions you'd like to ask the council?"
                    className="mt-2"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleBookSession}
                  disabled={isBooking || !sessionGoals.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isBooking ? 'Booking Session...' : 'Book Council Session ($50)'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}