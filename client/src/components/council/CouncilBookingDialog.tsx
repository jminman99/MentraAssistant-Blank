
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/clerk-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import CalendarAvailability from "@/components/calendar-availability";
import { fetchWithClerkToken, processApiResponse } from "@/lib/api-utils";
import { addDays } from "date-fns";

const councilBookingSchema = z.object({
  selectedMentorIds: z.array(z.number()).min(3, "Select at least 3 mentors").max(5, "Maximum 5 mentors allowed"),
  sessionGoals: z.string().min(10, "Please describe your goals for the session"),
  questions: z.string().optional(),
  preferredDate: z.date().refine(date => date > new Date(), "Date must be in the future"),
  preferredTime: z.string(),
});

type CouncilBookingData = z.infer<typeof councilBookingSchema>;

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
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

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
        questions: data.questions,
        preferredDate: data.preferredDate.toISOString(),
        preferredTimeSlot: data.preferredTime,
      };

      const response = await fetchWithClerkToken(getToken, '/api/council-sessions/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      return processApiResponse(response);
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

  const selectedMentorObjects = selectedMentors
    .map(mentorId => mentors.find(m => m.id === mentorId))
    .filter(Boolean);

  const onSubmit = (data: CouncilBookingData) => {
    bookCouncilSession(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <Button 
                type="submit" 
                disabled={isBooking || !watchedDate || !watchedTime}
                className="flex-1"
                aria-label={isBooking ? "Booking council session..." : "Confirm council session booking"}
              >
                {isBooking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Booking...
                  </>
                ) : (
                  "Confirm Council Session"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
