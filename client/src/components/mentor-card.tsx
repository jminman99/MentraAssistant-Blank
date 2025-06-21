import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, User } from "lucide-react";
import { HumanMentor } from "@/types";

interface MentorCardProps {
  mentor: HumanMentor;
  isSelected?: boolean;
  onClick?: () => void;
  showImage?: boolean;
  showBio?: boolean;
  className?: string;
}

export default function MentorCard({ 
  mentor, 
  isSelected = false, 
  onClick, 
  showImage = true,
  showBio = false,
  className = "" 
}: MentorCardProps) {
  const rating = mentor.rating ? parseFloat(mentor.rating) : null;
  
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? 'ring-2 ring-slate-500 border-slate-500 bg-slate-50'
          : 'hover:border-slate-300'
      } ${className}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {showImage && (
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-slate-500" />
              </div>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {mentor.user.firstName} {mentor.user.lastName}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {mentor.expertise}
                </p>
                
                {showBio && mentor.bio && (
                  <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                    {mentor.bio}
                  </p>
                )}
              </div>
              
              <div className="flex flex-col items-end gap-2 ml-2">
                {rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-400 fill-current" />
                    <span className="text-sm font-medium">{rating.toFixed(1)}</span>
                  </div>
                )}
                
                <Badge variant="secondary" className="text-xs">
                  ${mentor.hourlyRate}/hr
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}