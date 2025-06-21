import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Video, Users, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { MentoringSession } from "@/types";
import { format, parseISO, isFuture } from "date-fns";

interface UpcomingSessionsProps {
  compact?: boolean;
}

export function UpcomingSessions({ compact = false }: UpcomingSessionsProps) {
  const queryClient = useQueryClient();
  
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<MentoringSession[]>({
    queryKey: ['/api/sessions'],
  });

  // Cancel council session mutation
  const { mutate: cancelSession } = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await fetch(`/api/council-sessions/${sessionId}/cancel`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to cancel session');
      }
      
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Session Cancelled",
        description: "Your council session has been cancelled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/council-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed", 
        description: error.message || "Failed to cancel session",
        variant: "destructive",
      });
    },
  });

  // Also fetch council sessions
  const { data: councilSessions = [], isLoading: councilLoading } = useQuery({
    queryKey: ['/api/council-bookings'],
  });

  const isLoading = sessionsLoading || councilLoading;

  // Combine and format both session types
  const allSessions = [
    ...sessions.map(session => ({
      ...session,
      type: 'individual' as const,
      scheduledAt: session.scheduledAt,
      title: session.humanMentor ? 
        `${session.humanMentor.user.firstName} ${session.humanMentor.user.lastName}` : 
        'Individual Session'
    })),
    ...councilSessions.map((session: any) => ({
      id: session.sessionId || session.id,
      type: 'council' as const,
      scheduledAt: session.scheduledDate,
      status: session.status,
      title: 'Council Session',
      duration: 60,
      mentorCount: session.mentors?.length || 0,
      sessionGoals: session.sessionGoals
    }))
  ];

  const upcomingSessions = allSessions
    .filter(session => 
      session.status === 'scheduled' || session.status === 'confirmed' && 
      session.scheduledAt && 
      isFuture(parseISO(session.scheduledAt))
    )
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, compact ? 2 : 10);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="border-l-4 border-slate-200 pl-4 py-3 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-24"></div>
          </div>
        ))}
      </div>
    );
  }

  if (upcomingSessions.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <div className="text-slate-500 font-medium">No upcoming sessions</div>
        <div className="text-sm text-slate-400 mt-1">
          Book a session with a human mentor to get started
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {upcomingSessions.map((session) => (
        <div
          key={session.id}
          className={`border-l-4 pl-4 py-2 ${
            session.type === 'individual' ? 'border-primary' : 'border-cyan-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-slate-900 text-sm">
                {session.type === 'council' ? 'Council Session' : session.title}
              </h4>
              <p className="text-xs text-slate-600">
                {session.type === 'council' 
                  ? `${session.mentorCount || 'Multiple'} mentors • ${session.sessionGoals || 'Comprehensive guidance'}`
                  : session.topic || session.humanMentor?.expertise || 'General Mentorship'
                }
              </p>
              <div className="flex items-center space-x-3 mt-1">
                <div className="flex items-center text-xs text-slate-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  {format(parseISO(session.scheduledAt), 'MMM d')}
                </div>
                <div className="flex items-center text-xs text-slate-500">
                  <Clock className="h-3 w-3 mr-1" />
                  {format(parseISO(session.scheduledAt), 'h:mm a')}
                </div>
                <div className="flex items-center text-xs text-slate-500">
                  {session.type === 'council' ? (
                    <Users className="h-3 w-3 mr-1" />
                  ) : (
                    <Video className="h-3 w-3 mr-1" />
                  )}
                  {session.duration || 60} min
                </div>
              </div>
            </div>
            
            {/* Cancel button for council sessions */}
            {session.type === 'council' && (
              <div className="mt-3">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Cancel Session
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Council Session</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel this council session? This action cannot be undone and you'll be able to book a new session for this month.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Session</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => cancelSession(session.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Cancel Session
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>
      ))}
      
      {!compact && upcomingSessions.length > 0 && (
        <Button variant="outline" className="w-full mt-4">
          Join Next Session
        </Button>
      )}
    </div>
  );
}
