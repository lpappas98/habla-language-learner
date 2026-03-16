import { useState, useEffect } from 'react';
import { useUserStore } from '../store/userStore';
import { tier1Stories } from '../data/immersion/tier1-stories';

export interface ImmersionStoryNormalized {
  titleEs: string;
  titleEn: string;
  bodyEs: string;
  bodyEn: string;
  newVocab: Array<{ word: string; translation: string }>;
  questions: Array<{
    questionEn: string;
    answerEs: string;
    answerEn: string;
  }>;
}

// Raw shape returned by the AI generation endpoint
interface GeneratedStoryRaw {
  title_es: string;
  title_en: string;
  body_es: string;
  body_en: string;
  new_vocab: Array<{ word: string; translation: string }>;
  comprehension_questions: Array<{
    question_en: string;
    answer_es: string;
    answer_en: string;
  }>;
}

function normalizeGenerated(raw: GeneratedStoryRaw): ImmersionStoryNormalized {
  return {
    titleEs: raw.title_es,
    titleEn: raw.title_en,
    bodyEs: raw.body_es,
    bodyEn: raw.body_en,
    newVocab: raw.new_vocab ?? [],
    questions: (raw.comprehension_questions ?? []).map(q => ({
      questionEn: q.question_en,
      answerEs: q.answer_es,
      answerEn: q.answer_en,
    })),
  };
}

function normalizeFallback(story: (typeof tier1Stories)[number]): ImmersionStoryNormalized {
  return {
    titleEs: story.titleEs,
    titleEn: story.titleEn,
    bodyEs: story.bodyEs,
    bodyEn: story.bodyEn,
    newVocab: [],
    questions: story.questions,
  };
}

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:3000';

export const useImmersionStory = (
  knownPatternIds: number[],
  knownVocab: string[],
  tier: 'tier1' | 'tier2'
) => {
  const [story, setStory] = useState<ImmersionStoryNormalized | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const storyIndex = useUserStore(s => tier === 'tier1' ? s.tier1StoryIndex : s.tier2StoryIndex);
  const incrementStoryIndex = useUserStore(s => s.incrementStoryIndex);
  const userId = useUserStore(s => s.userId);

  useEffect(() => {
    let cancelled = false;

    const fetchStory = async () => {
      setIsLoading(true);
      try {
        const response = await Promise.race([
          fetch(`${SERVER_URL}/ai/generate-story`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': userId ?? '',
            },
            body: JSON.stringify({
              known_pattern_ids: knownPatternIds,
              known_vocab_words: knownVocab,
              tier,
              story_index: storyIndex,
            }),
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 10000)
          ),
        ]);

        if (!cancelled && (response as Response).ok) {
          const data: GeneratedStoryRaw = await (response as Response).json();
          setStory(normalizeGenerated(data));
        } else if (!cancelled) {
          throw new Error('fetch failed');
        }
      } catch {
        if (!cancelled) {
          const fallback = tier1Stories[storyIndex % tier1Stories.length];
          setStory(normalizeFallback(fallback));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchStory();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markComplete = () => incrementStoryIndex(tier);

  return { story, isLoading, markComplete };
};
