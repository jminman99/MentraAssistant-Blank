import { Badge } from "@/components/ui/badge";
import { Clock, Calendar } from "lucide-react";
import { format } from "date-fns";

interface SessionUsageBadgeProps {
  used: number;
  limit: number;
  planType: 'individual' | 'council';
  currentMonth: Date;
  className?: string;
}

export default function SessionUsageBadge({ 
  used, 
  limit, 
  planType, 
  currentMonth, 
  className = "" 
}: SessionUsageBadgeProps) {
  const canBookMore = used < limit;
  const sessionType = planType === 'council' ? 'Council' : 'Individual';
  
  return (
    <div className={`p-4 bg-slate-50 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">
            {sessionType} Sessions ({format(currentMonth, 'MMM yyyy')})
          </span>
        </div>
        <Badge variant={canBookMore ? "secondary" : "destructive"}>
          {used}/{limit}
        </Badge>
      </div>
      {!canBookMore && (
        <p className="text-xs text-red-600">
          Monthly limit reached. Try booking for a different month.
        </p>
      )}
      {canBookMore && used > 0 && (
        <p className="text-xs text-slate-600">
          {limit - used} session{limit - used !== 1 ? 's' : ''} remaining this month
        </p>
      )}
    </div>
  );
}