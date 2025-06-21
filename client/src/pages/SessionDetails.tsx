import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Video, 
  User, 
  Target, 
  AlertCircle,
  ExternalLink 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format, parseISO, isAfter, subMinutes } from 'date-fns';

export default function SessionDetails() {
  const [, params] = useRoute('/session/:sessionId');
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const sessionId = params?.sessionId ? parseInt(params.sessionId) : null;

  const { data: session, isLoading } = useQuery({
    queryKey: ['/api/session-bookings', sessionId],
    enabled: !!sessionId,
  });

  const cancelSessionMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/session-bookings/${sessionId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast({ title: 'Session cancelled successfully' });
      setLocation('/dashboard');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to cancel session', variant: 'destructive' });
    },
  });

  if (!sessionId || isLoading) {
    return <div className="flex justify-center p-8">Loading session details...</div>;
  }

  if (!session) {
    return <div className="text-center p-8">Session not found</div>;
  }

  const scheduledDate = parseISO(session.scheduledAt);
  const now = new Date();
  const sessionStarted = isAfter(now, scheduledDate);
  const canJoinEarly = isAfter(now, subMinutes(scheduledDate, 15)); // Can join 15 minutes early
  const jitsiRoomUrl = session.jitsiRoomId 
    ? `https://meet.jit.si/${session.jitsiRoomId}`
    : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (date: Date) => {
    return format(date, 'h:mm a');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" onClick={() => setLocation('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Session Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Session Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Session Information</span>
                </CardTitle>
                <Badge className={getStatusColor(session.status)}>
                  {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="font-medium">{format(scheduledDate, 'EEEE, MMMM d, yyyy')}</p>
                    <p className="text-sm text-slate-500">Session Date</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="font-medium">{formatTime(scheduledDate)}</p>
                    <p className="text-sm text-slate-500">{session.duration} minutes</p>
                  </div>
                </div>
              </div>

              {session.sessionGoals && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="h-4 w-4 text-slate-500" />
                      <span className="font-medium">Session Goals</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">{session.sessionGoals}</p>
                  </div>
                </>
              )}

              {session.sessionNotes && (
                <>
                  <Separator />
                  <div>
                    <span className="font-medium">Session Notes</span>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">{session.sessionNotes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Video Meeting */}
          {jitsiRoomUrl && session.status === 'confirmed' && (
            <Card className="border-2 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Video className="h-5 w-5" />
                  <span>Video Meeting</span>
                </CardTitle>
                <CardDescription>
                  {canJoinEarly 
                    ? "You can join the meeting now" 
                    : "Meeting will be available 15 minutes before the scheduled time"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!canJoinEarly && (
                  <div className="flex items-center space-x-2 p-3 bg-amber-100 text-amber-800 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">
                      Meeting will be available at {format(subMinutes(scheduledDate, 15), 'h:mm a')}
                    </span>
                  </div>
                )}
                
                <Button
                  onClick={() => window.open(jitsiRoomUrl, '_blank')}
                  disabled={!canJoinEarly}
                  className="w-full"
                  size="lg"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Join Video Call
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
                
                <p className="text-xs text-slate-500 text-center">
                  Room ID: {session.jitsiRoomId}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Mentor Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Your Mentor</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={session.humanMentor?.user?.profileImage} />
                  <AvatarFallback>
                    {session.humanMentor?.user?.firstName?.[0]}
                    {session.humanMentor?.user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {session.humanMentor?.user?.firstName} {session.humanMentor?.user?.lastName}
                  </p>
                  <p className="text-sm text-slate-500">{session.humanMentor?.expertise}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Experience</span>
                  <span className="text-sm font-medium">{session.humanMentor?.totalSessions} sessions</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Rating</span>
                  <span className="text-sm font-medium">
                    {session.humanMentor?.rating || 'No ratings yet'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Duration</span>
                  <span className="text-sm font-medium">
                    {session.sessionType === 'council' ? '60 minutes' : '30 minutes'}
                  </span>
                </div>
              </div>

              {session.humanMentor?.bio && (
                <>
                  <Separator />
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {session.humanMentor.bio}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Session Actions */}
          {session.status === 'confirmed' && !sessionStarted && (
            <Card>
              <CardHeader>
                <CardTitle>Manage Session</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => cancelSessionMutation.mutate()}
                  disabled={cancelSessionMutation.isPending}
                  variant="destructive"
                  className="w-full"
                >
                  {cancelSessionMutation.isPending ? 'Cancelling...' : 'Cancel Session'}
                </Button>
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Cancellation is free up to 24 hours before the session
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}