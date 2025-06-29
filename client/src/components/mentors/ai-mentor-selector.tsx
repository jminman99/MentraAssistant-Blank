import { Button } from "@/components/ui/button";
import { AiMentor } from "@/types";

interface AiMentorSelectorProps {
  mentors: AiMentor[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

// Concise mentor summaries for quick understanding
const getMentorSummary = (mentorName: string): string => {
  switch (mentorName) {
    case 'David':
      return 'Thoughtful guide for life transitions and relationships. Draws from pastoral wisdom and personal struggles to offer gentle, grounded insight.';
    case 'John Mark':
      return 'Operational leader with spiritual depth. Helps men navigate transitions, unstuck projects, and finding clarity in complex decisions.';
    case 'Frank Slootman':
      return 'High-intensity business executor. Direct, no-nonsense guidance on leadership under pressure, scaling companies, and driving results.';
    default:
      return '';
  }
};

export function AiMentorSelector({ mentors, selectedId, onSelect }: AiMentorSelectorProps) {
  return (
    <div className="space-y-4">
      {/* Mentor Selection Buttons */}
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
      
      {/* Selected Mentor Summary */}
      {selectedId && (
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <p className="text-sm text-slate-700 leading-relaxed">
            {getMentorSummary(mentors.find(m => m.id === selectedId)?.name || '')}
          </p>
        </div>
      )}
    </div>
  );
}
