
import React from "react";
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

const individualBookingSchema = z.object({
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
      duration: 60,
      sessionGoals: "",
    },
  });

  const { mutate: bookIndividualSession, isPending } = useMutation({
    mutationFn: async (data: IndividualBookingData) => {
      const token = await getClerkToken(getToken);
      const res = await fetch('/api/session-bookings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          humanMentorId: mentor.id,
          scheduledDate: data.scheduledDate,
          duration: data.duration,
          sessionGoals: data.sessionGoals,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Individual Booking Failed",
        description: error.message || "Failed to book individual session",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: IndividualBookingData) => {
    bookIndividualSession(data);
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Mentor Info */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <img
                src={mentor.user?.profileImage || `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40`}
                alt={`${mentor.user?.firstName} ${mentor.user?.lastName}`}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h3 className="font-semibold">{mentor.user?.firstName} {mentor.user?.lastName}</h3>
                <p className="text-sm text-slate-600">{mentor.expertise}</p>
                <p className="text-sm text-slate-500">${mentor.hourlyRate}/hour</p>
              </div>
            </div>
          </div>

          {/* Calendar Selection */}
          <div className="space-y-4">
            <FormLabel>Select Date & Time</FormLabel>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-4">
                Choose an available time slot for your session with {mentor.user?.firstName}.
              </p>
              {mentor.acuityAppointmentTypeId && (
                <div className="text-sm text-slate-500">
                  Appointment Type ID: {mentor.acuityAppointmentTypeId}
                </div>
              )}
              {/* TODO: Add AcuityCalendar component here */}
              <div className="text-center py-8 text-slate-500">
                Calendar component will be integrated here
              </div>
            </div>
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
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isPending || !form.watch('scheduledDate')}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              {isPending ? "Booking..." : "Book Session"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
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
