import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { DialogWrapper } from "@/components/ui/dialog-wrapper";
import { LoadingButton } from "@/components/ui/loading-button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CalendarAvailability } from "@/components/calendar-availability";
import { addDays } from "date-fns";
import { fetchWithTokenAndProcess } from "@/lib/api-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const councilBookingSchema = z.object({
  selectedMentorIds: z.array(z.number()).min(3, "Select at least 3 mentors").max(5, "Maximum 5 mentors allowed"),
  sessionGoals: z.string().min(10, "Please describe your goals for the session"),
  questions: z.string().optional(),
  preferredDate: z.date().refine(date => date > new Date(), "Date must be in the future"),
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

interface CouncilBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMentors: number[];
  mentors: any[];
  onBookingSuccess: () => void;
}

export default function CouncilBookingDialog({
  open,
  onOpenChange,
  selectedMentors,
  mentors,
  onBookingSuccess
}: CouncilBookingDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  // Memoized selected mentor objects to prevent unnecessary recalculations
  const selectedMentorObjects = useMemo(() => 
    selectedMentors
      .map(id => mentors.find(m => m.id === id))
      .filter((mentor): mentor is HumanMentor => Boolean(mentor)),
    [selectedMentors, mentors]
  );

  const form = useForm<CouncilBookingData>({
    resolver: zodResolver(councilBookingSchema),
    defaultValues: {
      selectedMentorIds: selectedMentors,
      sessionGoals: "",
      questions: "",
      preferredDate: addDays(new Date(), 7),
      preferredTime: "",
    },
  });

  // Watch form values for calendar integration
  const watchedDate = form.watch('preferredDate');
  const watchedTime = form.watch('preferredTime');

  const { mutate: bookCouncilSession, isPending: isBooking } = useMutation({
    mutationFn: async (data: CouncilBookingData) => {
      const requestBody = {
        selectedMentorIds: data.selectedMentorIds,
        sessionGoals: data.sessionGoals,
        questions: data.questions || "",
        preferredDate: data.preferredDate.toISOString().split('T')[0],
        preferredTimeSlot: data.preferredTime,
      };

      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/council-sessions/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        try {
          const parsedError = JSON.parse(errorData);
          errorMessage = parsedError.error || errorMessage;
        } catch {
          errorMessage = errorData || errorMessage;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: (response: any) => {
      toast({
        title: "Council Session Confirmed!",
        description: response.message || "Your council session has been automatically confirmed. Calendar invites will be sent shortly.",
      });
      onOpenChange(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/council-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/human-mentors'] });
      onBookingSuccess();
    },
    onError: (error: Error) => {
      console.error('Council booking error:', error);
      
      const isSessionExpired = error.message.includes('Session expired') || 
                              error.message.includes('TOKEN_EXPIRED') ||
                              error.message.includes('401');

      if (isSessionExpired) {
        toast({
          title: "Session Expired",
          description: "Please sign in again",
          variant: "destructive",
        });
        // Use window.location for navigation fallback
        window.location.href = '/sign-in';
      } else {
        toast({
          title: "Booking Failed",
          description: error.message || "Failed to book council session",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: CouncilBookingData) => {
    bookCouncilSession(data);
  };

  return (
    <DialogWrapper 
      open={open} 
      onOpenChange={onOpenChange}
      title="Book Council Session"
      description={`Schedule a council session with ${selectedMentors.length} selected mentors for comprehensive guidance.`}
      size="lg"
    >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Selected Mentors Summary */}
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Your Selected Council:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedMentorObjects.map((mentor) => (
                  <Badge key={mentor.id} variant="secondary">
                    {mentor.user?.firstName} {mentor.user?.lastName} - {mentor.expertise}
                  </Badge>
                ))}
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
                  form.setValue('preferredDate', date);
                  form.setValue('preferredTime', time);
                }}
                selectedDate={watchedDate}
                selectedTime={watchedTime}
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
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <LoadingButton 
                  type="submit" 
                  loading={isBooking}
                  loadingText="Booking..."
                  className="flex-1"
                >
                  Book Council Session
                </LoadingButton>
              </div>
            </form>
          </Form>
    </DialogWrapper>
  );
}