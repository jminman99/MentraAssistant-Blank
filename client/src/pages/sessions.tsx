import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, Clock, Video, User, X, ExternalLink, Star, ArrowLeft, Home, Users, MessageSquare } from "lucide-react";
import { format, parseISO, isAfter, isBefore, subHours, isSameMonth } from "date-fns";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";

interface SessionBooking {
  id: number;
  scheduledDate: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  meetingType: string;
  videoLink?: string;
  sessionGoals?: string;
  humanMentor: {
    id: number;
    user: {
      firstName: string;
      lastName: string;
      profileImage?: string;
    };
    expertise: string;
    rating: string;
  };
}

export default function Sessions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("upcoming");
  const [, setLocation] = useLocation();

  // Debug user subscription plan
  console.log('[DEBUG] Sessions page user:', user);
  console.log('[DEBUG] User subscription plan:', user?.subscriptionPlan);
  
  // Helper function to get booking route
  const getBookingRoute = () => {
    const isCouncilUser = user?.subscriptionPlan === 'council';
    console.log('[DEBUG] Is council user?', isCouncilUser);
    return isCouncilUser ? '/council-scheduling' : '/individual-booking';
  };

  // Helper function to navigate to booking page
  const handleBookNewSession = () => {
    const route = getBookingRoute();
    console.log('[DEBUG] Navigating to:', route);
    setLocation(route);
  };

  // Fetch user's session bookings
  const { data: sessions = [], isLoading } = useQuery<SessionBooking[]>({
    queryKey: ['/api/session-bookings'],
  });

  // Cancel session mutation
  const { mutate: cancelSession } = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest('DELETE', `/api/session-bookings/${sessionId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel session');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Session Cancelled",
        description: "Your session has been cancelled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/session-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const now = new Date();
  const upcomingSessions = sessions.filter(session => 
    (session.status === 'scheduled' || session.status === 'confirmed') && isAfter(parseISO(session.scheduledDate), now)
  );
  const pastSessions = sessions.filter(session => 
    session.status === 'completed' || 
    ((session.status === 'scheduled' || session.status === 'confirmed') && isBefore(parseISO(session.scheduledDate), now))
  );

  const canCancelSession = (session: SessionBooking) => {
    const sessionDate = parseISO(session.scheduledDate);
    const cancelDeadline = subHours(sessionDate, 24); // 24 hours before as per PRD
    return isAfter(now, cancelDeadline) === false && (session.status === 'scheduled' || session.status === 'confirmed');
  };

  const canJoinSession = (session: SessionBooking) => {
    const sessionDate = parseISO(session.scheduledDate);
    const joinWindow = subHours(sessionDate, 0.25); // 15 minutes before
    return isAfter(now, joinWindow) && isBefore(now, sessionDate) && (session.status === 'scheduled' || session.status === 'confirmed');
  };

  const handleCancelSession = (sessionId: number) => {
    cancelSession(sessionId);
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
    <Card className="mb-4">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <img 
              src={session.humanMentor.user.profileImage || `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100`} 
              alt={`${session.humanMentor.user.firstName} ${session.humanMentor.user.lastName}`} 
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900">
                  {session.humanMentor.user.firstName} {session.humanMentor.user.lastName}
                </h3>
                {getStatusBadge(session)}
              </div>
              <p className="text-sm text-slate-600 mb-2">{session.humanMentor.expertise}</p>
              
              <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{format(parseISO(session.scheduledDate), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{format(parseISO(session.scheduledDate), 'h:mm a')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>{session.duration} min</span>
                </div>
              </div>

              {session.sessionGoals && (
                <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-1">Session Goals:</p>
                  <p className="text-sm text-slate-600">{session.sessionGoals}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 ml-4">
            {canJoinSession(session) && session.videoLink && (
              <Button size="sm" asChild>
                <a href={session.videoLink} target="_blank" rel="noopener noreferrer">
                  <Video className="h-4 w-4 mr-2" />
                  Join Session
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            )}
            
            {canCancelSession(session) && (
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
                      onClick={() => handleCancelSession(session.id)}
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

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading sessions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 pb-32 lg:pb-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
            </Link>
            <div className="flex items-center space-x-2 text-sm text-slate-500">
              <Link href="/dashboard" className="hover:text-slate-700">Dashboard</Link>
              <span>/</span>
              <span className="text-slate-900">Sessions</span>
            </div>
          </div>
          
          {/* Quick Navigation */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </Button>
            </Link>
            <Link href="/individual-booking">
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Experienced Guides</span>
              </Button>
            </Link>
            {user?.subscriptionPlan === 'council' && (
              <Link href="/council-scheduling">
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Book Council</span>
                </Button>
              </Link>
            )}
            <Link href="/mentors">
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span>AI Mentors</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Temporary Debug Display */}
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
          <h3 className="font-bold">DEBUG INFO:</h3>
          <p>User: {user ? 'Loaded' : 'Not loaded'}</p>
          <p>Subscription Plan: {user?.subscriptionPlan || 'undefined'}</p>
          <p>Is Council User: {user?.subscriptionPlan === 'council' ? 'YES' : 'NO'}</p>
          <p>Target Route: {getBookingRoute()}</p>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">My Sessions</h1>
              <p className="text-slate-600 mt-2">
                {user?.subscriptionPlan === 'council' 
                  ? 'Manage your individual and council mentor sessions' 
                  : 'Manage your individual mentor sessions'
                }
              </p>
            </div>
            <Button onClick={handleBookNewSession}>
              <User className="h-4 w-4 mr-2" />
              Book New Session
            </Button>
          </div>

          {/* Session Usage Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                    {sessions.filter(s => {
                      const sessionDate = parseISO(s.scheduledDate);
                      return isSameMonth(sessionDate, new Date()) && (s.status === 'scheduled' || s.status === 'confirmed' || s.status === 'completed');
                    }).length}/{user?.subscriptionPlan === 'council' ? 1 : 2}
                  </div>
                  <div className="text-sm text-slate-600">Monthly Usage</div>
                </div>
              </CardContent>
            </Card>
          </div>
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
                  <Button onClick={handleBookNewSession}>
                    {user?.subscriptionPlan === 'council' ? 'Book Your First Council Session' : 'Book Your First Session'}
                  </Button>
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
                  <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Past Sessions</h3>
                  <p className="text-slate-600">Your completed sessions will appear here</p>
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
    </div>
  );
}