
import React, { useEffect } from "react";
import { HumanMentor } from "@/types";
import { DialogWrapper } from "@/components/ui/dialog-wrapper";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-hook";
import BookingCalendar from "@/components/BookingCalendar";

const individualBookingSchema = z.object({
  scheduledDate: z.string().min(1, "Please select a date and time"),
  sessionGoals: z.string().min(10, "Please describe your goals for the session").max(500, "Please keep goals under 500 characters"),
});

type IndividualBookingData = z.infer<typeof individualBookingSchema>;

interface IndividualBookingDialogProps {
  mentor: HumanMentor;
  onClose: () => void;
  onSuccess: () => void;
}

// Helper function to get Clerk token with timeout
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

// Helper function to fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw error;
  }
}

const IndividualBookingDialog: React.FC<IndividualBookingDialogProps> = ({
  mentor,
  onClose,
  onSuccess
}) => {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<IndividualBookingData>({
    resolver: zodResolver(individualBookingSchema),
    defaultValues: {
      scheduledDate: "",
      sessionGoals: "",
    },
  });

  // Reset form when mentor changes
  useEffect(() => {
    form.reset({
      scheduledDate: "",
      sessionGoals: "",
    });
    form.clearErrors();
  }, [mentor.id, form]);

  const { mutate: bookIndividualSession, isPending } = useMutation({
    mutationFn: async (data: IndividualBookingData) => {
      const token = await getClerkToken(getToken);
      const res = await fetchWithTimeout('/api/session-bookings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          humanMentorId: mentor.id,
          scheduledDate: data.scheduledDate,
          duration: 60,
          sessionGoals: data.sessionGoals.trim(),
        }),
      });

      if (!res.ok) {
        let errorMessage = `HTTP ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch {
          // If JSON parse fails, use status text or generic message
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      return res.json();
    },
    onSuccess: (response: any) => {
      toast({
        title: "Individual Session Booked!",
        description: response.message || "Your individual session has been successfully booked.",
        duration: 5000,
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/session-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/upcoming-sessions'] });
      onSuccess();
    },
    onError: (error: Error) => {
      const mentorName = mentor.user?.firstName || "mentor";
      const appointmentType = mentor.acuityAppointmentTypeId ? `type ${String(mentor.acuityAppointmentTypeId).slice(0, 8)}` : "unknown type";
      toast({
        title: "Individual Booking Failed",
        description: `Failed booking with ${mentorName} (${appointmentType}): ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: IndividualBookingData) => {
    // Extra guard checks
    if (!data.scheduledDate || data.scheduledDate.trim() === '') {
      toast({
        title: "No Time Selected",
        description: "Please select a date and time before booking.",
        variant: "destructive",
      });
      return;
    }

    if (!data.sessionGoals || data.sessionGoals.trim().length < 10) {
      toast({
        title: "Session Goals Required",
        description: "Please describe your goals (minimum 10 characters).",
        variant: "destructive",
      });
      return;
    }

    if (!mentor.id) {
      toast({
        title: "Invalid Mentor",
        description: "Mentor information is missing. Please try again.",
        variant: "destructive",
      });
      return;
    }

    bookIndividualSession(data);
  };

  const selectedDate = form.watch('scheduledDate');
  const sessionGoals = form.watch('sessionGoals');
  const goalCharCount = sessionGoals?.length || 0;

  // Format selected time in user's timezone
  const formatSelectedTime = (isoString: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      // Use the mentor's timezone or fallback to user's local timezone
      const timezone = mentor.availabilityTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      return date.toLocaleString('en-US', {
        timeZone: timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch (error) {
      return isoString;
    }
  };

  return (
    <DialogWrapper
      open={true}
      onOpenChange={(open) => !open && onClose()}
      title={`Book Session with ${mentor.user?.firstName} ${mentor.user?.lastName}`}
      description={`Schedule a one-on-one session for personalized guidance in ${mentor.expertise || 'various topics'}.`}
      size="lg"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Mentor Info */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <img
                src={mentor.user?.profileImage || `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40`}
                alt={`${mentor.user?.firstName || ''} ${mentor.user?.lastName || ''}`.trim() || 'Mentor'}
                className="w-12 h-12 rounded-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div>
                <h3 className="font-semibold">{mentor.user?.firstName || ''} {mentor.user?.lastName || ''}</h3>
                <p className="text-sm text-slate-600">{mentor.expertise}</p>
                <p className="text-sm text-slate-500">${Number(mentor.hourlyRate || 0).toFixed(0)}/hour</p>
              </div>
            </div>
          </div>

          {/* Calendar Selection */}
          <div className="space-y-4">
            <FormLabel id="calendar-label">Select Date & Time</FormLabel>
            {mentor.acuityAppointmentTypeId ? (
              <div className="border rounded-lg p-4" aria-labelledby="calendar-label">
                <BookingCalendar
                  appointmentTypeId={String(mentor.acuityAppointmentTypeId)}
                  onSelect={(isoString) => {
                    form.setValue('scheduledDate', isoString, { shouldValidate: true });
                  }}
                  timezone={mentor.availabilityTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                />
                {selectedDate && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg" aria-live="polite">
                    <p className="text-sm font-medium text-blue-900">Selected Time:</p>
                    <p className="text-sm text-blue-700">{formatSelectedTime(selectedDate)}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="border rounded-lg p-4 text-center py-8 text-slate-500">
                <p>Calendar unavailable - missing appointment type configuration</p>
                <p className="text-xs mt-2">Please contact support for assistance</p>
              </div>
            )}
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
                    placeholder="Describe what you want to accomplish in this session..."
                    className="min-h-[100px]"
                    aria-label="Describe your session goals and objectives"
                    {...field}
                  />
                </FormControl>
                <div className="flex justify-between items-center">
                  <FormMessage />
                  <span className={`text-xs ${goalCharCount > 450 ? 'text-red-500' : 'text-slate-500'}`}>
                    {goalCharCount}/500 characters
                  </span>
                </div>
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isPending || !form.watch('scheduledDate') || (form.watch('sessionGoals')?.trim().length || 0) < 10}
              className="bg-slate-900 hover:bg-slate-800 text-white"
              aria-label="Confirm booking for the selected time slot"
            >
              {isPending ? "Booking..." : "Confirm Session"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              aria-label="Cancel booking and close dialog"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </DialogWrapper>
  );
};

export default IndividualBookingDialog;
