import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Video, Users, Trash2, ExternalLink } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { MentoringSession, SessionBooking } from "@/types";
import { format, parseISO, isFuture, isValid } from "date-fns";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface UpcomingSessionsProps {
  compact?: boolean;
}

export function UpcomingSessions({ compact = false }: UpcomingSessionsProps) {

  
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Fetch individual mentoring sessions
  const { data: individualSessions = [], isLoading: sessionsLoading, error: sessionsError } = useQuery({
    queryKey: ['/api/session-bookings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/session-bookings');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch individual sessions");
      }
      
      return Array.isArray(result?.data) ? result.data : [];
    },
    staleTime: 30000, // Cache for 30 seconds in production
    retry: 2, // Retry failed requests twice
  });

  // Cancel individual session mutation
  const { mutate: cancelIndividualSession } = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/session-bookings/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to cancel session');
      }
      return result;
    },
    onSuccess: async (_, id) => {
      toast({
        title: "Session Cancelled",
        description: "Your session has been cancelled successfully.",
      });
      queryClient.setQueryData(['/api/session-bookings'], (old: SessionBooking[] | undefined) => {
        if (!old) return [];
        return old.filter((session) => session.id !== id);
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel session",
        variant: "destructive",
      });
    },
  });

  // Cancel council session mutation
  const { mutate: cancelCouncilSession } = useMutation({
    mutationFn: async (participantId: number) => {
      const response = await fetch(`/api/council-sessions/${participantId}/cancel`, {
        method: 'PATCH',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to cancel session');
      }
      return result;
    },
    onSuccess: async (data, participantId) => {
      toast({
        title: "Session Cancelled",
        description: data.message || "Your council session has been cancelled successfully.",
      });
      queryClient.setQueryData(['/api/council-bookings'], (old: any[] | undefined) => {
        if (!old) return [];
        return old.filter((session) => session.id !== participantId);
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed", 
        description: error.message || "Failed to cancel session",
        variant: "destructive",
      });
    },
  });

  // Fetch council sessions
  const { data: rawCouncilSessions = [], isLoading: councilLoading = false, error: councilError } = useQuery({
    queryKey: ['/api/council-bookings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/council-bookings');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch council sessions");
      }
      
      return Array.isArray(result?.data) ? result.data : [];
    },
    staleTime: 30000, // Cache for 30 seconds in production
    retry: 2, // Retry failed requests twice
  });
  
  // Filter out cancelled sessions and add type
  const councilSessions = rawCouncilSessions
    .filter((session: any) => session.status !== 'cancelled')
    .map((session: any) => ({ ...session, type: 'council' }));

  // Filter individual sessions and add type
  const sessions = individualSessions
    .filter((session: any) => session.status !== 'cancelled')
    .map((session: any) => ({ ...session, type: 'individual' }));
  
  console.log('[DEBUG] Individual sessions:', sessions.length);
  console.log('[DEBUG] Council sessions:', councilSessions.length);

  const isLoading = Boolean(sessionsLoading || councilLoading);
  
  console.log("📊 Sessions component state:", {
    isLoading,
    individualSessions: individualSessions.length,
    councilSessions: rawCouncilSessions.length,
    errors: {
      sessionsError: sessionsError?.message,
      councilError: councilError?.message
    }
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-slate-600">Loading sessions...</div>
      </div>
    );
  }

  // Show API error state if we have real server errors (not just development issues)
  const hasRealApiError = (sessionsError && !sessionsError.message?.includes('HTML')) || 
                          (councilError && !councilError.message?.includes('HTML'));
  
  if (hasRealApiError) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-red-300 mx-auto mb-3" />
        <div className="text-red-500 font-medium">Unable to load sessions</div>
        <div className="text-sm text-red-400 mt-1">
          Server error - please try refreshing the page
        </div>
        <div className="text-xs text-red-300 mt-2">
          {sessionsError?.message || councilError?.message}
        </div>
      </div>
    );
  }

  // Combine individual and council sessions
  const allSessions = [
    // Individual sessions
    ...sessions.map((session: any) => ({
      id: session.id,
      sessionId: session.id,
      participantId: session.id,
      type: 'individual' as const,
      scheduledAt: session.scheduledDate,
      status: session.status,
      title: 'Individual Session',
      duration: session.duration || 30,
      sessionGoals: session.sessionGoals,
      mentorName: session.humanMentorName || 'Mentor',
    })),
    // Council sessions  
    ...councilSessions.map((session: any) => {
      // console.log('[DEBUG] Processing council session for upcoming:', session);
      // console.log('[DEBUG] Session scheduledDate:', session.scheduledDate);
      // console.log('[DEBUG] Session status:', session.status);
      const sessionDate = session.scheduledDate ? (() => {
        try {
          const parsed = parseISO(session.scheduledDate);
          return isValid(parsed) ? parsed : null;
        } catch (error) {
          console.warn('Invalid date format:', session.scheduledDate, error);
          return null;
        }
      })() : null;
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      // console.log('[DEBUG] Session date:', sessionDate);
      // console.log('[DEBUG] Start of today:', startOfToday);
      // console.log('[DEBUG] Is today or future?', sessionDate ? sessionDate >= startOfToday : false);
      
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
  
  // console.log('[DEBUG] All sessions combined:', allSessions);

  const upcomingSessions = allSessions
    .filter(session => {
      const isValidStatus = session.status === 'scheduled' || session.status === 'confirmed';
      const hasScheduledAt = !!session.scheduledAt;
      
      // Show sessions from today onwards (including past sessions from today)
      const sessionDate = hasScheduledAt ? (() => {
        try {
          const parsed = parseISO(session.scheduledAt);
          return isValid(parsed) ? parsed : null;
        } catch (error) {
          console.warn('Invalid date format:', session.scheduledAt, error);
          return null;
        }
      })() : null;
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const isTodayOrFuture = sessionDate ? sessionDate >= startOfToday : false;
      
      return isValidStatus && hasScheduledAt && isTodayOrFuture;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, compact ? 2 : 10);
    
  // console.log('[DEBUG] Final upcoming sessions:', upcomingSessions);
  // console.log('[DEBUG] Total sessions found:', allSessions.length);
  // console.log('[DEBUG] Upcoming sessions count:', upcomingSessions.length);

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
                  {(() => {
                    try {
                      const parsed = parseISO(session.scheduledAt);
                      return isValid(parsed) ? format(parsed, 'MMM d') : 'Invalid Date';
                    } catch (error) {
                      console.warn('Date formatting error:', session.scheduledAt, error);
                      return 'Invalid Date';
                    }
                  })()}
                </div>
                <div className="flex items-center text-xs text-slate-500">
                  <Clock className="h-3 w-3 mr-1" />
                  {(() => {
                    try {
                      const parsed = parseISO(session.scheduledAt);
                      return isValid(parsed) ? format(parsed, 'h:mm a') : 'Invalid Time';
                    } catch (error) {
                      console.warn('Time formatting error:', session.scheduledAt, error);
                      return 'Invalid Time';
                    }
                  })()}
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
            
            {/* Cancel button for both session types */}
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
                    <AlertDialogTitle>Cancel {session.type === 'council' ? 'Council' : 'Individual'} Session</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel this {session.type} session? This action cannot be undone and you'll be able to book a new session for this month.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Session</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => {
                        if (session.type === 'council') {
                          const participantId = session.participantId;
                          
                          if (typeof participantId !== 'number' || participantId <= 0) {
                            toast({
                              title: "Cancellation Failed",
                              description: "Invalid session data. Please refresh and try again.",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          cancelCouncilSession(participantId);
                        } else {
                          // Individual session cancellation
                          const sessionId = session.id;
                          
                          if (typeof sessionId !== 'number' || sessionId <= 0) {
                            toast({
                              title: "Cancellation Failed",
                              description: "Invalid session data. Please refresh and try again.",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          cancelIndividualSession(sessionId);
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Cancel Session
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      ))}
      
      {!compact && upcomingSessions.length > 0 && (
        <Button 
          variant="outline" 
          className="w-full mt-4"
          onClick={() => {
            const nextSession = upcomingSessions[0];
            if (nextSession) {
              // Navigate to session details or join directly
              setLocation(`/session/${nextSession.sessionId || nextSession.id}`);
            }
          }}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Join Next Session
        </Button>
      )}
    </div>
  );
}
