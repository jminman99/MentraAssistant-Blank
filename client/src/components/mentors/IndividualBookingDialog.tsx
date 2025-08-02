import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HumanMentor } from "@/types";
import { CalendarAvailability } from "@/components/calendar-availability";
import { format } from "date-fns";
import { MentorBookingBar } from "@/components/MentorBookingBar";

const individualBookingSchema = z.object({
  humanMentorId: z.number().min(1, "Please select a mentor"),
  scheduledDate: z.string().min(1, "Please select a date and time"),
  duration: z.number().min(30, "Minimum 30 minutes"),
  sessionGoals: z.string().min(10, "Please describe your goals for the session"),
});

type IndividualBookingData = z.infer<typeof individualBookingSchema>;

interface IndividualBookingDialogProps {
  mentor: HumanMentor;
  onClose: () => void;
  onSuccess: () => void;
}

// Helper function to get Clerk token
async function getClerkToken(getToken: any): Promise<string> {
  if (!getToken) throw new Error('No authentication available');

  let token: string | null = null;
  try {
    token = await getToken({ template: 'mentra-api' });
  } catch {
    try {
      token = await getToken({ template: 'default' });
    } catch {
      token = await getToken();
    }
  }

  if (!token) throw new Error('No Clerk token available');
  return token;
}

export function IndividualBookingDialog({ mentor, onClose, onSuccess }: IndividualBookingDialogProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();

  const form = useForm<IndividualBookingData>({
    resolver: zodResolver(individualBookingSchema),
    defaultValues: {
      humanMentorId: mentor.id,
      scheduledDate: "",
      duration: 60,
      sessionGoals: "",
    },
  });

  const { mutate: bookIndividualSession, isPending: isBooking } = useMutation({
    mutationFn: async (data: IndividualBookingData) => {
      console.log('[BOOKING] Starting individual session booking:', data);

      try {
        const token = await getClerkToken(getToken);
        console.log('[BOOKING] Token obtained successfully');

        const requestPayload = {
          humanMentorId: data.humanMentorId,
          scheduledDate: data.scheduledDate,
          duration: data.duration,
          sessionGoals: data.sessionGoals,
        };

        console.log('[BOOKING] Sending request:', requestPayload);

        const res = await fetch('/api/session-bookings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
        });

        console.log('[BOOKING] Response status:', res.status);

        if (!res.ok) {
          const errorText = await res.text();
          console.error('[BOOKING] Server error:', errorText);
          throw new Error(`Booking failed (${res.status}): ${errorText}`);
        }

        const result = await res.json();
        console.log('[BOOKING] Success result:', result);
        return result;

      } catch (error) {
        console.error('[BOOKING] Request failed:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      try {
        console.log('[BOOKING] Mutation success, invalidating cache:', result);
        form.reset();
        if (queryClient) {
          queryClient.invalidateQueries({ queryKey: ['/api/session-bookings'] });
        }
        onSuccess();
      } catch (err) {
        console.error('[BOOKING] Error in onSuccess handler:', err);
      }
    },
    onError: (error: Error) => {
      try {
        console.error("[BOOKING] Individual booking failed:", error);
        // Add user-facing error handling
        if (error.message.includes('401')) {
          form.setError('root', { message: 'Authentication expired. Please refresh and try again.' });
        } else if (error.message.includes('400')) {
          form.setError('root', { message: 'Invalid booking data. Please check your selections.' });
        } else {
          form.setError('root', { message: `Booking failed: ${error.message}` });
        }
      } catch (err) {
        console.error('[BOOKING] Error in onError handler:', err);
      }
    },
  });

  const handleTimeSelect = (date: Date, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);

    try {
      // Create ISO string for the scheduled date with validation
      const [hours, minutes] = time.split(':');
      const hoursNum = parseInt(hours);
      const minutesNum = parseInt(minutes);

      // Validate time components
      if (isNaN(hoursNum) || isNaN(minutesNum) || hoursNum < 0 || hoursNum > 23 || minutesNum < 0 || minutesNum > 59) {
        console.error('[BOOKING] Invalid time format:', time);
        form.setError("scheduledDate", { message: "Invalid time format" });
        return;
      }

      const scheduledDateTime = new Date(date);
      scheduledDateTime.setHours(hoursNum, minutesNum, 0, 0);

      // Validate the resulting date
      if (isNaN(scheduledDateTime.getTime())) {
        console.error('[BOOKING] Invalid date created:', { date, time, result: scheduledDateTime });
        form.setError("scheduledDate", { message: "Invalid date/time combination" });
        return;
      }

      // Ensure it's in the future
      const now = new Date();
      if (scheduledDateTime <= now) {
        console.error('[BOOKING] Date is in the past:', { scheduled: scheduledDateTime, now });
        form.setError("scheduledDate", { message: "Session must be scheduled in the future" });
        return;
      }

      const isoString = scheduledDateTime.toISOString();
      console.log('[BOOKING] Setting valid date:', { date, time, isoString, timestamp: scheduledDateTime.getTime() });
      form.setValue("scheduledDate", isoString);

    } catch (error) {
      console.error('[BOOKING] Date creation error:', error, { date, time });
      form.setError("scheduledDate", { message: "Failed to set date/time" });
    }
  };

  const onSubmit = (data: IndividualBookingData) => {
    if (!selectedDate || !selectedTime) {
      form.setError("scheduledDate", { message: "Please select a date and time" });
      return;
    }
    bookIndividualSession(data);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Book Session with {mentor.user?.firstName} {mentor.user?.lastName}
          </DialogTitle>
          <DialogDescription>
            Schedule a one-on-one session for personalized guidance.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Session Goals */}
            <FormField
              control={form.control}
              name="sessionGoals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Goals</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what you want to accomplish in this session..."
                      className="min-h-[80px]"
                      {...field}
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
                  <FormLabel>Duration (minutes)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value.toString()}
                  >
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

            {/* Acuity Scheduling Iframe */}
            <div className="space-y-4">
              <FormLabel>Schedule Your Session</FormLabel>
              {mentor.acuityAppointmentTypeId ? (
                <div className="space-y-4">
                  <MentorBookingBar appointmentTypeId={mentor.acuityAppointmentTypeId} />
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 text-sm">
                      <strong>After booking:</strong> Your appointment will appear in "My Sessions" within a few minutes. 
                      If it doesn't appear, please refresh the page or contact support.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800">
                    This mentor's scheduling is not yet configured. Please contact support.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isBooking || !selectedDate || !selectedTime}
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                {isBooking ? "Booking..." : "Book Session"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}