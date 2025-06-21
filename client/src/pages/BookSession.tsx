import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useRoute } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calendar, Clock, DollarSign, Star, Video } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format, addDays, startOfWeek, isSameDay, isAfter, isBefore, parseISO } from 'date-fns';

export default function BookSession() {
  const [, params] = useRoute('/book-session/:mentorId');
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const mentorId = params?.mentorId ? parseInt(params.mentorId) : null;
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [sessionGoals, setSessionGoals] = useState('');

  const { data: mentor, isLoading: mentorLoading } = useQuery({
    queryKey: ['/api/human-mentors', mentorId],
    enabled: !!mentorId,
  });

  const { data: availability = [] } = useQuery({
    queryKey: ['/api/mentor-availability', mentorId],
    enabled: !!mentorId,
  });

  const { data: existingSessions = [] } = useQuery({
    queryKey: ['/api/session-bookings', mentorId],
    enabled: !!mentorId,
  });

  const bookSessionMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('/api/session-bookings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({ title: 'Session booked successfully!' });
      setLocation('/dashboard');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to book session', variant: 'destructive' });
    },
  });

  if (!mentorId || mentorLoading) {
    return <div className="flex justify-center p-8">Loading mentor details...</div>;
  }

  if (!mentor) {
    return <div className="text-center p-8">Mentor not found</div>;
  }

  // Generate next 30 days for calendar
  const calendarDays = Array.from({ length: 30 }, (_, i) => addDays(new Date(), i));

  // Get available time slots for selected date
  const getAvailableTimeSlots = (date: Date) => {
    const dayOfWeek = date.getDay();
    const dayAvailability = availability.filter((slot: any) => slot.dayOfWeek === dayOfWeek);
    
    const bookedTimes = existingSessions
      .filter((session: any) => {
        const sessionDate = parseISO(session.scheduledAt);
        return isSameDay(sessionDate, date) && session.status === 'confirmed';
      })
      .map((session: any) => format(parseISO(session.scheduledAt), 'HH:mm:ss'));

    const timeSlots: string[] = [];
    dayAvailability.forEach((slot: any) => {
      const startHour = parseInt(slot.startTime.split(':')[0]);
      const endHour = parseInt(slot.endTime.split(':')[0]);
      
      for (let hour = startHour; hour < endHour; hour++) {
        const timeStr = `${hour.toString().padStart(2, '0')}:00:00`;
        if (!bookedTimes.includes(timeStr)) {
          timeSlots.push(timeStr);
        }
      }
    });

    return timeSlots;
  };

  const handleBookSession = () => {
    if (!selectedDate || !selectedTimeSlot) {
      toast({ title: 'Error', description: 'Please select a date and time', variant: 'destructive' });
      return;
    }

    const scheduledAt = new Date(selectedDate);
    const [hours, minutes] = selectedTimeSlot.split(':').map(Number);
    scheduledAt.setHours(hours, minutes, 0, 0);

    bookSessionMutation.mutate({
      humanMentorId: mentorId,
      scheduledAt: scheduledAt.toISOString(),
      duration: mentor.defaultSessionDuration || 60,
      sessionGoals,
      status: 'confirmed',
    });
  };

  const formatTime = (time: string) => {
    const [hours] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${ampm}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" onClick={() => setLocation('/mentors')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Mentors
        </Button>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Book Session</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mentor Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={mentor.user?.profileImage} />
                <AvatarFallback>
                  {mentor.user?.firstName?.[0]}{mentor.user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{mentor.user?.firstName} {mentor.user?.lastName}</CardTitle>
                <CardDescription>{mentor.expertise}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{mentor.rating || 'No ratings yet'}</span>
              <span className="text-slate-500">({mentor.totalSessions} sessions)</span>
            </div>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span>${mentor.hourlyRate}/hour</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>{mentor.defaultSessionDuration || 60} minutes</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{mentor.bio}</p>
          </CardContent>
        </Card>

        {/* Date Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Select Date</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((date) => {
                const availableSlots = getAvailableTimeSlots(date);
                const isSelectable = availableSlots.length > 0;
                const isSelected = selectedDate && isSameDay(date, selectedDate);

                return (
                  <Button
                    key={date.toISOString()}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    disabled={!isSelectable}
                    onClick={() => {
                      setSelectedDate(date);
                      setSelectedTimeSlot(null);
                    }}
                    className="h-12 flex flex-col"
                  >
                    <span className="text-xs">{format(date, 'EEE')}</span>
                    <span className="font-semibold">{format(date, 'd')}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Time Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Select Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-slate-500 text-center py-8">Select a date first</p>
            ) : (
              <div className="space-y-2">
                {getAvailableTimeSlots(selectedDate).map((time) => (
                  <Button
                    key={time}
                    variant={selectedTimeSlot === time ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTimeSlot(time)}
                    className="w-full"
                  >
                    {formatTime(time)}
                  </Button>
                ))}
                {getAvailableTimeSlots(selectedDate).length === 0 && (
                  <p className="text-slate-500 text-center py-4">No available slots</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session Goals */}
      <Card>
        <CardHeader>
          <CardTitle>Session Goals</CardTitle>
          <CardDescription>
            What would you like to focus on during this session?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="goals">Describe your goals for this session</Label>
            <Textarea
              id="goals"
              placeholder="e.g., I'd like to discuss career transition strategies, get advice on work-life balance, or explore personal development goals..."
              value={sessionGoals}
              onChange={(e) => setSessionGoals(e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Booking Summary */}
      {selectedDate && selectedTimeSlot && (
        <Card className="border-2 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Video className="h-5 w-5" />
              <span>Session Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Date:</span>
                <p>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
              </div>
              <div>
                <span className="font-medium">Time:</span>
                <p>{formatTime(selectedTimeSlot)}</p>
              </div>
              <div>
                <span className="font-medium">Duration:</span>
                <p>{mentor.defaultSessionDuration || 60} minutes</p>
              </div>
              <div>
                <span className="font-medium">Cost:</span>
                <p>${mentor.hourlyRate}</p>
              </div>
            </div>
            <Badge variant="secondary" className="flex items-center space-x-1 w-fit">
              <Video className="h-3 w-3" />
              <span>Video call via Jitsi Meet</span>
            </Badge>
            <Button
              onClick={handleBookSession}
              disabled={bookSessionMutation.isPending}
              className="w-full"
              size="lg"
            >
              {bookSessionMutation.isPending ? 'Booking...' : 'Book Session'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}