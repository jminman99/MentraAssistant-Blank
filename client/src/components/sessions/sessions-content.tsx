
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, Video, X, Star, MessageSquare } from "lucide-react";
import { format, parseISO, isAfter, isBefore, subHours, isSameMonth } from "date-fns";
import { useAuth } from "@/lib/auth-hook";
import { Link } from "wouter";
import { SessionBooking } from "@/types";

interface SessionsContentProps {
  compact?: boolean;
}

async function fetchSessionBookings(url: string, getToken: () => Promise<string | null>): Promise<SessionBooking[]> {
  const res = await apiRequest(url, {}, getToken);
  if (!res.success) throw new Error(res.error || "Failed to fetch sessions");
  return res.data ?? [];
}

export function SessionsContent({ compact = false }: SessionsContentProps) {
  const { isLoaded, isSignedIn, getToken, user, backendReady } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("upcoming");

  // Fetch user's session bookings with improved error handling
  const { data: sessionsData = [], isLoading: sessionsLoading, error: sessionsError } = useQuery({
    queryKey: ['/api/session-bookings'],
    enabled: isLoaded && isSignedIn,
    queryFn: () => fetchSessionBookings('/api/session-bookings', () => getToken()),
  });

  // Fetch council sessions for council users with improved error handling
  const { data: councilData = [], isLoading: councilLoading, error: councilError } = useQuery({
    queryKey: ['/api/council-bookings'],
    enabled: !!(isLoaded && isSignedIn && backendReady && user?.subscriptionPlan === 'council'),
    queryFn: () => fetchSessionBookings('/api/council-bookings', () => getToken()),
  });

  // Council users only get council sessions, individual users only get individual sessions
  const allSessions = (backendReady && user?.subscriptionPlan === 'council') 
    ? councilData
        .filter(cs => cs.sessionId != null && cs.id != null)
        .map((cs: any) => ({
          id: `council-${cs.id}`, // Use participant ID (cs.id) instead of sessionId
          participantId: cs.id,    // Store numeric participant ID for API calls
          sessionId: cs.sessionId, // Keep original session ID for reference
          scheduledDate: cs.scheduledDate,
          duration: cs.duration || 60,
          status: cs.sessionStatus || cs.status,
          meetingType: 'video',
          sessionGoals: cs.sessionGoals,
          humanMentor: {
            id: 0,
            user: { firstName: 'Council', lastName: 'Session' },
            expertise: `${cs.mentorCount} mentors`,
            rating: '5.0'
          }
        }))
    : sessionsData;

  // Cancel session mutation - handles both council and individual sessions using working POST endpoints
  const { mutate: cancelSession } = useMutation({
    mutationFn: async (sessionData: { sessionId: string | number; type?: string }) => {
      const { sessionId, type } = sessionData;
      
      // Handle council sessions using POST endpoint
      if (type === 'council' || (typeof sessionId === 'string' && sessionId.startsWith('council-'))) {
        // Extract participant ID from council session ID
        let participantId: number;
        
        if (typeof sessionId === 'string' && sessionId.startsWith('council-')) {
          const idString = sessionId.replace('council-', '');
          participantId = parseInt(idString, 10);
          
          if (isNaN(participantId) || participantId <= 0) {
            throw new Error(`Invalid council session ID: ${sessionId}`);
          }
        } else if (typeof sessionId === 'number') {
          participantId = sessionId;
        } else {
          throw new Error(`Invalid council session data: ${sessionId}`);
        }
        
        const res = await apiRequest("/api/cancel-council-session",
          { method: "POST", body: { participantId } },
          () => getToken());
        if (!res.success) throw new Error(res.error || "Failed to cancel");
      } else {
        const res = await apiRequest("/api/cancel-individual-session",
          { method: "POST", body: { sessionId } },
          () => getToken());
        if (!res.success) throw new Error(res.error || "Failed to cancel");
      }
    },
    onSuccess: () => {
      toast({
        title: "Session Cancelled",
        description: "Your session has been cancelled successfully.",
      });
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/session-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/council-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error: Error) => {
      console.error('Session cancellation failed:', error);
      toast({
        title: "Cancellation Failed",
        description: error.message || "Unable to cancel session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const isLoading = !isLoaded || sessionsLoading || (!backendReady && isSignedIn) || (backendReady && user?.subscriptionPlan === 'council' && councilLoading);
  const now = new Date();
  const gracePeriod = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
  
  const upcomingSessions = allSessions.filter(session => {
    const sessionDate = parseISO(session.scheduledDate);
    return (session.status === 'scheduled' || session.status === 'confirmed') && isAfter(sessionDate, gracePeriod);
  });
  const pastSessions = allSessions.filter(session => 
    session.status === 'completed' || 
    ((session.status === 'scheduled' || session.status === 'confirmed') && isBefore(parseISO(session.scheduledDate), gracePeriod))
  );

  const canCancelSession = (session: SessionBooking) => {
    const sessionDate = parseISO(session.scheduledDate);
    const cancelDeadline = subHours(sessionDate, 24); // 24 hours before session
    
    // Allow cancellation if session is scheduled/confirmed and we're before the 24-hour deadline
    return isAfter(now, cancelDeadline) === false && (session.status === 'scheduled' || session.status === 'confirmed');
  };

  const canJoinSession = (session: SessionBooking) => {
    const sessionDate = parseISO(session.scheduledDate);
    const joinWindow = subHours(sessionDate, 0.25); // 15 minutes before
    return isAfter(now, joinWindow) && isBefore(now, sessionDate) && (session.status === 'scheduled' || session.status === 'confirmed');
  };

  const handleCancelSession = (session: any) => {
    // Determine session type and prepare data
    const sessionData = {
      sessionId: session.participantId || session.id,
      type: session.id?.toString().startsWith('council-') ? 'council' : 'individual'
    };
    
    cancelSession(sessionData);
  };

  const getStatusBadge = (session: SessionBooking) => {
    const sessionDate = parseISO(session.scheduledDate);
    
    if (session.status === 'cancelled') {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (session.status === 'completed') {
      return <Badge variant="secondary">Completed</Badge>;
    }
    if ((session.status === 'scheduled' || session.status === 'confirmed') && isBefore(sessionDate, now)) {
      return <Badge variant="outline">Past</Badge>;
    }
    if (canJoinSession(session)) {
      return <Badge className="bg-green-600 hover:bg-green-700">Join Now</Badge>;
    }
    return <Badge variant="default">Scheduled</Badge>;
  };

  const SessionCard = ({ session }: { session: SessionBooking }) => (
    <Card className={compact ? "mb-3" : "mb-4"}>
      <CardContent className={compact ? "p-4" : "p-6"}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <img 
              src={session.humanMentor.user.profileImage || `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100`} 
              alt={`${session.humanMentor.user.firstName} ${session.humanMentor.user.lastName}`} 
              className={compact ? "w-10 h-10" : "w-12 h-12"} 
              style={{ borderRadius: '50%', objectFit: 'cover' }}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-semibold text-slate-900 ${compact ? 'text-sm' : ''}`}>
                  {session.humanMentor.user.firstName} {session.humanMentor.user.lastName}
                </h3>
                {getStatusBadge(session)}
              </div>
              <p className={`text-slate-600 mb-2 ${compact ? 'text-xs' : 'text-sm'}`}>{session.humanMentor.expertise}</p>
              
              <div className={`flex items-center gap-4 text-slate-600 mb-2 ${compact ? 'text-xs' : 'text-sm'}`}>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{format(parseISO(session.scheduledDate), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>{format(parseISO(session.scheduledDate), 'h:mm a')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>{session.duration} min</span>
                </div>
              </div>

              {session.sessionGoals && !compact && (
                <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-1">Session Goals:</p>
                  <p className="text-sm text-slate-600">{session.sessionGoals}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 ml-4">
            {canJoinSession(session) && session.videoLink && (
              <Button size={compact ? "sm" : "default"} asChild>
                <a href={session.videoLink} target="_blank" rel="noopener noreferrer">
                  <Video className="h-4 w-4 mr-2" />
                  Join
                </a>
              </Button>
            )}
            
            {canCancelSession(session) && !compact && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Session</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel your session with {session.humanMentor.user.firstName} {session.humanMentor.user.lastName} on {format(parseISO(session.scheduledDate), 'MMM d, yyyy')} at {format(parseISO(session.scheduledDate), 'h:mm a')}?
                      
                      This action cannot be undone, but the session slot will be returned to availability.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Session</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleCancelSession(session)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Cancel Session
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Show loading state
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-slate-600">Loading sessions...</div>
      </div>
    );
  }

  // Show API error state if we have real server errors
  const hasRealApiError = sessionsError || councilError;
  
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

  if (compact) {
    // Compact view for dashboard
    return (
      <div className="space-y-3">
        {upcomingSessions.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <div className="text-slate-500 text-sm">No upcoming sessions</div>
            <div className="text-xs text-slate-400 mt-1">
              {user?.subscriptionPlan === 'council' 
                ? 'Book your next council session' 
                : 'Book your next individual session'
              }
            </div>
          </div>
        ) : (
          upcomingSessions.slice(0, 3).map((session) => (
            <SessionCard key={session.id} session={session} />
          ))
        )}
        
        {upcomingSessions.length > 3 && (
          <div className="text-center pt-2">
            <Link href="/sessions">
              <Button variant="outline" size="sm">
                View All Sessions ({upcomingSessions.length})
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Full view for sessions page
  return (
    <div className="space-y-6">
      {/* Session Usage Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{upcomingSessions.length}</div>
              <div className="text-sm text-slate-600">Upcoming</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{pastSessions.length}</div>
              <div className="text-sm text-slate-600">Past Sessions</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">
                {user?.subscriptionPlan === 'council' 
                  ? `${councilData.filter((s: any) => {
                      const sessionDate = parseISO(s.scheduledDate);
                      return isSameMonth(sessionDate, new Date()) && (s.status === 'scheduled' || s.status === 'confirmed' || s.status === 'completed');
                    }).length}/1`
                  : `${sessionsData.filter(s => {
                      const sessionDate = parseISO(s.scheduledDate);
                      return isSameMonth(sessionDate, new Date()) && (s.status === 'scheduled' || s.status === 'confirmed' || s.status === 'completed');
                    }).length}/2`
                }
              </div>
              <div className="text-sm text-slate-600">Monthly Usage</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming ({upcomingSessions.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastSessions.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="mt-6">
          {upcomingSessions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Upcoming Sessions</h3>
                <p className="text-slate-600 mb-4">
                  {user?.subscriptionPlan === 'council' 
                    ? 'Book your next council session with multiple mentors' 
                    : 'Book your next individual session with a mentor'
                  }
                </p>
                <Link href="/dashboard">
                  <Button>
                    {user?.subscriptionPlan === 'council' ? 'Book Council Session' : 'Book Individual Session'}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div>
              {upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="past" className="mt-6">
          {pastSessions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Past Sessions</h3>
                <p className="text-slate-600">
                  Your completed sessions will appear here after your first mentoring session.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div>
              {pastSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
