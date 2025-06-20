import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarDays, Clock, Users, Video, MessageSquare } from "lucide-react";
import { format, addDays, isBefore, startOfDay } from "date-fns";

const councilParticipantSchema = z.object({
  sessionGoals: z.string().min(10, "Please describe your goals for the session"),
  questions: z.string().optional(),
});

type CouncilParticipantData = z.infer<typeof councilParticipantSchema>;

interface CouncilSession {
  id: number;
  title: string;
  description?: string;
  scheduledDate: string;
  duration: number;
  maxMentees: number;
  currentMentees: number;
  meetingType: string;
  status: string;
  mentors: Array<{
    id: number;
    user: {
      firstName: string;
      lastName: string;
    };
    expertise: string;
    role: string;
  }>;
}

export default function CouncilScheduling() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedSession, setSelectedSession] = useState<CouncilSession | null>(null);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);

  const form = useForm<CouncilParticipantData>({
    resolver: zodResolver(councilParticipantSchema),
    defaultValues: {
      sessionGoals: "",
      questions: "",
    },
  });

  // Fetch upcoming council sessions
  const { data: councilSessions, isLoading } = useQuery<CouncilSession[]>({
    queryKey: ['/api/council-sessions'],
  });

  // Fetch user's council registrations
  const { data: userRegistrations } = useQuery({
    queryKey: ['/api/council-registrations'],
  });

  const registerMutation = useMutation({
    mutationFn: async (data: CouncilParticipantData) => {
      return apiRequest('/api/council-sessions/register', 'POST', {
        councilSessionId: selectedSession!.id,
        ...data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Registration Successful",
        description: "You've successfully registered for the council session. You'll receive a confirmation email shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/council-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/council-registrations'] });
      setShowRegistrationDialog(false);
      setSelectedSession(null);
    },
    onError: (error) => {
      toast({
        title: "Registration Failed",
        description: "Failed to register for the council session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSessionSelect = (session: CouncilSession) => {
    if (session.currentMentees >= session.maxMentees) {
      toast({
        title: "Session Full",
        description: "This council session is currently full. Please check back later or contact support.",
        variant: "destructive",
      });
      return;
    }
    setSelectedSession(session);
    setShowRegistrationDialog(true);
  };

  const onSubmit = (data: CouncilParticipantData) => {
    registerMutation.mutate(data);
  };

  const isRegistered = (sessionId: number) => {
    return userRegistrations?.some((reg: any) => reg.councilSessionId === sessionId);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <div className="h-8 bg-slate-200 rounded animate-pulse" />
          <div className="h-64 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Council Sessions - Group Mentoring
            </CardTitle>
            <CardDescription>
              Join council sessions with 3-5 experienced mentors for comprehensive guidance and diverse perspectives
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="space-y-6">
          {councilSessions?.length ? (
            councilSessions.map((session) => (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{session.title}</CardTitle>
                      {session.description && (
                        <CardDescription className="mt-2">
                          {session.description}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant={session.status === 'scheduled' ? 'default' : 'secondary'}>
                      {session.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Session Details */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        {format(new Date(session.scheduledDate), 'EEEE, MMMM do, yyyy')}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {format(new Date(session.scheduledDate), 'h:mm a')} ({session.duration} minutes)
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Video className="h-4 w-4" />
                        {session.meetingType === 'video' ? 'Video Conference' : 'In Person'}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {session.currentMentees}/{session.maxMentees} participants
                      </div>
                    </div>

                    {/* Council Mentors */}
                    <div>
                      <h4 className="font-medium mb-3">Council Mentors ({session.mentors?.length || 0})</h4>
                      <div className="space-y-2">
                        {session.mentors?.map((mentor) => (
                          <div key={mentor.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                            <div>
                              <p className="font-medium text-sm">
                                {mentor.user.firstName} {mentor.user.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {mentor.expertise}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {mentor.role === 'lead_mentor' ? 'Lead' : 'Mentor'}
                            </Badge>
                          </div>
                        )) || (
                          <p className="text-sm text-muted-foreground">
                            Mentors will be assigned closer to the session date
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    {isRegistered(session.id) ? (
                      <Badge variant="secondary" className="px-4 py-2">
                        Registered
                      </Badge>
                    ) : (
                      <Button
                        onClick={() => handleSessionSelect(session)}
                        disabled={session.currentMentees >= session.maxMentees || session.status !== 'scheduled'}
                        className="flex items-center gap-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        {session.currentMentees >= session.maxMentees ? 'Session Full' : 'Join Council'}
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => navigate('/dashboard')}>
                      Back to Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Council Sessions Available</h3>
                <p className="text-muted-foreground mb-4">
                  Council sessions are scheduled regularly. Check back soon or contact support for upcoming sessions.
                </p>
                <Button onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Registration Dialog */}
        <Dialog open={showRegistrationDialog} onOpenChange={setShowRegistrationDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Register for Council Session</DialogTitle>
              <DialogDescription>
                {selectedSession && (
                  <>
                    {selectedSession.title} - {format(new Date(selectedSession.scheduledDate), 'MMM do, yyyy at h:mm a')}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="sessionGoals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Goals *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What would you like to accomplish in this council session? What challenges are you facing?"
                          className="resize-none"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="questions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Questions for the Council (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any specific questions you'd like the council to address?"
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    disabled={registerMutation.isPending}
                    className="flex-1"
                  >
                    {registerMutation.isPending ? "Registering..." : "Register for Council"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowRegistrationDialog(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}