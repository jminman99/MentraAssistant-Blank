import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Calendar, Clock, Star, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/auth-hook';
import { Link } from 'wouter';

interface HumanMentor {
  id: number;
  userId: number;
  expertise: string;
  rating: string;
  hourlyRate: number;
  isActive: boolean;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    profileImage?: string;
  };
}

interface BookingFormData {
  mentorId: number;
  scheduledDate: string;
  duration: number;
  sessionGoals: string;
}

export default function IndividualBooking() {
  const { isLoaded, isSignedIn, getToken, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMentor, setSelectedMentor] = useState<HumanMentor | null>(null);
  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    mentorId: 0,
    scheduledDate: '',
    duration: 60,
    sessionGoals: ''
  });

  // Fetch human mentors
  const { data: mentors = [], isLoading: mentorsLoading, error: mentorsError } = useQuery({
    queryKey: ['/api/human-mentors'],
    enabled: isLoaded && isSignedIn,
    queryFn: async () => {
      const token = await getToken();
      const res = await apiRequest('/api/human-mentors', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }, () => Promise.resolve(token));

      if (!res.success) {
        throw new Error(res.error || 'Failed to fetch mentors');
      }

      // Handle both array and object responses
      const mentorData = Array.isArray(res.data) ? res.data : (res.data?.mentors || []);
      return mentorData;
    },
  });

  // Book session mutation
  const { mutate: bookSession, isPending: isBooking } = useMutation({
    mutationFn: async (bookingData: BookingFormData) => {
      const token = await getToken();
      const res = await apiRequest('/api/session-bookings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: bookingData
      }, () => Promise.resolve(token));

      if (!res.success) {
        throw new Error(res.error || 'Failed to book session');
      }

      return res.data;
    },
    onSuccess: () => {
      toast({
        title: 'Session Booked!',
        description: 'Your individual session has been successfully booked.',
      });

      // Reset form and selected mentor
      setSelectedMentor(null);
      setBookingForm({
        mentorId: 0,
        scheduledDate: '',
        duration: 60,
        sessionGoals: ''
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/session-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error: Error) => {
      console.error('Booking failed:', error);
      toast({
        title: 'Booking Failed',
        description: error.message || 'Unable to book session. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSelectMentor = (mentor: HumanMentor) => {
    setSelectedMentor(mentor);
    setBookingForm(prev => ({
      ...prev,
      mentorId: mentor.id
    }));
  };

  const handleBookSession = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMentor) {
      toast({
        title: 'No Mentor Selected',
        description: 'Please select a mentor before booking.',
        variant: 'destructive',
      });
      return;
    }

    if (!bookingForm.scheduledDate || !bookingForm.sessionGoals.trim()) {
      toast({
        title: 'Incomplete Form',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    bookSession(bookingForm);
  };

  if (!isLoaded) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="mb-4">Please sign in to book individual sessions.</p>
          <Link href="/sign-in">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Book Individual Session</h1>
        <p className="text-muted-foreground">
          Choose a mentor and schedule your one-on-one session
        </p>
      </div>

      {mentorsLoading && (
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading mentors...</div>
        </div>
      )}

      {mentorsError && (
        <div className="text-center py-8">
          <div className="text-red-500 font-medium">Error loading mentors</div>
          <div className="text-sm text-red-400 mt-1">{mentorsError.message}</div>
        </div>
      )}

      {!mentorsLoading && !mentorsError && mentors.length === 0 && (
        <div className="text-center py-8">
          <div className="text-muted-foreground">No mentors available at this time</div>
          <div className="text-sm text-muted-foreground mt-1">Please check back later</div>
        </div>
      )}

      {!mentorsLoading && mentors.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Mentor Selection */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Select a Mentor</h2>
            <div className="space-y-4">
              {mentors.map((mentor: HumanMentor) => (
                <Card 
                  key={mentor.id} 
                  className={`cursor-pointer transition-all ${
                    selectedMentor?.id === mentor.id 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => handleSelectMentor(mentor)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <img 
                        src={mentor.user.profileImage || `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100`} 
                        alt={`${mentor.user.firstName} ${mentor.user.lastName}`} 
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">
                            {mentor.user.firstName} {mentor.user.lastName}
                          </h3>
                          <Badge variant="secondary">{mentor.rating} ⭐</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mb-2">
                          {mentor.expertise}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>${mentor.hourlyRate}/hour</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Available
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Booking Form */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Book Your Session</h2>

            {selectedMentor ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Session with {selectedMentor.user.firstName} {selectedMentor.user.lastName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBookSession} className="space-y-4">
                    <div>
                      <Label htmlFor="scheduledDate">Session Date & Time</Label>
                      <Input
                        id="scheduledDate"
                        type="datetime-local"
                        value={bookingForm.scheduledDate}
                        onChange={(e) => setBookingForm(prev => ({
                          ...prev,
                          scheduledDate: e.target.value
                        }))}
                        required
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <select
                        id="duration"
                        value={bookingForm.duration}
                        onChange={(e) => setBookingForm(prev => ({
                          ...prev,
                          duration: parseInt(e.target.value)
                        }))}
                        className="w-full p-2 border border-input rounded-md"
                      >
                        <option value={30}>30 minutes</option>
                        <option value={60}>60 minutes</option>
                        <option value={90}>90 minutes</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="sessionGoals">Session Goals</Label>
                      <Textarea
                        id="sessionGoals"
                        placeholder="What would you like to achieve in this session?"
                        value={bookingForm.sessionGoals}
                        onChange={(e) => setBookingForm(prev => ({
                          ...prev,
                          sessionGoals: e.target.value
                        }))}
                        required
                        rows={4}
                      />
                    </div>

                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={isBooking}
                      >
                        {isBooking ? 'Booking...' : 'Book Session'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-muted-foreground">
                    Select a mentor to book your session
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}