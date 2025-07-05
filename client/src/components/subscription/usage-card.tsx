import { Progress } from "@/components/ui/progress";
import { MessageCircle, Video, Users } from "lucide-react";
import { User } from "@/types";

interface UsageCardProps {
  user: User;
}

export function UsageCard({ user }: UsageCardProps) {
  const messageProgress = (user.messagesUsed / user.messagesLimit) * 100;
  const sessionProgress = user.sessionsLimit > 0 ? (user.sessionsUsed / user.sessionsLimit) * 100 : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Usage Overview</h3>
      
      <div className="space-y-4">
        {/* AI Messages Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600">AI Messages</span>
            </div>
            <span className="text-sm font-medium text-slate-900">
              {user.messagesUsed}/{user.messagesLimit}
            </span>
          </div>
          <Progress value={messageProgress} className="h-2" />
        </div>
        
        {/* Individual Sessions Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Video className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600">Individual Sessions</span>
            </div>
            <span className="text-sm font-medium text-slate-900">
              {user.sessionsUsed}/{user.sessionsLimit}
            </span>
          </div>
          <Progress value={sessionProgress} className="h-2" />
        </div>

        {/* Council Sessions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600">Council Sessions</span>
            </div>
            <span className="text-sm font-medium text-slate-900">
              Available
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Book group mentoring sessions with multiple mentors
          </p>
        </div>
      </div>
    </div>
  );
}
