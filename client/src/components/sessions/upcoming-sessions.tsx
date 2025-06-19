import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Video } from "lucide-react";
import { MentoringSession } from "@/types";
import { format, parseISO, isFuture } from "date-fns";

interface UpcomingSessionsProps {
  compact?: boolean;
}

export function UpcomingSessions({ compact = false }: UpcomingSessionsProps) {
  const { data: sessions = [], isLoading } = useQuery<MentoringSession[]>({
    queryKey: ['/api/sessions'],
  });

  const upcomingSessions = sessions
    .filter(session => 
      session.status === 'scheduled' && 
      isFuture(parseISO(session.scheduledAt))
    )
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
                {session.humanMentor
                  ? `${session.humanMentor.user.firstName} ${session.humanMentor.user.lastName}`
                  : session.type === 'council'
                  ? 'Council Session'
                  : 'Mentor Session'
                }
              </h4>
              <p className="text-xs text-slate-600">
                {session.topic || session.humanMentor?.expertise || 'General Mentorship'}
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
                  <Video className="h-3 w-3 mr-1" />
                  {session.duration} min
                </div>
              </div>
            </div>
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
