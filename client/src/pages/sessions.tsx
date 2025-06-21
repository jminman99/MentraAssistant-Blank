import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, Video, AlertCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { format, parseISO, isPast } from 'date-fns';

export default function Sessions() {
  const [, setLocation] = useLocation();
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['/api/session-bookings'],
  });

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading sessions...</div>;
  }

  const upcomingSessions = sessions.filter((session: any) => 
    !isPast(parseISO(session.scheduledAt)) && session.status === 'confirmed'
  );
  
  const pastSessions = sessions.filter((session: any) => 
    isPast(parseISO(session.scheduledAt)) || session.status === 'completed'
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (dateStr: string) => {
    return format(parseISO(dateStr), 'MMM d, yyyy • h:mm a');
  };

  const SessionCard = ({ session }: { session: any }) => (
    <Card key={session.id}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Session with {session.humanMentor?.user?.firstName}</CardTitle>
          <Badge className={getStatusColor(session.status)}>
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </Badge>
        </div>
        <CardDescription>{session.humanMentor?.expertise}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span className="text-sm">{formatTime(session.scheduledAt)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-slate-500" />
            <span className="text-sm">{session.duration} minutes</span>
          </div>
        </div>

        {session.sessionGoals && (
          <div>
            <span className="text-sm font-medium">Goals:</span>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {session.sessionGoals}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-slate-500" />
            <span className="text-sm">
              {session.humanMentor?.user?.firstName} {session.humanMentor?.user?.lastName}
            </span>
          </div>
          {session.jitsiRoomId && session.status === 'confirmed' && (
            <Video className="h-4 w-4 text-green-600" />
          )}
        </div>

        <div className="pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => setLocation(`/session/${session.id}`)}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">My Sessions</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Manage your mentoring sessions and video calls
        </p>
      </div>

      {/* Upcoming Sessions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
          Upcoming Sessions ({upcomingSessions.length})
        </h2>
        {upcomingSessions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">No upcoming sessions scheduled</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setLocation('/mentors')}
              >
                Book a Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingSessions.map((session: any) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>

      {/* Past Sessions */}
      {pastSessions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
            Past Sessions ({pastSessions.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastSessions.map((session: any) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}