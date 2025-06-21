import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, Clock, User, Star, ArrowLeft, CheckCircle2 } from "lucide-react";
import { format, addDays, startOfMonth, endOfMonth, isSameMonth, parseISO } from "date-fns";
import CalendarAvailability from "@/components/calendar-availability";
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
  const { data: mentors = [], isLoading: isLoadingMentors } = useQuery<HumanMentor[]>({
    queryKey: ['/api/human-mentors'],
    enabled: hasAccess,
  });

  // Fetch user's existing bookings to check monthly limit
  const { data: userBookings = [], isLoading: isLoadingBookings } = useQuery<SessionBooking[]>({
    queryKey: ['/api/session-bookings'],
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

      const scheduledAt = new Date(selectedDateTime.date);
      const [hours, minutes] = selectedDateTime.time.split(':');
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const requestBody = {
        humanMentorId: selectedMentor.id,
        sessionType: 'individual',
        scheduledAt: scheduledAt.toISOString(),
        duration: 30, // Fixed 30 minutes as per PRD
        meetingType: 'video',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        sessionGoals: null // Optional for individual sessions
      };

      console.log('[DEBUG] Sending booking request:', requestBody);
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const responseData = await response.json();
      console.log('[DEBUG] Booking response:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Booking failed');
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
  if (currentStep === 'confirmation') {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-slate-900 mb-4">Session Confirmed!</h1>
              <p className="text-slate-600 mb-6">
                Your session with {selectedMentor?.user.firstName} {selectedMentor?.user.lastName} is scheduled for{' '}
                {selectedDateTime && format(selectedDateTime.date, 'MMMM d, yyyy')} at {selectedDateTime?.time}.
              </p>
              <div className="space-y-3">
                <Button onClick={() => setLocation('/dashboard')} className="w-full">
                  Return to Dashboard
                </Button>
                <Button variant="outline" onClick={handleBackToMentors} className="w-full">
                  Book Another Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mentors.map((mentor) => (
              <Card 
                key={mentor.id} 
                className="cursor-pointer hover:shadow-lg transition-all hover:border-slate-300"
                onClick={() => handleMentorSelect(mentor)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-3">
                    <img 
                      src={mentor.user.profileImage || `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100`} 
                      alt={`${mentor.user.firstName} ${mentor.user.lastName}`} 
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">
                        {mentor.user.firstName} {mentor.user.lastName}
                      </h3>
                      <p className="text-sm text-slate-600">{mentor.expertise}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <p className="text-sm text-slate-700 line-clamp-3">{mentor.bio}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span>{parseFloat(mentor.rating || '0').toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>30 min</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="font-semibold text-slate-900">Included in Plan</span>
                      <Badge variant="outline">Available</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                <CardHeader>
                  <CardTitle className="text-lg">Choose Date & Time</CardTitle>
                  <p className="text-sm text-slate-600">Select an available 30-minute time slot</p>
                </CardHeader>
                <CardContent>
                  <CalendarAvailability
                    selectedDate={selectedDateTime?.date}
                    selectedTime={selectedDateTime?.time}
                    onDateTimeSelect={handleDateTimeSelect}
                    selectedMentorIds={[selectedMentor.id]}
                    mentors={mentors}
                    sessionDuration={30}
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