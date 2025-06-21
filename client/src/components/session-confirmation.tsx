import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, Clock, Video, User, Users } from "lucide-react";
import { format } from "date-fns";
import { HumanMentor } from "@/types";

interface SessionConfirmationProps {
  type: 'individual' | 'council';
  mentor?: HumanMentor;
  mentors?: HumanMentor[];
  date: Date;
  time: string;
  duration: number;
  sessionGoals?: string;
  onViewSessions: () => void;
  onBookAnother: () => void;
}

export default function SessionConfirmation({
  type,
  mentor,
  mentors,
  date,
  time,
  duration,
  sessionGoals,
  onViewSessions,
  onBookAnother
}: SessionConfirmationProps) {
  const isCouncil = type === 'council';
  const sessionTitle = isCouncil ? 'Council Session Confirmed!' : 'Individual Session Confirmed!';
  const sessionDescription = isCouncil 
    ? 'Your council session is scheduled and ready to go.'
    : 'Your individual session is scheduled and ready to go.';

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-slate-900 mb-4">{sessionTitle}</h1>
              <p className="text-slate-600">{sessionDescription}</p>
            </div>

            {/* Session Summary */}
            <div className="bg-slate-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-slate-900 mb-4">Session Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  {isCouncil && mentors ? (
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-slate-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-900">Council Members ({mentors.length})</p>
                        <div className="text-sm text-slate-600 space-y-1">
                          {mentors.map(m => (
                            <p key={m.id}>{m.user.firstName} {m.user.lastName} - {m.expertise}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : mentor ? (
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="font-medium text-slate-900">
                          {mentor.user.firstName} {mentor.user.lastName}
                        </p>
                        <p className="text-sm text-slate-600">{mentor.expertise}</p>
                      </div>
                    </div>
                  ) : null}
                  
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-900">
                        {format(date, 'MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-slate-600">
                        {time} ({duration} minutes)
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Video className="h-5 w-5 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-900">Video Session</p>
                      <p className="text-sm text-slate-600">
                        Join link will be sent via email
                      </p>
                    </div>
                  </div>
                  
                  {sessionGoals && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-slate-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-900">Session Goals</p>
                        <p className="text-sm text-slate-600">{sessionGoals}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={onViewSessions} className="flex-1">
                View All Sessions
              </Button>
              <Button variant="outline" onClick={onBookAnother} className="flex-1">
                Book Another Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}