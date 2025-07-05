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
    case 'Gregg Dedrick':
      return 'Former KFC President turned Christian leader. Integrates faith with marketplace success through authentic vulnerability and spiritual partnership.';
    default:
      return '';
  }
};

export function AiMentorSelector({ mentors, selectedId, onSelect }: AiMentorSelectorProps) {
  const selectedMentor = Array.isArray(mentors)
    ? mentors.find(m => m.id === selectedId)
    : null;
  const summary = selectedMentor ? getMentorSummary(selectedMentor.name) : '';

  return (
    <div className="space-y-2">
      {/* Mentor Selection Buttons */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {Array.isArray(mentors) ? mentors.map((mentor) => (
          <Button
            key={mentor.id}
            variant={selectedId === mentor.id ? "default" : "secondary"}
            size="sm"
            onClick={() => onSelect(mentor.id)}
            className="flex-shrink-0 flex items-center space-x-2"
            title={getMentorSummary(mentor.name)} // Show full summary on hover
          >
            <img 
              src={mentor.avatar} 
              alt={mentor.name} 
              className="w-6 h-6 rounded-full object-cover"
            />
            <span>{mentor.name}</span>
          </Button>
        )) : []}
      </div>
      
      {/* Compact Selected Mentor Summary */}
      {selectedId && summary && (
        <div className="bg-slate-50 rounded px-3 py-2 border-l-2 border-slate-300">
          <p className="text-xs text-slate-600 line-clamp-2">
            {summary}
          </p>
        </div>
      )}
    </div>
  );
}
