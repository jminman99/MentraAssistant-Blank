// mentor_story_matcher.ts

export interface MentorLifeStory {
  id: number;
  category: string;
  title: string;
  story: string;
  lesson: string;
  keywords: string[];
  emotional_tone: string;
  mentor_id?: string; // optional for filtering by speaker
}

export interface MentorSession {
  usedStoryIds: Set<number>;
  mentorId: string;
  lastCategoryUsed?: string;
  recentEmotionalTone?: string[];
}

/**
 * Match the most relevant story based on user input and session memory.
 */
export function findRelevantStory(
  userInput: string,
  stories: MentorLifeStory[],
  session: MentorSession
): MentorLifeStory | null {
  const loweredInput = userInput.toLowerCase();

  const scored = stories.map((story) => {
    let score = 0;

    // Keyword match
    story.keywords.forEach((kw) => {
      if (loweredInput.includes(kw.toLowerCase())) score += 3;
    });

    // Emotional tone hints
    const emotionalHints = ["tired", "overwhelmed", "regret", "angry", "lonely"];
    if (emotionalHints.some((hint) => loweredInput.includes(hint))) {
      if (story.emotional_tone.match(/vulnerable|grateful|broken|reflective/i)) {
        score += 2;
      }
    }

    // Contextual category boost
    if (loweredInput.includes("boss") || loweredInput.includes("meeting")) {
      if (story.category === "career") score += 2;
    }

    // Penalize repetition
    if (session.usedStoryIds.has(story.id)) {
      score -= 100;
    }

    return { story, score };
  });

  const best = scored.sort((a, b) => b.score - a.score)[0];
  return best && best.score > 0 ? best.story : null;
}

/**
 * Update session after selecting a story.
 */
export function updateSessionWithStory(session: MentorSession, story: MentorLifeStory) {
  session.usedStoryIds.add(story.id);
  session.lastCategoryUsed = story.category;
  if (!session.recentEmotionalTone) session.recentEmotionalTone = [];
  session.recentEmotionalTone.push(story.emotional_tone);
  if (session.recentEmotionalTone.length > 5) {
    session.recentEmotionalTone.shift();
  }
}