import { Hono } from 'hono';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { cacheGet, cacheSet } from '../lib/redis.js';
import { callClaude, callClaudeStream, withCache, cacheKey } from '../lib/ai.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export const aiRoutes = new Hono();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// normalizeSpanish is duplicated here from the mobile lib/utils.ts
// Keep it co-located in the server to avoid cross-boundary imports
const normalizeSpanish = (s: string): string =>
  s.trim().toLowerCase().replace(/[¿?¡!.,;:]/g, '').replace(/\s+/g, ' ').trim();

// POST /ai/evaluate — Claude evaluates open-ended Spanish response
aiRoutes.post('/evaluate', authMiddleware, async (c) => {
  const body = await c.req.json();
  const {
    pattern_id,
    pattern_description,
    expected_answer_es,
    acceptable_alternatives,
    user_answer,
    hint_level_used,
  } = body;

  const normalizedAnswer = normalizeSpanish(user_answer);
  const key = cacheKey([pattern_id, normalizedAnswer]);

  try {
    const raw = await withCache(key, 60 * 60 * 24 * 7, () => {
      const userContent = JSON.stringify({
        pattern_description,
        expected_answer: expected_answer_es,
        acceptable_alternatives,
        learner_answer: user_answer,
        hint_level_used,
      });
      return callClaude('evaluate', userContent);
    });

    const parsed = JSON.parse(raw);
    return c.json(parsed);
  } catch (err) {
    console.error('AI evaluate error:', err);
    return c.json({ error: 'evaluation_failed' }, 500);
  }
});

const generateSchema = z.object({
  masteredPatternSlugs: z.array(z.string()),
  difficulty: z.number().min(0).max(1).optional(),
});

// POST /ai/generate-exercise — generate a new exercise
aiRoutes.post('/generate-exercise', async (c) => {
  const body = await c.req.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { masteredPatternSlugs, difficulty = 0.5 } = parsed.data;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Generate a Spanish construction exercise for a learner who knows: ${masteredPatternSlugs.join(', ')}.

Requirements:
- Use ONLY vocabulary from patterns the learner knows
- Combine at least 2 learned patterns
- Natural sentence someone would actually say
- Target difficulty: ${difficulty} (0=easy, 1=hard)

Respond ONLY with valid JSON (no markdown):
{
  "prompt_en": "English sentence to construct",
  "expected_es": "Primary correct Spanish answer",
  "acceptable_es": ["alternative valid answer"],
  "patterns_used": ["pattern-slug-1", "pattern-slug-2"],
  "hint": "brief hint referencing the pattern rule",
  "difficulty": 0.0
}`,
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
  try {
    return c.json(JSON.parse(text));
  } catch {
    return c.json({ error: 'Failed to generate exercise' }, 500);
  }
});

// POST /ai/plan-session — Claude plans the session structure for the user
aiRoutes.post('/plan-session', authMiddleware, async (c) => {
  const userId = c.get('userId'); // from JWT via auth middleware
  const body = await c.req.json();
  const { session_type, due_patterns, recent_error_summary, session_history_summary } = body;

  // Use session_date_local from client (device's YYYY-MM-DD in local timezone)
  const sessionDateLocal = (body.session_date_local as string) || new Date().toISOString().slice(0, 10);
  const key = cacheKey([userId, sessionDateLocal]);

  try {
    const raw = await withCache(key, 60 * 60 * 24, () => {
      const userContent = JSON.stringify({
        session_type,
        due_patterns,
        recent_error_summary,
        session_history_summary,
      });
      return callClaude('plan-session', userContent, { maxTokens: 1024 });
    });

    const parsed = JSON.parse(raw);

    // Clamp hint_delay_ms to [3000, 20000]
    if (parsed.hint_delay_ms !== undefined) {
      parsed.hint_delay_ms = Math.min(20000, Math.max(3000, parsed.hint_delay_ms));
    }

    return c.json(parsed);
  } catch (err) {
    console.error('AI plan-session error:', err);
    return c.json({ error: 'planning_failed' }, 500);
  }
});

const microChallengeSchema = z.object({
  masteredPatternSlugs: z.array(z.string()),
  timeOfDay: z.enum(['morning', 'afternoon', 'evening']),
});

// POST /ai/micro-challenge — generate a push notification micro-challenge
aiRoutes.post('/micro-challenge', async (c) => {
  const body = await c.req.json();
  const parsed = microChallengeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { masteredPatternSlugs, timeOfDay } = parsed.data;

  const scenarios = {
    morning: 'ordering breakfast at a café',
    afternoon: 'talking to a colleague or running errands',
    evening: 'ordering dinner or chatting with friends',
  };

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Generate a 15-second Spanish micro-challenge for a learner who knows: ${masteredPatternSlugs.join(', ')}.

Context: It's ${timeOfDay} (scenario: ${scenarios[timeOfDay]}).

Respond ONLY with valid JSON (no markdown):
{
  "scenario_en": "brief scenario description",
  "challenge_en": "How would you say: '...'",
  "answer_es": "Spanish answer",
  "hint": "brief hint referencing the pattern",
  "patterns_used": ["pattern-slug"]
}`,
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
  try {
    return c.json(JSON.parse(text));
  } catch {
    return c.json({ error: 'Failed to generate challenge' }, 500);
  }
});

