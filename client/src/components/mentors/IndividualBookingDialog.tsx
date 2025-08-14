
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-hook';
import { HumanMentor } from '@/types';

const bookingSchema = z.object({
  sessionGoals: z.string().min(10, 'Please provide at least 10 characters for your session goals'),
  selectedTime: z.string().min(1, 'Please select a time slot'),
});

type BookingData = z.infer<typeof bookingSchema>;

interface IndividualBookingDialogProps {
  mentor: HumanMentor;
  onClose: () => void;
  onSuccess: () => void;
}

interface TimeSlot {
  time: string;
  date: string;
}

export function IndividualBookingDialog({ mentor, onClose, onSuccess }: IndividualBookingDialogProps) {
  const { user, getToken } = useAuth();
  const [showScheduler, setShowScheduler] = useState(false);
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  const form = useForm<BookingData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      sessionGoals: "",
      selectedTime: "",
    },
  });

  const loadAvailability = async () => {
    if (!mentor.acuityAppointmentTypeId) return;
    
    setLoading(true);
    try {
      const token = await getToken();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const response = await fetch(`/api/acuity-availability?mentorId=${mentor.id}&timezone=${timezone}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.availability?.slotsByDate) {
        // Flatten the slots from { 'YYYY-MM-DD': [ISO, ...] } to [{ time, date }, ...]
        const flattenedSlots: TimeSlot[] = [];
        Object.entries(data.availability.slotsByDate).forEach(([date, times]) => {
          (times as string[]).forEach(time => {
            flattenedSlots.push({ time, date });
          });
        });
        setAvailability(flattenedSlots);
      }
    } catch (error) {
      console.error('Failed to load availability:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showScheduler) {
      loadAvailability();
    }
    // When availability refreshes, clear a previously selected time
    form.setValue('selectedTime', '');
  }, [mentor?.id, showScheduler]);

  const handleProceedToScheduling = async (data: BookingData) => {
    console.log('Form data:', data);
    
    // Validate that we have session goals
    if (!data.sessionGoals || data.sessionGoals.length < 10) {
      console.error('Session goals validation failed');
      return;
    }
    
    setShowScheduler(true);
  };

  const handleBooking = async () => {
    const formData = form.getValues();
    if (!formData.selectedTime || !formData.sessionGoals) return;

    setBooking(true);
    try {
      const token = await getToken();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const response = await fetch('/api/acuity-booking', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          humanMentorId: mentor.id,
          datetime: formData.selectedTime,
          duration: 60,
          sessionGoals: formData.sessionGoals,
          timezone
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        const msg = result.details || result.error || 'Failed to book session';
        form.setError('root', { message: msg });
      }
    } catch (e: any) {
      console.error('Booking error:', e);
      const msg = e?.message || 'Failed to book session';
      form.setError('root', { message: msg });
    } finally {
      setBooking(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showScheduler ? 'Select Time Slot' : `Book Session with ${mentor.user?.firstName} ${mentor.user?.lastName}`}
          </DialogTitle>
        </DialogHeader>

        {showScheduler ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Session Goals:</strong> {form.getValues('sessionGoals')}
              </p>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium">Available Time Slots</h3>
              {loading ? (
                <p>Loading available times...</p>
              ) : availability.length === 0 ? (
                <p>No available time slots found.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {availability.map((slot, index) => {
                    const slotDate = new Date(slot.time);
                    const uniqueId = `slot-${index}`;
                    
                    return (
                      <div key={index} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          id={uniqueId}
                          type="radio"
                          value={slot.time}
                          {...form.register('selectedTime')}
                          className="text-blue-600"
                        />
                        <label htmlFor={uniqueId} className="text-sm cursor-pointer flex-1">
                          <div className="text-xs text-gray-500 mb-1">
                            {slotDate.toLocaleDateString(undefined, { weekday: 'short', month:'short', day:'numeric' })}
                          </div>
                          <div>
                            {slotDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {form.formState.errors.root && (
              <div className="text-red-600 text-sm">
                {form.formState.errors.root.message}
              </div>
            )}

            <div className="flex justify-between">
              <Button
                onClick={() => setShowScheduler(false)}
                variant="outline"
                disabled={booking}
              >
                Back to Goals
              </Button>
              <Button
                onClick={handleBooking}
                disabled={!form.getValues('selectedTime') || booking}
              >
                {booking ? 'Booking...' : 'Confirm Booking'}
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form 
              onSubmit={(e) => {
                console.log('Form submit triggered');
                console.log('Form values:', form.getValues());
                console.log('Form errors:', form.formState.errors);
                form.handleSubmit(handleProceedToScheduling)(e);
              }} 
              className="space-y-6"
            >
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
                <Button 
                  type="submit"
                  onClick={() => {
                    console.log('Proceed button clicked');
                    console.log('Current form values:', form.getValues());
                    console.log('Form state:', form.formState);
                  }}
                >
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
