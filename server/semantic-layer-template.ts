// Semantic Layer Template System
// This provides the structure for creating rich, story-driven mentor personalities

export interface SemanticStory {
  id: string;
  category: string;
  title: string;
  story: string;
  lesson: string;
  keywords: string[];
  emotionalTone: string;
}

export interface PersonalityTrait {
  trait: string;
  description: string;
  communicationStyle: string;
  examples: string[];
}

export interface MentorSemanticProfile {
  name: string;
  coreIdentity: string;
  background: string;
  stories: SemanticStory[];
  personalityTraits: PersonalityTrait[];
  signaturePhrases: string[];
  values: string[];
  communicationStyle: string;
  mentorshipApproach: string;
}

// Template categories for collecting mentor stories and wisdom
export const storyCategories = [
  {
    category: "Childhood Snapshot",
    prompts: [
      "Describe your earliest happy memory",
      "What was your biggest fear before age 12?",
      "Who was with you in that memory?"
    ]
  },
  {
    category: "Relationship with Father",
    prompts: [
      "In one story, show how your father shaped your character",
      "One lesson he taught you?"
    ]
  },
  {
    category: "Relationship with Mother", 
    prompts: [
      "Share a moment that captures your mother's influence on your life",
      "How has that moment guided you since?"
    ]
  },
  {
    category: "Peer Acceptance",
    prompts: [
      "Tell a story when you felt fully accepted by peers",
      "Tell a story when you felt rejected",
      "How did each experience change you?"
    ]
  },
  {
    category: "Marriage - Struggles & Triumphs",
    prompts: [
      "Describe the hardest season in your marriage",
      "Describe a moment that proves your marriage is worth it",
      "Key practice that helped you through?"
    ]
  },
  {
    category: "Parenting Challenges",
    prompts: [
      "Share the parenting moment you're proudest of",
      "Share the moment you wish you could redo",
      "What advice flows from each?"
    ]
  },
  {
    category: "Career Journey",
    prompts: [
      "Tell the setback that nearly derailed your career",
      "Tell the breakthrough that put you on course",
      "What principle can others copy?"
    ]
  },
  {
    category: "Signature Phrases & Perspectives",
    prompts: [
      "List 3 personal sayings or mottos you repeat",
      "Explain where each came from"
    ]
  },
  {
    category: "Spiritual Insights",
    prompts: [
      "Describe one pivotal spiritual experience",
      "What daily practice keeps you grounded?",
      "What scripture/text/mantra do you lean on?"
    ]
  }
];

// Function to find relevant stories based on user input
export function findRelevantStoriesFromProfile(
  profile: MentorSemanticProfile, 
  userInput: string, 
  limit: number = 2
): SemanticStory[] {
  const keywords = userInput.toLowerCase().split(' ');
  const storyScores = profile.stories.map(story => {
    let score = 0;
    keywords.forEach(keyword => {
      if (story.keywords.some(storyKeyword => storyKeyword.includes(keyword))) {
        score += 2;
      }
      if (story.story.toLowerCase().includes(keyword)) {
        score += 1;
      }
      if (story.lesson.toLowerCase().includes(keyword)) {
        score += 1;
      }
    });
    return { story, score };
  });

  return storyScores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.story);
}

// Function to generate response style based on context
export function getResponseStyleFromProfile(
  profile: MentorSemanticProfile,
  context: string
): string {
  if (context.includes("advice") || context.includes("what should")) {
    return `Share a relevant personal story from ${profile.name}'s experience and let the lesson emerge naturally`;
  }
  if (context.includes("scared") || context.includes("afraid")) {
    return `Acknowledge the fear with understanding, draw from ${profile.name}'s own experiences with courage`;
  }
  if (context.includes("relationship") || context.includes("marriage")) {
    return `Speak from ${profile.name}'s hard-won wisdom about relationships requiring work and understanding`;
  }
  if (context.includes("father") || context.includes("parent")) {
    return `Draw from ${profile.name}'s parenting experience, emphasize leading by example`;
  }
  return `Respond with ${profile.name}'s authentic wisdom and life experience using their natural communication style`;
}

// Generate system prompt for any mentor with semantic profile
export function generateSemanticSystemPrompt(
  profile: MentorSemanticProfile,
  userMessage: string
): string {
  const relevantStories = findRelevantStoriesFromProfile(profile, userMessage, 2);
  const responseStyle = getResponseStyleFromProfile(profile, userMessage);
  
  const storiesContext = relevantStories.length > 0 
    ? `\n\nRELEVANT LIFE EXPERIENCES:\n${relevantStories.map(story => 
        `• ${story.title}: ${story.story}\n  Key Lesson: ${story.lesson}`
      ).join('\n\n')}`
    : '';

  return `You are ${profile.name}, ${profile.coreIdentity}

BACKGROUND:
${profile.background}

PERSONALITY TRAITS:
${profile.personalityTraits.map(trait => 
  `• ${trait.trait}: ${trait.description}\n  Communication: ${trait.communicationStyle}`
).join('\n')}

SIGNATURE PHRASES (use naturally):
${profile.signaturePhrases.map(phrase => `• "${phrase}"`).join('\n')}

CORE VALUES: ${profile.values.join(', ')}

COMMUNICATION STYLE: ${profile.communicationStyle}

MENTORSHIP APPROACH: ${profile.mentorshipApproach}

RESPONSE GUIDANCE: ${responseStyle}
${storiesContext}

CONVERSATION RULES:
- You are NOT an AI giving advice - you are ${profile.name} sharing authentic wisdom
- Always speak from personal experience, never generic advice
- Use your signature phrases naturally in conversation
- Admit your own mistakes and growth journey
- Draw parallels from your specific life experiences
- Keep responses authentic to your character (2-3 paragraphs)
- If a story is relevant, tell it in your own voice with the lesson emerging naturally

Remember: You've lived through real experiences and found real wisdom. Share that authentically as ${profile.name}.`;
}

// Example template for creating new mentor profiles
export const mentorProfileTemplate: Partial<MentorSemanticProfile> = {
  name: "",
  coreIdentity: "Brief description of who they are",
  background: "Detailed background including key life experiences, career, relationships",
  stories: [
    {
      id: "",
      category: "Choose from storyCategories",
      title: "Short descriptive title",
      story: "Full narrative in first person",
      lesson: "Key wisdom or principle learned",
      keywords: ["relevant", "search", "terms"],
      emotionalTone: "tone of the story"
    }
  ],
  personalityTraits: [
    {
      trait: "Key personality trait",
      description: "How this trait manifests",
      communicationStyle: "How they communicate this trait",
      examples: ["Example phrases", "they might use"]
    }
  ],
  signaturePhrases: ["Unique sayings", "they repeat"],
  values: ["core", "values"],
  communicationStyle: "Overall communication approach",
  mentorshipApproach: "How they guide and teach others"
};