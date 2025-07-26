
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HumanMentor } from "@/types";

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
      const token = await getClerkToken(getToken);
      const res = await fetch('/api/session-bookings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          humanMentorId: data.humanMentorId,
          scheduledDate: data.scheduledDate,
          duration: data.duration,
          sessionGoals: data.sessionGoals,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`HTTP ${res.status}: ${error}`);
      }
      return res.json();
    },
    onSuccess: () => {
      form.reset();
      onSuccess();
    },
    onError: (error: Error) => {
      console.error("Individual booking failed:", error);
    },
  });

  const onSubmit = (data: IndividualBookingData) => {
    bookIndividualSession(data);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Book Session with {mentor.user?.firstName} {mentor.user?.lastName}
          </DialogTitle>
          <DialogDescription>
            Schedule a one-on-one session for personalized guidance.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            {/* Scheduled Date */}
            <FormField
              control={form.control}
              name="scheduledDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled Date & Time</FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local" 
                      className="w-full"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={isBooking}
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
