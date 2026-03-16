import { useState } from 'react';
import { useUserStore } from '../store/userStore';

interface EvaluateRequest {
  pattern_id: number;
  pattern_description: string;
  expected_answer_es: string;
  acceptable_alternatives: string[];
  user_answer: string;
  hint_level_used: number;
}

interface EvaluateResult {
  verdict: 'correct' | 'close' | 'incorrect';
  explanation_en: string;
  corrected_es: string;
  error_type: string;
}

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:3000';

export const useAIEvaluation = () => {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const userId = useUserStore(s => s.userId);

  const evaluate = async (req: EvaluateRequest): Promise<EvaluateResult | null> => {
    setIsEvaluating(true);
    try {
      const response = await Promise.race([
        fetch(`${SERVER_URL}/ai/evaluate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId,
          },
          body: JSON.stringify(req),
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        ),
      ]);

      if (!(response as Response).ok) return null;
      return await (response as Response).json();
    } catch {
      return null; // Caller falls back to fuzzyMatch result
    } finally {
      setIsEvaluating(false);
    }
  };

  return { evaluate, isEvaluating };
};
