import { Button } from "@/components/ui/button";
import { Star, Clock } from "lucide-react";
import { HumanMentor } from "@/types";

interface HumanMentorCardProps {
  mentor: HumanMentor;
  onBook: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export function HumanMentorCard({ mentor, onBook, disabled = false, compact = false }: HumanMentorCardProps) {
  const availability = mentor.availability as any;
  const isAvailableToday = availability?.today || Math.random() > 0.5; // Mock availability

  return (
    <div className="border border-slate-200 rounded-lg p-4 hover:border-primary transition-colors">
      <div className="flex items-start space-x-3">
        <img 
          src={mentor.user.profileImage || `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100`} 
          alt={`${mentor.user.firstName} ${mentor.user.lastName}`} 
          className="w-12 h-12 rounded-full object-cover"
        />
        <div className="flex-1">
          <h4 className="font-medium text-slate-900">
            {mentor.user.firstName} {mentor.user.lastName}
          </h4>
          <p className="text-sm text-slate-600">{mentor.expertise}</p>
          {!compact && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{mentor.bio}</p>
          )}
          <div className="flex items-center mt-2">
            <div className="flex items-center">
              <Star className="text-yellow-400 h-4 w-4 fill-current" />
              <span className="text-sm text-slate-600 ml-1">
                {parseFloat(mentor.rating).toFixed(1)}
              </span>
              {!compact && (
                <span className="text-sm text-slate-500 ml-1">
                  ({mentor.totalSessions} sessions)
                </span>
              )}
            </div>
            <div className={`w-2 h-2 rounded-full ml-3 ${isAvailableToday ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-sm text-slate-600 ml-1">
              {isAvailableToday ? 'Available Today' : 'Tomorrow'}
            </span>
          </div>
        </div>
      </div>
      <Button
        onClick={onBook}
        disabled={disabled}
        className="w-full mt-3"
        size={compact ? "sm" : "default"}
      >
        {disabled ? "Session Limit Reached" : "Book Session"}
      </Button>
    </div>
  );
}
