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
    queryKey: ['/api/session-bookings'],
  });

  // FIXED: Cancel council session mutation with proper endpoint
  const { mutate: cancelCouncilSession } = useMutation({
    mutationFn: async (participantId: number) => {
      console.log(`[DEBUG] Cancelling participant ${participantId}`);
      
      const response = await fetch(`/api/council-sessions/${participantId}/cancel`, {
        method: 'PATCH',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to cancel session');
      }
      
      console.log(`[DEBUG] Cancel response:`, result);
      return result;
    },
    onSuccess: async (data) => {
      console.log(`[DEBUG] Session cancelled successfully:`, data);
      
      toast({
        title: "Session Cancelled",
        description: data.message || "Your council session has been cancelled successfully.",
      });
      
      // FIXED: Use correct query key and await invalidation
      await queryClient.invalidateQueries({ queryKey: ['/api/council-bookings'] });
      console.log(`[DEBUG] Cache invalidated, cancelled session should be hidden`);
    },
    onError: (error: any) => {
      console.log(`[DEBUG] Cancel error:`, error);
      
      toast({
        title: "Cancellation Failed", 
        description: error.message || "Failed to cancel session",
        variant: "destructive",
      });
    },
  });

  // FIXED: Fetch council sessions with debug logging and filter out cancelled
  const { data: rawCouncilSessions = [], isLoading: councilLoading } = useQuery({
    queryKey: ['/api/council-bookings'],
    staleTime: 0, // Always refetch to ensure fresh data
  });
  
  // Filter out cancelled sessions
  const councilSessions = rawCouncilSessions.filter((session: any) => session.status !== 'cancelled');
  
  console.log('[DEBUG] Raw council sessions:', rawCouncilSessions);
  console.log('[DEBUG] Filtered council sessions (non-cancelled):', councilSessions);

  const isLoading = sessionsLoading || councilLoading;

  // Combine and format both session types
  const allSessions = [
    ...sessions.map(session => ({
      ...session,
      type: 'individual' as const,
      scheduledAt: session.scheduledDate, // Fix field mapping
      title: session.humanMentor ? 
        `${session.humanMentor.user.firstName} ${session.humanMentor.user.lastName}` : 
        'Individual Session'
    })),
    ...councilSessions.map((session: any) => {
      console.log('[DEBUG] Processing council session for upcoming:', session);
      console.log('[DEBUG] Session scheduledDate:', session.scheduledDate);
      console.log('[DEBUG] Session status:', session.status);
      const sessionDate = session.scheduledDate ? parseISO(session.scheduledDate) : null;
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      console.log('[DEBUG] Session date:', sessionDate);
      console.log('[DEBUG] Start of today:', startOfToday);
      console.log('[DEBUG] Is today or future?', sessionDate ? sessionDate >= startOfToday : false);
      
      return {
        id: session.id, // This is the participant ID from storage
        sessionId: session.sessionId, // This is the actual session ID
        participantId: session.id, // Explicitly store participant ID for cancellation
        type: 'council' as const,
        scheduledAt: session.scheduledDate,
        status: session.status,
        title: 'Council Session',
        duration: session.duration || 60,
        sessionGoals: session.sessionGoals,
        questions: session.questions,
        description: session.description,
        mentorCount: session.mentorCount || 3,
      };
    })
  ];
  
  console.log('[DEBUG] All sessions combined:', allSessions);

  const upcomingSessions = allSessions
    .filter(session => {
      const isValidStatus = session.status === 'scheduled' || session.status === 'confirmed';
      const hasScheduledAt = !!session.scheduledAt;
      
      // Show sessions from today onwards (including past sessions from today)
      const sessionDate = hasScheduledAt ? parseISO(session.scheduledAt) : null;
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const isTodayOrFuture = sessionDate ? sessionDate >= startOfToday : false;
      
      console.log('[DEBUG] Filtering session:', {
        id: session.id,
        type: session.type,
        status: session.status,
        scheduledAt: session.scheduledAt,
        isValidStatus,
        hasScheduledAt,
        isTodayOrFuture,
        sessionDate,
        startOfToday
      });
      
      return isValidStatus && hasScheduledAt && isTodayOrFuture;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, compact ? 2 : 10);
    
  console.log('[DEBUG] Final upcoming sessions:', upcomingSessions);
  console.log('[DEBUG] Total sessions found:', allSessions.length);
  console.log('[DEBUG] Upcoming sessions count:', upcomingSessions.length);

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
          Book a session with an experienced guide to get started
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
                        onClick={() => {
                          const participantId = (session as any).participantId || session.id;
                          console.log(`[DEBUG] Cancelling session with participantId: ${participantId}, sessionId: ${(session as any).sessionId}`);
                          cancelCouncilSession(participantId);
                        }}
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
