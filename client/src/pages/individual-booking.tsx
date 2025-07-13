import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, Clock, User, Star, ArrowLeft, CheckCircle2, Video } from "lucide-react";
import { format, addDays, startOfMonth, endOfMonth, isSameMonth, parseISO } from "date-fns";
import CalendarAvailability from "@/components/calendar-availability-fixed";
import MentorCard from "@/components/mentor-card";
import SessionUsageBadge from "@/components/session-usage-badge";
import SessionConfirmation from "@/components/session-confirmation";
import { HumanMentor } from "@/types";
import { useLocation } from "wouter";

interface SessionBooking {
  id: number;
  scheduledDate: string;
  status: string;
  humanMentor: HumanMentor;
}

export default function IndividualBooking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [selectedMentor, setSelectedMentor] = useState<HumanMentor | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<{date: Date; time: string} | null>(null);
  const [currentStep, setCurrentStep] = useState<'mentors' | 'scheduling' | 'confirmation'>('mentors');

  // Check subscription access
  const hasAccess = user && ['individual', 'council'].includes(user.subscriptionPlan);

  // Fetch mentors
  const { data: mentorsData, isLoading: isLoadingMentors } = useQuery({
    queryKey: ['/api/human-mentors'],
    queryFn: () => apiRequest('/api/human-mentors'),
    enabled: hasAccess,
  });
  const mentors = Array.isArray(mentorsData?.data) ? mentorsData.data : [];

  // Fetch user's existing bookings to check monthly limit
  const { data: userBookings = [], isLoading: isLoadingBookings } = useQuery<SessionBooking[]>({
    queryKey: ['/api/session-bookings'],
    queryFn: () => apiRequest('/api/session-bookings').then(res => res.data || []),
    enabled: hasAccess,
  });

  // Calculate monthly session usage for the selected booking month
  const selectedBookingMonth = selectedDateTime?.date || new Date();
  const selectedMonthBookings = userBookings.filter(booking => {
    const bookingDate = parseISO(booking.scheduledDate);
    return isSameMonth(bookingDate, selectedBookingMonth) && 
           booking.status !== 'cancelled';
  });
  const monthlyLimit = 2; // As per PRD
  const sessionsUsed = selectedMonthBookings.length;
  const canBookMore = sessionsUsed < monthlyLimit;

  // Book session mutation
  const { mutate: bookSession, isPending: isBooking } = useMutation({
    mutationFn: async () => {
      if (!selectedMentor || !selectedDateTime) {
        throw new Error("Missing mentor or date/time selection");
      }

      // Create scheduled date with proper timezone handling
      const scheduledAt = new Date(selectedDateTime.date);
      const [hours, minutes] = selectedDateTime.time.split(':').map(Number);
      
      // Ensure we're working with local time, not UTC
      scheduledAt.setHours(hours, minutes, 0, 0);
      
      // Get the Clerk session token for authentication
      const clerkToken = await window.Clerk?.session?.getToken();
      if (!clerkToken) {
        throw new Error("Authentication required");
      }

      const requestBody = {
        humanMentorId: selectedMentor.id,
        scheduledDate: scheduledAt.toISOString(),
        duration: 30, // Fixed 30 minutes as per PRD
        sessionGoals: null // Optional for individual sessions
      };

      console.log('[DEBUG] Sending booking request:', requestBody);
      const response = await fetch('/api/session-bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${clerkToken}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      const responseData = await response.json();
      console.log('[DEBUG] Booking response:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || 'Booking failed');
      }
      return responseData;
    },
    onSuccess: (data) => {
      toast({
        title: "Session Booked Successfully!",
        description: `Your 30-minute session with ${selectedMentor?.user.firstName} is confirmed for ${format(selectedDateTime!.date, 'MMMM d, yyyy')} at ${selectedDateTime!.time}.`,
      });
      
      // Reset form and navigate to sessions page
      setSelectedMentor(null);
      setSelectedDateTime(null);
      setCurrentStep('mentors');
      queryClient.invalidateQueries({ queryKey: ['/api/session-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      // Navigate to sessions page after short delay to let user see the success toast
      setTimeout(() => {
        setLocation('/sessions');
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMentorSelect = (mentor: HumanMentor) => {
    setSelectedMentor(mentor);
    setCurrentStep('scheduling');
  };

  const handleDateTimeSelect = (date: Date, time: string) => {
    setSelectedDateTime({ date, time });
  };

  const handleBookSession = () => {
    if (!selectedMentor) {
      toast({
        title: "No Mentor Selected",
        description: "Please select a mentor first.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDateTime) {
      toast({
        title: "No Time Selected",
        description: "Please select a date and time for your session.",
        variant: "destructive",
      });
      return;
    }

    if (!canBookMore) {
      toast({
        title: "Monthly Limit Reached", 
        description: `You've used all ${monthlyLimit} sessions for ${selectedDateTime ? format(selectedDateTime.date, 'MMMM yyyy') : 'this month'}. Try selecting a different month.`,
        variant: "destructive",
      });
      return;
    }

    bookSession();
  };

  const handleBackToMentors = () => {
    setSelectedMentor(null);
    setSelectedDateTime(null);
    setCurrentStep('mentors');
  };

  // Access control check
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-slate-900">Upgrade Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-slate-600 mb-6">
              Individual mentor sessions require an Individual or Council subscription plan.
            </p>
            <Button onClick={() => setLocation('/dashboard')}>
              View Subscription Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoadingMentors || isLoadingBookings) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading mentors...</div>
      </div>
    );
  }

  // Confirmation step
  if (currentStep === 'confirmation' && selectedMentor && selectedDateTime) {
    return (
      <SessionConfirmation
        type="individual"
        mentor={selectedMentor}
        date={selectedDateTime.date}
        time={selectedDateTime.time}
        duration={30}
        onViewSessions={() => setLocation('/sessions')}
        onBookAnother={handleBackToMentors}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {currentStep === 'scheduling' && (
              <Button variant="outline" size="sm" onClick={handleBackToMentors}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Mentors
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setLocation('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {currentStep === 'mentors' ? 'Choose Your Mentor' : 'Schedule Your Session'}
          </h1>
          <p className="text-slate-600">
            {currentStep === 'mentors' 
              ? 'Select an experienced mentor for your 30-minute individual session'
              : `Book your session with ${selectedMentor?.user.firstName} ${selectedMentor?.user.lastName}`
            }
          </p>
          
          {/* Monthly usage indicator */}
          <div className="mt-4 flex items-center gap-2">
            <Badge variant={canBookMore ? "secondary" : "destructive"}>
              {sessionsUsed}/{monthlyLimit} sessions for {selectedDateTime ? format(selectedDateTime.date, 'MMMM yyyy') : 'selected month'}
            </Badge>
            {!canBookMore && (
              <span className="text-sm text-red-600">Monthly limit reached for {selectedDateTime ? format(selectedDateTime.date, 'MMMM yyyy') : 'selected month'}</span>
            )}
          </div>
        </div>

        {/* Mentor Selection Step */}
        {currentStep === 'mentors' && (
          <>
            {mentors.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Mentors Available</h3>
                <p className="text-slate-600">
                  We're currently working on adding more mentors. Please check back later.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mentors.map((mentor) => (
                  <MentorCard
                    key={mentor.id}
                    mentor={mentor}
                    onClick={() => handleMentorSelect(mentor)}
                    showImage={true}
                    showBio={true}
                    className="hover:shadow-lg"
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Scheduling Step */}
        {currentStep === 'scheduling' && selectedMentor && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Selected Mentor Info */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Selected Mentor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3 mb-4">
                    <img 
                      src={selectedMentor.user.profileImage || `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100`} 
                      alt={`${selectedMentor.user.firstName} ${selectedMentor.user.lastName}`} 
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {selectedMentor.user.firstName} {selectedMentor.user.lastName}
                      </h3>
                      <p className="text-sm text-slate-600">{selectedMentor.expertise}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm">{parseFloat(selectedMentor.rating || '0').toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Duration:</span>
                      <span className="font-medium">30 minutes</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Rate:</span>
                      <span className="font-medium">Included in Plan</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Format:</span>
                      <span className="font-medium">Video Call</span>
                    </div>
                  </div>
                  
                  {selectedDateTime && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">Selected Time</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        {format(selectedDateTime.date, 'MMMM d, yyyy')} at {selectedDateTime.time}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Calendar */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <CalendarAvailability
                    selectedDate={selectedDateTime?.date}
                    selectedTime={selectedDateTime?.time}
                    onDateTimeSelect={handleDateTimeSelect}
                    selectedMentorIds={[selectedMentor.id]}
                    mentors={mentors}
                    sessionDuration={30}
                    isCouncilMode={false}
                  />
                  
                  {selectedDateTime && (
                    <div className="mt-6 flex justify-end">
                      <Button 
                        onClick={handleBookSession}
                        disabled={isBooking || !canBookMore}
                        size="lg"
                        className="min-w-[200px]"
                      >
                        {isBooking ? "Booking..." : "Confirm Session"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}