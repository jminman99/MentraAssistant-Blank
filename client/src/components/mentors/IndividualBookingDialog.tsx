import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-hook';
import { HumanMentor } from '@/types';
import { MentorBookingBar } from '@/components/MentorBookingBar';

const bookingSchema = z.object({
  sessionGoals: z.string().min(10, 'Please provide at least 10 characters for your session goals'),
});

type BookingData = z.infer<typeof bookingSchema>;

interface IndividualBookingDialogProps {
  mentor: HumanMentor;
  onClose: () => void;
  onSuccess: () => void;
}

export function IndividualBookingDialog({ mentor, onClose, onSuccess }: IndividualBookingDialogProps) {
  const { user } = useAuth();
  const [showScheduler, setShowScheduler] = useState(false);

  const form = useForm<BookingData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      sessionGoals: "",
    },
  });

  const handleProceedToScheduling = (data: BookingData) => {
    // Store session goals for the webhook to pick up later
    localStorage.setItem('pendingSessionGoals', data.sessionGoals);
    localStorage.setItem('pendingMentorId', mentor.id.toString());

    setShowScheduler(true);
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showScheduler ? 'Schedule Your Session' : `Book Session with ${mentor.user?.firstName} ${mentor.user?.lastName}`}
          </DialogTitle>
        </DialogHeader>

        {showScheduler ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Session Goals:</strong> {form.getValues('sessionGoals')}
              </p>
            </div>
            <MentorBookingBar appointmentTypeId={mentor.acuityAppointmentTypeId || 0} />
            <div className="flex justify-start">
              <Button
                onClick={() => setShowScheduler(false)}
                variant="outline"
              >
                Back to Goals
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleProceedToScheduling)} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <img
                    src={mentor.profileImage || "/api/placeholder/64/64"}
                    alt={`${mentor.user?.firstName} ${mentor.user?.lastName}`}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-lg">
                      {mentor.user?.firstName} {mentor.user?.lastName}
                    </h3>
                    <p className="text-gray-600">{mentor.title}</p>
                    <p className="text-sm text-gray-500">{mentor.company}</p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="sessionGoals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What would you like to accomplish in this session?</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Describe your goals, questions, or what you'd like to discuss..."
                          className="min-h-[120px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  Proceed to Scheduling
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}