import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const availabilitySchema = z.object({
  dayOfWeek: z.string(),
  startTime: z.string(),
  endTime: z.string(),
});

const daysOfWeek = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00:00`, label: `${hour}:00` };
});

export default function MentorAvailability() {
  const queryClient = useQueryClient();
  const [isAddingSlot, setIsAddingSlot] = useState(false);

  const { data: availability = [], isLoading } = useQuery({
    queryKey: ['/api/mentor-availability'],
  });

  const form = useForm<z.infer<typeof availabilitySchema>>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      dayOfWeek: '',
      startTime: '',
      endTime: '',
    },
  });

  const addSlotMutation = useMutation({
    mutationFn: (data: z.infer<typeof availabilitySchema>) =>
      apiRequest('/api/mentor-availability', {
        method: 'POST',
        body: JSON.stringify({
          dayOfWeek: parseInt(data.dayOfWeek),
          startTime: data.startTime,
          endTime: data.endTime,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mentor-availability'] });
      setIsAddingSlot(false);
      form.reset();
      toast({ title: 'Availability slot added successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to add availability slot', variant: 'destructive' });
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/mentor-availability/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mentor-availability'] });
      toast({ title: 'Availability slot removed successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to remove availability slot', variant: 'destructive' });
    },
  });

  const onSubmit = (data: z.infer<typeof availabilitySchema>) => {
    if (data.startTime >= data.endTime) {
      toast({ title: 'Error', description: 'End time must be after start time', variant: 'destructive' });
      return;
    }
    addSlotMutation.mutate(data);
  };

  const getDayLabel = (dayOfWeek: number) => {
    return daysOfWeek.find(day => day.value === dayOfWeek.toString())?.label || 'Unknown';
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5); // Remove seconds
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading availability...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Mentor Availability</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Define your weekly availability for mentoring sessions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Availability</CardTitle>
          <CardDescription>
            Your weekly schedule for mentoring sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {availability.length === 0 ? (
            <p className="text-slate-500 text-center py-8">
              No availability slots defined. Add your first slot below.
            </p>
          ) : (
            <div className="space-y-3">
              {availability.map((slot: any) => (
                <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <span className="font-medium min-w-[100px]">
                      {getDayLabel(slot.dayOfWeek)}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteSlotMutation.mutate(slot.id)}
                    disabled={deleteSlotMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {!isAddingSlot ? (
            <Button
              onClick={() => setIsAddingSlot(true)}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Availability Slot
            </Button>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="dayOfWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day of Week</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {daysOfWeek.map((day) => (
                              <SelectItem key={day.value} value={day.value}>
                                {day.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Start time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timeSlots.map((time) => (
                              <SelectItem key={time.value} value={time.value}>
                                {time.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="End time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timeSlots.map((time) => (
                              <SelectItem key={time.value} value={time.value}>
                                {time.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="submit"
                    disabled={addSlotMutation.isPending}
                  >
                    Add Slot
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingSlot(false);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}