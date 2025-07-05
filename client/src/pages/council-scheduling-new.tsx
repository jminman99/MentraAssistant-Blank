import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Clock, Users, CheckCircle, Star, Video, ArrowLeft, X } from "lucide-react";
import { format } from "date-fns";
import CalendarAvailability from "@/components/calendar-availability-fixed";
import MentorCard from "@/components/mentor-card";

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
  const { user, isLoading: authLoading } = useAuth();
  
  const [selectedMentors, setSelectedMentors] = useState<number[]>([]);
  const [mentors, setMentors] = useState<HumanMentor[]>([]);
  const [isLoadingMentors, setIsLoadingMentors] = useState(true);
  const [sessionGoals, setSessionGoals] = useState("");
  const [questions, setQuestions] = useState("");
  const [selectedDateTime, setSelectedDateTime] = useState<{date: Date; time: string} | null>(null);
  const [availabilityData, setAvailabilityData] = useState<any>({});
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    navigate('/login');
    return null;
  }

  // Fetch mentors
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const response = await fetch('/api/human-mentors', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          const mentorsList = Array.isArray(data?.data) ? data.data : [];
          setMentors(mentorsList);
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
      
      const response = await fetch('/api/council-sessions/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
    onSuccess: async (data: any) => {
      console.log('[DEBUG] Booking response received:', data);
      
      if (data?.success) {
        console.log('[DEBUG] Booking successful, bookingId:', data.bookingId);
        
        toast({
          title: "Council session booked!",
          description: "Your council session has been scheduled successfully.",
        });
        
        // Reset form
        setSelectedMentors([]);
        setSessionGoals("");
        setQuestions("");
        setSelectedDateTime(null);
        
        // Invalidate cache to refresh data
        console.log('[DEBUG] Invalidating council-bookings cache...');
        await queryClient.invalidateQueries({ queryKey: ['/api/council-bookings'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/session-bookings'] });
        
        // Navigate to sessions page after short delay
        setTimeout(() => {
          setLocation('/sessions');
        }, 1500);
      } else {
        console.log('[DEBUG] Booking failed:', data?.message);
        toast({
          title: "Booking Failed",
          description: data?.message || "Failed to book council session",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error('Council booking error:', error);
      toast({
        title: "Booking Failed",
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
    <div className="container mx-auto px-4 py-8 pb-40 lg:pb-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Council Sessions
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Book an hour-long session with 3-5 mentors for comprehensive guidance.
          </p>
        </div>

        {/* Display council sessions only */}
        <CouncilSessionsList />
      </div>
    </div>
  );
}