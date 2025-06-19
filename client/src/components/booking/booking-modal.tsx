import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Star, X } from "lucide-react";
import { HumanMentor, User } from "@/types";

interface BookingModalProps {
  mentor: HumanMentor;
  user: User;
  onClose: () => void;
}

export function BookingModal({ mentor, user, onClose }: BookingModalProps) {
  const [sessionType, setSessionType] = useState("individual");
  const [selectedDate, setSelectedDate] = useState("tomorrow");
  const [selectedTime, setSelectedTime] = useState("14:00");
  const [topic, setTopic] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const bookSessionMutation = useMutation({
    mutationFn: async (sessionData: any) => {
      const response = await apiRequest('POST', '/api/sessions', sessionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Session Booked!",
        description: `Your ${sessionType} session with ${mentor.user.firstName} is confirmed.`,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleBooking = async () => {
    const scheduledDate = new Date();
    if (selectedDate === "tomorrow") {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    } else if (selectedDate === "monday") {
      scheduledDate.setDate(scheduledDate.getDate() + (7 - scheduledDate.getDay() + 1));
    }
    
    const [hours, minutes] = selectedTime.split(':');
    scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    try {
      await bookSessionMutation.mutateAsync({
        humanMentorId: mentor.id,
        type: sessionType,
        scheduledAt: scheduledDate.toISOString(),
        duration: sessionType === "individual" ? 30 : 60,
        topic: topic || undefined,
      });
    } catch (error) {
      console.error("Booking failed:", error);
    }
  };

  const mockTimeSlots = ["09:00", "11:00", "14:00", "15:30", "17:00"];
  const mockDates = [
    { value: "today", label: "Today", date: "Dec 15", available: true },
    { value: "tomorrow", label: "Tomorrow", date: "Dec 16", available: true },
    { value: "monday", label: "Mon", date: "Dec 18", available: true },
  ];

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Book Session with {mentor.user.firstName} {mentor.user.lastName}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Mentor Info */}
          <div className="flex items-start space-x-4">
            <img 
              src={mentor.user.profileImage || `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100`} 
              alt={`${mentor.user.firstName} ${mentor.user.lastName}`} 
              className="w-16 h-16 rounded-full object-cover"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">
                {mentor.user.firstName} {mentor.user.lastName}
              </h3>
              <p className="text-slate-600">{mentor.expertise}</p>
              <p className="text-sm text-slate-500 mt-1">{mentor.experience}</p>
              <div className="flex items-center mt-2">
                <div className="flex items-center">
                  <Star className="text-yellow-400 h-4 w-4 fill-current" />
                  <span className="text-sm text-slate-600 ml-1">
                    {parseFloat(mentor.rating).toFixed(1)}
                  </span>
                  <span className="text-sm text-slate-500 ml-1">
                    ({mentor.totalSessions} sessions)
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Session Type Selection */}
          <div>
            <Label className="text-base font-medium">Session Type</Label>
            <RadioGroup value={sessionType} onValueChange={setSessionType} className="mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Label className="border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-primary transition-colors flex items-center space-x-3">
                  <RadioGroupItem value="individual" />
                  <div>
                    <div className="font-medium text-slate-900">Individual (30 min)</div>
                    <div className="text-sm text-slate-600">Personal guidance session</div>
                    <div className="text-sm font-medium text-primary mt-1">
                      {user.subscriptionPlan === 'individual' ? 'Included in plan' : 'Switch plan required'}
                    </div>
                  </div>
                </Label>
                <Label className="border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-primary transition-colors flex items-center space-x-3">
                  <RadioGroupItem value="council" />
                  <div>
                    <div className="font-medium text-slate-900">Council (60 min)</div>
                    <div className="text-sm text-slate-600">Council of wisdom</div>
                    <div className="text-sm font-medium text-primary mt-1">
                      {user.subscriptionPlan === 'council' ? 'Included in plan' : 'Switch plan required'}
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Date & Time Selection */}
          <div>
            <Label className="text-base font-medium">Select Date & Time</Label>
            <div className="grid grid-cols-3 gap-3 mt-3 mb-4">
              {mockDates.map((date) => (
                <Button
                  key={date.value}
                  variant={selectedDate === date.value ? "default" : "outline"}
                  className="flex flex-col p-3 h-auto"
                  onClick={() => setSelectedDate(date.value)}
                >
                  <div className="text-sm font-medium">{date.label}</div>
                  <div className="text-xs opacity-75">{date.date}</div>
                </Button>
              ))}
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {mockTimeSlots.map((time) => (
                <Button
                  key={time}
                  variant={selectedTime === time ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTime(time)}
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Session Preparation */}
          <div>
            <Label htmlFor="topic" className="text-base font-medium">Session Focus</Label>
            <Textarea
              id="topic"
              placeholder="What would you like to discuss? (Optional but recommended)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-3"
              rows={3}
            />
          </div>
          
          {/* Booking Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleBooking} 
              disabled={bookSessionMutation.isPending}
            >
              {bookSessionMutation.isPending ? "Booking..." : "Confirm Booking"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
