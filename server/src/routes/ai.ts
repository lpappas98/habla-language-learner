import { Hono } from 'hono';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { cacheGet, cacheSet } from '../lib/redis.js';

export const aiRoutes = new Hono();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const evaluateSchema = z.object({
  exercisePromptEn: z.string(),
  userTranscription: z.string(),
  expectedEs: z.string(),
  acceptableEs: z.array(z.string()).optional(),
});

// POST /ai/evaluate — Claude evaluates open-ended Spanish response
aiRoutes.post('/evaluate', async (c) => {
  const body = await c.req.json();
  const parsed = evaluateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { exercisePromptEn, userTranscription, expectedEs, acceptableEs = [] } = parsed.data;

  // Cache by input hash
  const cacheKey = `ai:eval:${Buffer.from(userTranscription + expectedEs).toString('base64').slice(0, 40)}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return c.json(JSON.parse(cached));

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You are evaluating a Spanish language learner's response.

Task given: "${exercisePromptEn}"
Learner said: "${userTranscription}"
Expected answer: "${expectedEs}"
${acceptableEs.length > 0 ? `Other acceptable answers: ${acceptableEs.join(', ')}` : ''}

Respond ONLY with valid JSON (no markdown):
{
  "correct": true or false,
  "meaning_preserved": true or false,
  "feedback_en": "brief encouraging feedback in 1 sentence",
  "corrected_version": "corrected Spanish if wrong, omit if correct"
}`,
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}';

  let result;
  try {
    result = JSON.parse(text);
  } catch {
    result = { correct: false, meaning_preserved: false, feedback_en: 'Could not evaluate response.' };
  }

  await cacheSet(cacheKey, JSON.stringify(result), 86400);
  return c.json(result);
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
