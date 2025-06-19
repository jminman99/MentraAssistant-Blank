import { Button } from "@/components/ui/button";
import { AiMentor } from "@/types";

interface AiMentorSelectorProps {
  mentors: AiMentor[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function AiMentorSelector({ mentors, selectedId, onSelect }: AiMentorSelectorProps) {
  return (
    <div className="flex space-x-2 overflow-x-auto pb-2">
      {mentors.map((mentor) => (
        <Button
          key={mentor.id}
          variant={selectedId === mentor.id ? "default" : "secondary"}
          size="sm"
          onClick={() => onSelect(mentor.id)}
          className="flex-shrink-0 flex items-center space-x-2"
        >
          <img 
            src={mentor.avatar} 
            alt={mentor.name} 
            className="w-6 h-6 rounded-full object-cover"
          />
          <span>{mentor.name}</span>
        </Button>
      ))}
    </div>
  );
}
