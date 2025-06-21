import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MessageCircle, Video } from "lucide-react";
import { User } from "@/types";

interface UsageCardProps {
  user: User;
  onUpgrade: () => void;
}

export function UsageCard({ user, onUpgrade }: UsageCardProps) {
  const messageProgress = (user.messagesUsed / user.messagesLimit) * 100;
  const sessionProgress = user.sessionsLimit > 0 ? (user.sessionsUsed / user.sessionsLimit) * 100 : 0;

  const getPlanDisplayName = (plan: string) => {
    switch (plan) {
      case 'ai-only': return 'AI-Only';
      case 'individual': return 'Individual';
      case 'council': return 'Council';
      default: return plan;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Plan</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Current Plan</span>
          <span className="text-sm font-medium text-slate-900">
            {getPlanDisplayName(user.subscriptionPlan)}
          </span>
        </div>
        
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
        
        {/* Human Sessions Progress */}
        {user.subscriptionPlan !== 'ai-only' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Video className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-600">
                  {user.subscriptionPlan === 'council' ? 'Council Sessions' : 'Individual Sessions'}
                </span>
              </div>
              <span className="text-sm font-medium text-slate-900">
                {user.sessionsUsed}/{user.subscriptionPlan === 'council' ? 1 : user.sessionsLimit}
              </span>
            </div>
            <Progress value={sessionProgress} className="h-2" />
            {user.subscriptionPlan === 'council' && (
              <p className="text-xs text-slate-600 mt-1">
                One council session per month included
              </p>
            )}
          </div>
        )}
        {user.sessionsLimit > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Video className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-600">Human Sessions</span>
              </div>
              <span className="text-sm font-medium text-slate-900">
                {user.sessionsUsed}/{user.sessionsLimit}
              </span>
            </div>
            <Progress value={sessionProgress} className="h-2" />
          </div>
        )}
        
        <Button 
          variant="outline" 
          className="w-full"
          onClick={onUpgrade}
        >
          {user.subscriptionPlan === 'ai-only' ? 'Upgrade Plan' : 'Change Plan'}
        </Button>
      </div>
    </div>
  );
}
