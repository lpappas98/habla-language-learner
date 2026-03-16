const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:3000';

export interface SessionPlanRequest {
  session_type: 'review' | 'new_pattern' | 'mixed';
  due_patterns: Array<{ pattern_id: number; srs_ease: number; days_overdue: number }>;
  recent_error_summary: Array<{ error_type: string; count: number; last_seen: string }>;
  session_history_summary: { sessions_completed: number; avg_accuracy: number; longest_streak: number };
  session_date_local: string;
}

export interface SessionPlan {
  exercise_order: number[];
  difficulty_boost_pattern_ids: number[];
  focus_error_type: string | null;
  coach_note: string;
  hint_delay_ms: number;
}

export const fetchSessionPlan = async (
  req: SessionPlanRequest,
  userId: string
): Promise<SessionPlan | null> => {
  try {
    const response = await Promise.race([
      fetch(`${SERVER_URL}/ai/plan-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify(req),
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ]);

    if (!(response as Response).ok) return null;
    return await (response as Response).json();
  } catch {
    return null;
  }
};
