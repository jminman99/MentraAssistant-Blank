import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HumanMentor } from "@/types";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

const bookingSchema = z.object({
  sessionGoals: z.string().min(10, "Please describe your goals for the session"),
});

type BookingData = z.infer<typeof bookingSchema>;

interface IndividualBookingDialogProps {
  mentor: HumanMentor;
  onClose: () => void;
  onSuccess: () => void;
}

export function IndividualBookingDialog({ mentor, onClose, onSuccess }: IndividualBookingDialogProps) {
  const { user } = useAuth();

  const form = useForm<BookingData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      sessionGoals: "",
    },
  });

  const handleBookingRedirect = () => {
    const ownerId = import.meta.env.VITE_ACUITY_USER_ID;
    if (!ownerId) {
      console.error('VITE_ACUITY_USER_ID not configured');
      return;
    }

    // Store session goals in localStorage so they persist across the booking flow
    const goals = form.getValues('sessionGoals');
    if (goals) {
      localStorage.setItem('pendingSessionGoals', goals);
      localStorage.setItem('pendingMentorId', mentor.id.toString());
    }

    // Redirect to Acuity booking page with pre-filled user data
    const bookingUrl = new URL(`https://app.acuityscheduling.com/schedule.php`);
    bookingUrl.searchParams.set('owner', ownerId);
    bookingUrl.searchParams.set('appointmentType', mentor.acuityAppointmentTypeId?.toString() || '');

    // Pre-fill user information if available
    if (user?.emailAddresses?.[0]?.emailAddress) {
      bookingUrl.searchParams.set('email', user.emailAddresses[0].emailAddress);
    }
    if (user?.firstName) {
      bookingUrl.searchParams.set('firstName', user.firstName);
    }
    if (user?.lastName) {
      bookingUrl.searchParams.set('lastName', user.lastName);
    }

    // Redirect in the same window
    window.location.href = bookingUrl.toString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">
            Book Session with {mentor.user?.firstName} {mentor.user?.lastName}
          </h2>
          <p className="text-gray-600">
            Schedule a one-on-one session for personalized guidance.
          </p>
        </div>

        <Form {...form}>
          <div className="space-y-4">
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

            {/* Booking Action */}
            {mentor.acuityAppointmentTypeId ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm mb-3">
                    <strong>Next Step:</strong> You'll be taken to the scheduling calendar to pick your preferred time slot.
                  </p>
                  <p className="text-blue-700 text-xs">
                    Your session will automatically appear in "My Sessions" after booking.
                  </p>
                </div>

                <Button
                  onClick={() => {
                    const goals = form.getValues('sessionGoals');
                    if (!goals || goals.length < 10) {
                      form.setError('sessionGoals', { message: 'Please describe your goals for the session' });
                      return;
                    }
                    handleBookingRedirect();
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Continue to Booking Calendar
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                  This mentor's scheduling is not yet configured. Please contact support.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}