import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarDays, Clock, User, Video, MapPin, ExternalLink } from "lucide-react";
import { format, addDays, isBefore, startOfDay } from "date-fns";

const sessionBookingSchema = z.object({
  humanMentorId: z.number(),
  sessionType: z.enum(['individual', 'council']),
  duration: z.number().min(15).max(120),
  scheduledDate: z.date(),
  scheduledTime: z.string(),
  timezone: z.string().default("America/New_York"),
  meetingType: z.enum(['video', 'in_person']),
  location: z.string().optional(),
  sessionGoals: z.string().optional(),
  preparationNotes: z.string().optional(),
  menteeQuestions: z.string().optional(),
});

type SessionBookingData = z.infer<typeof sessionBookingSchema>;

interface CalendlyInfo {
  calendlyUrl?: string;
  useCalendly: boolean;
  eventTypes: any[];
}

interface AvailableSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  duration?: number;
}

interface AvailabilityResponse {
  slots: AvailableSlot[];
  useCalendly: boolean;
  calendlyUrl?: string;
  message?: string;
}

export default function Scheduling() {
  const [, params] = useRoute("/schedule/:mentorId");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const mentorId = params?.mentorId ? parseInt(params.mentorId) : null;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);

  const form = useForm<SessionBookingData>({
    resolver: zodResolver(sessionBookingSchema),
    defaultValues: {
      humanMentorId: mentorId || 0,
      sessionType: 'individual',
      duration: 30,
      timezone: "America/New_York",
      meetingType: 'video',
    },
  });

  // Fetch mentor information
  const { data: mentor, isLoading: mentorLoading } = useQuery({
    queryKey: ['/api/human-mentors', mentorId],
    enabled: !!mentorId,
  });

  // Fetch Calendly integration info
  const { data: calendlyInfo, isLoading: calendlyLoading } = useQuery<CalendlyInfo>({
    queryKey: ['/api/mentors', mentorId, 'calendly-info'],
    enabled: !!mentorId,
  });

  // Fetch available slots for selected date
  const { data: availability, isLoading: availabilityLoading } = useQuery<AvailabilityResponse>({
    queryKey: ['/api/mentors', mentorId, 'available-slots', selectedDate?.toISOString().split('T')[0]],
    enabled: !!mentorId && !!selectedDate && !calendlyInfo?.useCalendly,
  });

  // Fetch user's existing bookings
  const { data: userBookings } = useQuery({
    queryKey: ['/api/session-bookings'],
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: SessionBookingData) => {
      const scheduledDateTime = new Date(selectedDate!);
      const [hours, minutes] = selectedSlot!.startTime.split(':').map(Number);
      scheduledDateTime.setHours(hours, minutes, 0, 0);
      
      return apiRequest('/api/session-bookings', {
        method: 'POST',
        body: {
          ...data,
          scheduledDate: scheduledDateTime.toISOString(),
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Session Booked Successfully",
        description: "Your mentoring session has been scheduled. You'll receive a confirmation email shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/session-bookings'] });
      setShowBookingDialog(false);
      navigate('/dashboard');
    },
    onError: (error) => {
      toast({
        title: "Booking Failed",
        description: "Failed to book the session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSlotSelect = (slot: AvailableSlot) => {
    if (!slot.available) return;
    setSelectedSlot(slot);
    setShowBookingDialog(true);
  };

  const onSubmit = (data: SessionBookingData) => {
    if (!selectedSlot || !selectedDate) return;
    createBookingMutation.mutate(data);
  };

  if (!mentorId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p>Invalid mentor ID. Please select a mentor to schedule a session.</p>
            <Button onClick={() => navigate('/dashboard')} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mentorLoading || calendlyLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <div className="h-8 bg-slate-200 rounded animate-pulse" />
          <div className="h-64 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // Calendly Integration UI
  if (calendlyInfo?.useCalendly && calendlyInfo.calendlyUrl) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Schedule with {mentor?.user?.firstName} {mentor?.user?.lastName}
              </CardTitle>
              <CardDescription>
                This mentor uses Calendly for scheduling. You'll be redirected to their calendar to book your session.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border">
                  <h3 className="font-medium text-blue-900 mb-2">Calendly Integration</h3>
                  <p className="text-blue-700 text-sm mb-4">
                    This mentor manages their availability through Calendly. Click below to view their calendar and book directly.
                  </p>
                  <div className="flex gap-4">
                    <Button 
                      onClick={() => window.open(calendlyInfo.calendlyUrl, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Calendly Calendar
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/dashboard')}
                    >
                      Back to Dashboard
                    </Button>
                  </div>
                </div>
                
                {/* Embedded Calendly iframe option */}
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    src={calendlyInfo.calendlyUrl}
                    width="100%"
                    height="600"
                    frameBorder="0"
                    title="Calendly Scheduling"
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Native Scheduling UI
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Schedule with {mentor?.user?.firstName} {mentor?.user?.lastName}
            </CardTitle>
            <CardDescription>
              Select a date and time for your mentoring session
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-1 gap-6">
          {/* Unified Calendar Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Select Date and Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CalendarAvailability
                onDateTimeSelect={(date, time) => {
                  setSelectedDate(date);
                  setSelectedTime(time);
                }}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                availabilityData={availability}
                mentorId={mentorId}
                sessionType="individual"
              />
            </CardContent>
          </Card>

          {/* Available Times Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Available Times
              </CardTitle>
              {selectedDate && (
                <CardDescription>
                  {format(selectedDate, 'EEEE, MMMM do, yyyy')}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <p className="text-muted-foreground text-center py-8">
                  Please select a date to see available times
                </p>
              ) : availabilityLoading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-10 bg-slate-200 rounded animate-pulse" />
                  ))}
                </div>
              ) : availability?.slots?.length ? (
                <div className="space-y-2">
                  {availability.slots.map((slot, index) => (
                    <Button
                      key={index}
                      variant={slot.available ? "outline" : "ghost"}
                      disabled={!slot.available}
                      onClick={() => handleSlotSelect(slot)}
                      className="w-full justify-start"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      {slot.startTime} - {slot.endTime}
                      {!slot.available && (
                        <Badge variant="secondary" className="ml-auto">
                          Unavailable
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No available times for this date
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Existing Bookings */}
        {userBookings?.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Your Upcoming Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {userBookings.slice(0, 3).map((booking: any) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium">
                        {booking.humanMentor?.user?.firstName} {booking.humanMentor?.user?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.scheduledDate), 'MMM do, yyyy at h:mm a')}
                      </p>
                    </div>
                    <Badge variant={booking.status === 'scheduled' ? 'default' : 'secondary'}>
                      {booking.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking Dialog */}
        <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Book Your Session</DialogTitle>
              <DialogDescription>
                {selectedDate && selectedSlot && (
                  <>
                    {format(selectedDate, 'EEEE, MMMM do, yyyy')} at {selectedSlot.startTime}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="sessionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select session type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="individual">Individual Session</SelectItem>
                          <SelectItem value="council">Council Session</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="meetingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select meeting type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="video">
                            <div className="flex items-center gap-2">
                              <Video className="h-4 w-4" />
                              Video Call
                            </div>
                          </SelectItem>
                          <SelectItem value="in_person">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              In Person
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('meetingType') === 'in_person' && (
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter meeting location" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="sessionGoals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Goals (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What would you like to accomplish in this session?"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="menteeQuestions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Questions for Your Mentor (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any specific questions you'd like to discuss?"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    disabled={createBookingMutation.isPending}
                    className="flex-1"
                  >
                    {createBookingMutation.isPending ? "Booking..." : "Book Session"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowBookingDialog(false)}
                  >
                    Cancel
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