// POST /ai/conversation — SSE streaming endpoint for real-time NPC conversation
aiRoutes.post('/conversation', authMiddleware, async (c) => {
  const body = await c.req.json();
  const {
    scenario,
    turn_number,
    conversation_history,
    user_known_pattern_ids,
    evaluate_last_turn,
  } = body;

  const userContent = JSON.stringify({
    scenario,
    turn_number,
    conversation_history,
    user_known_pattern_ids,
    evaluate_last_turn,
    instruction: evaluate_last_turn
      ? 'Generate next NPC response AND evaluate the last user turn.'
      : 'Generate the opening NPC line. No user turn to evaluate (set user_turn_feedback to null).',
  });

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  const stream = callClaudeStream('conversation', userContent, { maxTokens: 1024 });

  const SENTINEL = '---FEEDBACK---';
  let npcBuffer = '';
  let feedbackBuffer = '';
  let sentinelFound = false;

  return c.body(
    new ReadableStream({
      async start(controller) {
        const encode = (data: object, event: string) => {
          controller.enqueue(
            new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text;

              if (!sentinelFound) {
                npcBuffer += text;
                if (npcBuffer.includes(SENTINEL)) {
                  sentinelFound = true;
                  const parts = npcBuffer.split(SENTINEL);
                  if (parts[0].trim()) encode({ token: parts[0] }, 'npc_token');
                  feedbackBuffer = parts[1] ?? '';
                } else {
                  const safeLength = Math.max(0, npcBuffer.length - SENTINEL.length);
                  if (safeLength > 0) {
                    encode({ token: npcBuffer.slice(0, safeLength) }, 'npc_token');
                    npcBuffer = npcBuffer.slice(safeLength);
                  }
                }
              } else {
                feedbackBuffer += text;
              }
            }
          }

          try {
            const parsed = JSON.parse(feedbackBuffer.trim());
            encode({ npc_response_en: parsed.npc_response_en ?? null }, 'translation');
            encode({ user_turn_feedback: parsed.user_turn_feedback ?? null }, 'feedback');
            encode({ conversation_complete: parsed.conversation_complete ?? false }, 'done');
          } catch {
            encode({ conversation_complete: false }, 'done');
          }
        } catch (err) {
          console.error('AI conversation stream error:', err);
          encode({ error: 'stream_failed' }, 'error');
        } finally {
          controller.close();
        }
      },
    })
  );
});

// POST /ai/generate-story — generate a contextual story using known patterns and vocabulary
aiRoutes.post('/generate-story', authMiddleware, async (c) => {
  const body = await c.req.json();
  const { known_pattern_ids, known_vocab_words, tier, story_index } = body;

  // Sort pattern IDs so cache key is deterministic regardless of order
  const sortedIds = [...known_pattern_ids].sort((a: number, b: number) => a - b);
  const key = cacheKey([sortedIds.join(','), tier, story_index]);

  try {
    const raw = await withCache(key, null, () => { // null = permanent TTL
      const userContent = JSON.stringify({
        known_pattern_ids: sortedIds,
        known_vocab_words,
        tier,
        story_variation_seed: story_index,
      });
      return callClaude('generate-story', userContent, { maxTokens: 2048 });
    });

    const parsed = JSON.parse(raw);
    return c.json(parsed);
  } catch (err) {
    console.error('AI generate-story error:', err);
    return c.json({ error: 'generation_failed' }, 500);
  }
});
