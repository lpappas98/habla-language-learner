# AI Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Claude API at 4 touchpoints — construction evaluation, session planner, immersion story generator, and a new conversation mode — each backed by learning science research.

**Architecture:** All Claude calls go through the Hono server. Mobile fallbacks to existing behavior (fuzzyMatch, static stories, SRS order) if server unreachable. Prompts are versioned text files. Cache is Redis-backed on server. Conversation mode uses SSE streaming. This plan assumes the bug-fixes-architecture plan has been completed.

**Tech Stack:** Expo 55, React Native 0.83, Hono server, Anthropic SDK (`@anthropic-ai/sdk`), Redis (via existing `server/src/lib/redis.ts`), expo-sqlite, Zustand 5, TypeScript 5.9

**Spec:** `docs/superpowers/specs/2026-03-15-ai-integration-design.md`

---

## Chunk 1: Server — Prompt Files + /ai/evaluate

### Task 1: Install Anthropic SDK on Server

**Files:**
- Modify: `server/package.json`

- [ ] **Step 1: Install SDK**

```bash
cd server && npm install @anthropic-ai/sdk
```

- [ ] **Step 2: Confirm it imports**

```bash
node -e "const { Anthropic } = require('@anthropic-ai/sdk'); console.log('OK');"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore: install @anthropic-ai/sdk on server"
```

---

### Task 2: Create Prompt Files

**Files:**
- Create: `server/src/prompts/evaluate.txt`
- Create: `server/src/prompts/plan-session.txt`
- Create: `server/src/prompts/generate-story.txt`
- Create: `server/src/prompts/conversation.txt`

- [ ] **Step 1: Create evaluate.txt**

```
You are a Spanish tutor helping an English-speaking learner practice sentence construction.

The learner is practicing a specific grammar pattern. They submitted an answer that was not fully correct. Your job is to:
1. Determine the true verdict: "close" (semantically correct but with minor errors) or "incorrect" (wrong meaning or structure)
2. Identify the specific error type
3. Write a short, encouraging explanation in English (max 2 sentences, no jargon)
4. Provide the corrected Spanish sentence

Error types: ser_vs_estar, gender_agreement, word_order, accent_mark, vocabulary, verb_conjugation, article, other

Rules:
- Tone is warm and encouraging — never discouraging
- Explanation is in English
- Corrected sentence is in Spanish
- If the learner's answer is semantically equivalent despite surface differences, use verdict "close" not "incorrect"
- Be concise — learners are on a mobile app

Respond in JSON only:
{
  "verdict": "close" | "incorrect",
  "explanation_en": "...",
  "corrected_es": "...",
  "error_type": "..."
}
```

- [ ] **Step 2: Create plan-session.txt**

```
You are a Spanish language learning coach. A learner is about to start a practice session.

Based on their recent error patterns and due exercises, create a personalized session plan.

Your job is to:
1. Order the exercises strategically — front-load the learner's weakest error type
2. Identify which patterns need harder exercises (difficulty boost)
3. Write a brief, motivating coach note (1-2 sentences) explaining today's focus
4. Suggest an appropriate hint delay in milliseconds (3000-20000ms)

Rules:
- Front-load patterns related to the most frequent recent error type
- Interleave weak patterns with stronger ones (don't cluster all hard items together)
- Coach note should name the specific thing they're working on — be specific not generic
- Duplicate pattern IDs in exercise_order are valid (means practice that pattern twice)

Respond in JSON only:
{
  "exercise_order": [patternId, ...],
  "difficulty_boost_pattern_ids": [...],
  "focus_error_type": "...",
  "coach_note": "...",
  "hint_delay_ms": number
}
```

- [ ] **Step 3: Create generate-story.txt**

```
You are creating a Spanish immersion story for a language learning app.

The story must:
1. Use ONLY sentence patterns from the provided pattern list
2. Use ONLY vocabulary from the provided word list for the narrative core
3. Introduce exactly 2-3 new vocabulary words (bold them with their translation in brackets, e.g., **mercado** [market])
4. Be 80-120 words in Spanish
5. Be set in a culturally authentic Latin American context
6. Have a simple, engaging plot with a clear beginning, middle, and end
7. Include 3-5 comprehension questions with exact Spanish answers

Rules:
- The story should feel natural, not like a textbook exercise
- New vocabulary words must appear naturally in context, not forced
- Questions should test actual comprehension, not trivial details
- All Spanish text must be grammatically correct

Respond in JSON only:
{
  "title_es": "...",
  "title_en": "...",
  "body_es": "... **word** [translation] ...",
  "body_en": "...",
  "new_vocab": [{"word": "...", "translation": "..."}],
  "comprehension_questions": [{"question_en": "...", "answer_es": "...", "answer_en": "..."}]
}
```

- [ ] **Step 4: Create conversation.txt**

```
You are playing a Spanish-speaking character in a language learning conversation scenario.

Your role:
- Speak ONLY in Spanish (simple, clear sentences appropriate for a beginner)
- Stay in character for the given scenario
- Keep responses short (1-3 sentences) so the learner can respond
- If the learner makes an error, continue the conversation naturally (don't break character to correct)

Evaluation role (when evaluate_last_turn is true):
- Separately evaluate the learner's last response
- Note: grammar correctness, naturalness, and one specific coaching point
- Be encouraging — focus on what they did well before noting improvement areas

Rules:
- NPC response must be in Spanish only
- English translation is generated separately — do not include it in npc_response_es
- Evaluation coaching_note should be in English, max 2 sentences
- If the learner's response is grammatically correct and natural, say so explicitly

Respond in JSON only:
{
  "npc_response_es": "...",
  "npc_response_en": "...",
  "user_turn_feedback": {
    "grammar_ok": boolean,
    "naturalness": "natural" | "slightly_awkward" | "unnatural",
    "coaching_note": "...",
    "error_type": "ser_vs_estar" | "gender_agreement" | "word_order" | "accent_mark" | "vocabulary" | "verb_conjugation" | "article" | "other" | null
  } | null,
  "conversation_complete": boolean
}
```

- [ ] **Step 5: Commit**

```bash
git add server/src/prompts/
git commit -m "feat: add AI system prompt files for all 4 Claude integration points"
```

---

### Task 3: Create Shared AI Client Helper

**Files:**
- Create: `server/src/lib/ai.ts`

- [ ] **Step 1: Read server/src/lib/redis.ts to understand existing patterns**

- [ ] **Step 2: Create server/src/lib/ai.ts**

```ts
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { redis } from './redis';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-4-6';

const loadPrompt = (name: string): string =>
  readFileSync(join(__dirname, '../prompts', `${name}.txt`), 'utf-8');

// Cache wrapper — returns cached string or calls fn and caches result
export const withCache = async (
  key: string,
  ttlSeconds: number | null,
  fn: () => Promise<string>
): Promise<string> => {
  const cached = await redis.get(key);
  if (cached) return cached;

  const result = await fn();

  if (ttlSeconds === null) {
    await redis.set(key, result); // permanent
  } else {
    await redis.setex(key, ttlSeconds, result);
  }

  return result;
};

export const cacheKey = (parts: (string | number)[]): string =>
  createHash('sha256').update(parts.join(':')).digest('hex');

export const callClaude = async (
  promptName: string,
  userContent: string,
  options: { maxTokens?: number } = {}
): Promise<string> => {
  const system = loadPrompt(promptName);
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: options.maxTokens ?? 512,
    system,
    messages: [{ role: 'user', content: userContent }],
  });
  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type');
  return block.text;
};

export const callClaudeStream = (
  promptName: string,
  userContent: string,
  options: { maxTokens?: number } = {}
) => {
  const system = loadPrompt(promptName);
  return client.messages.stream({
    model: MODEL,
    max_tokens: options.maxTokens ?? 1024,
    system,
    messages: [{ role: 'user', content: userContent }],
  });
};
```

- [ ] **Step 3: Verify ANTHROPIC_API_KEY is in .env**

```bash
grep ANTHROPIC_API_KEY server/.env 2>/dev/null || echo "Add ANTHROPIC_API_KEY=... to server/.env"
```

- [ ] **Step 4: Commit**

```bash
git add server/src/lib/ai.ts
git commit -m "feat: shared AI client helper with caching, prompt loading, and streaming support"
```

---

### Task 4: Update /ai/evaluate Endpoint

**Files:**
- Modify: `server/src/routes/ai.ts`

- [ ] **Step 1: Read server/src/routes/ai.ts in full**

- [ ] **Step 2: Replace the evaluate route**

Find the existing `/ai/evaluate` route handler. Replace its body entirely:

```ts
import { callClaude, withCache, cacheKey } from '../lib/ai';

// normalizeSpanish is duplicated here from the mobile lib/utils.ts
// Keep it co-located in the server to avoid cross-boundary imports
const normalizeSpanish = (s: string): string =>
  s.trim().toLowerCase().replace(/[¿?¡!.,;:]/g, '').replace(/\s+/g, ' ').trim();

app.post('/ai/evaluate', authMiddleware, async (c) => {
  const body = await c.req.json();
  const {
    pattern_id,
    pattern_description,
    expected_answer_es,
    acceptable_alternatives,
    user_answer,
    hint_level_used,
  } = body;

  // user_id comes from JWT, not body
  // auth middleware should attach user to context

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
```

- [ ] **Step 3: Confirm route is registered**

Check that the route file is imported in `server/src/index.ts`.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/ai.ts
git commit -m "feat: update /ai/evaluate with Claude integration, caching, and JWT auth"
```

---

## Chunk 2: Server — /ai/plan-session + /ai/generate-story

### Task 5: Add /ai/plan-session Endpoint

**Files:**
- Modify: `server/src/routes/ai.ts`

- [ ] **Step 1: Add plan-session route**

```ts
app.post('/ai/plan-session', authMiddleware, async (c) => {
  const userId = c.get('userId'); // from JWT via auth middleware
  const body = await c.req.json();
  const { session_type, due_patterns, recent_error_summary, session_history_summary } = body;

  // Use session_date_local from client (device's YYYY-MM-DD in local timezone)
  // so users in different timezones get the correct daily plan boundary
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
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/ai.ts
git commit -m "feat: add /ai/plan-session endpoint with daily caching per user"
```

---

### Task 6: Add /ai/generate-story Endpoint

**Files:**
- Modify: `server/src/routes/ai.ts`

- [ ] **Step 1: Add generate-story route**

```ts
app.post('/ai/generate-story', authMiddleware, async (c) => {
  const body = await c.req.json();
  const { known_pattern_ids, known_vocab_words, tier, story_index } = body;

  // Sort pattern IDs so cache key is deterministic regardless of order
  const sortedIds = [...known_pattern_ids].sort((a, b) => a - b);
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
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/ai.ts
git commit -m "feat: add /ai/generate-story endpoint with permanent cache keyed on known pattern set"
```

---

## Chunk 3: Server — /ai/conversation (SSE Streaming)

### Task 7: Add /ai/conversation Streaming Endpoint

**Files:**
- Modify: `server/src/routes/ai.ts`

- [ ] **Step 1: Add conversation route with SSE streaming**

```ts
app.post('/ai/conversation', authMiddleware, async (c) => {
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

  // SSE streaming design note:
  // Claude responds in JSON which cannot be streamed word-by-word while remaining parseable.
  // Instead: Claude streams the NPC Spanish text directly (not wrapped in JSON), followed
  // by a final structured JSON block for feedback. The prompt is updated to use this format.
  //
  // Stream format:
  // - All text before the sentinel "---FEEDBACK---" is NPC Spanish text (stream to client as npc_token events)
  // - Text after "---FEEDBACK---" is a JSON object with user_turn_feedback and conversation_complete
  //
  // Update conversation.txt prompt to instruct Claude to use this format:
  // First output the NPC Spanish response text directly (no JSON wrapper).
  // Then output "---FEEDBACK---" on its own line.
  // Then output the feedback JSON object.

  // Update conversation.txt to instruct:
  // "Output format: First write the NPC Spanish response as plain text.
  //  Then write ---FEEDBACK--- on its own line.
  //  Then write a JSON object: {"npc_response_en": "...", "user_turn_feedback": {...}, "conversation_complete": false}"

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
                // Check if sentinel appeared in this chunk or straddles a chunk boundary
                if (npcBuffer.includes(SENTINEL)) {
                  sentinelFound = true;
                  const parts = npcBuffer.split(SENTINEL);
                  // Stream any remaining NPC text before the sentinel
                  if (parts[0].trim()) encode({ token: parts[0] }, 'npc_token');
                  feedbackBuffer = parts[1] ?? '';
                } else {
                  // Safe to stream — no sentinel yet, but keep last 20 chars buffered
                  // in case sentinel straddles chunk boundary
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

          // Parse feedback
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
```

- [ ] **Step 2: Update conversation.txt prompt to use sentinel format**

Rewrite `server/src/prompts/conversation.txt` to instruct Claude:
```
[...existing system prompt content...]

Output format (REQUIRED):
First write ONLY the NPC Spanish response as plain text (no JSON, no quotes).
Then write ---FEEDBACK--- on its own line.
Then write ONLY a JSON object:
{"npc_response_en": "English translation here", "user_turn_feedback": {...} or null, "conversation_complete": false}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/ai.ts server/src/prompts/conversation.txt
git commit -m "feat: /ai/conversation SSE — sentinel-based streaming for real word-by-word NPC text delivery"
```

---

## Chunk 4: Mobile — Construction Evaluation

### Task 8: Update FeedbackOverlay to Show AI Explanation

**Files:**
- Modify: `components/session/FeedbackOverlay.tsx`

- [ ] **Step 1: Read components/session/FeedbackOverlay.tsx**

- [ ] **Step 2: Add explanation prop**

Add `explanation?: string` to the component's props interface.

In the render, below the correct answer display, add:
```tsx
{explanation && (
  <Text style={styles.explanation}>{explanation}</Text>
)}
```

Add style:
```ts
explanation: {
  color: theme.colors.creamDim,
  fontSize: 14,
  fontStyle: 'italic',
  marginTop: 8,
  lineHeight: 20,
},
```

- [ ] **Step 3: Commit**

```bash
git add components/session/FeedbackOverlay.tsx
git commit -m "feat: FeedbackOverlay accepts optional explanation prop for AI feedback"
```

---

### Task 9: Wire AI Evaluation into construction.tsx

**Files:**
- Create: `hooks/useAIEvaluation.ts`
- Modify: `app/session/construction.tsx`

- [ ] **Step 1: Create hooks/useAIEvaluation.ts**

```ts
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
  const [isLoading, setIsLoading] = useState(false);
  const session = useUserStore(s => s.session); // Supabase session for JWT

  const evaluate = async (req: EvaluateRequest): Promise<EvaluateResult | null> => {
    setIsLoading(true);
    try {
      const response = await Promise.race([
        fetch(`${SERVER_URL}/ai/evaluate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(req),
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        ),
      ]);

      if (!response.ok) return null;
      return await (response as Response).json();
    } catch {
      return null; // Caller falls back to fuzzyMatch result
    } finally {
      setIsLoading(false);
    }
  };

  return { evaluate, isLoading };
};
```

- [ ] **Step 2: Read app/session/construction.tsx in full**

- [ ] **Step 3: Integrate AI evaluation**

In `construction.tsx`, after fuzzyMatch runs and returns `close` or `incorrect`:

```ts
const { evaluate, isEvaluating } = useAIEvaluation();

// In the submit handler, after fuzzyMatch:
const localVerdict = fuzzyMatch(userInput, exercise.targetEs, difficultyConfig.fuzzyMatchThreshold);

let finalVerdict = localVerdict;
let aiExplanation: string | undefined;
let aiErrorType: ErrorType | undefined;

if (localVerdict !== 'correct') {
  const aiResult = await evaluate({
    pattern_id: exercise.patternId,
    pattern_description: currentPattern.description,
    expected_answer_es: exercise.targetEs,
    acceptable_alternatives: exercise.acceptableAlternatives,
    user_answer: userInput,
    hint_level_used: hintLevel,
  });

  if (aiResult) {
    finalVerdict = aiResult.verdict as MatchResult;
    aiExplanation = aiResult.explanation_en;
    aiErrorType = aiResult.error_type as ErrorType;
  }
}

// Pass aiExplanation to FeedbackOverlay
// Pass aiErrorType when recording the attempt
```

- [ ] **Step 4: Show loading state**

While `isEvaluating` is true, show a "Checking your answer..." text inside FeedbackOverlay before the explanation loads:
```tsx
{isEvaluating && <Text style={styles.checking}>Checking your answer...</Text>}
```

- [ ] **Step 5: Pass error_type to attempt recording**

When calling `recordAttemptIncremental`, include `errorType: aiErrorType`.

- [ ] **Step 6: Commit**

```bash
git add hooks/useAIEvaluation.ts app/session/construction.tsx
git commit -m "feat: AI evaluation in construction phase — semantic feedback for close/incorrect answers"
```

---

## Chunk 5: Mobile — Session Planner + Immersion

### Task 10: Wire Session Planner into Session Initializer

**Files:**
- Create: `hooks/useSessionPlan.ts`
- Modify: `app/session/[sessionId].tsx`
- Modify: `store/sessionStore.ts`
- Modify: `app/session/hear-examples.tsx`
- Modify: `app/session/summary.tsx`

- [ ] **Step 1: Add coachNote and focusErrorType to sessionStore**

Read `store/sessionStore.ts`. Add to state interface:
```ts
coachNote: string | null;
focusErrorType: string | null;
```

Add to initial state: `coachNote: null, focusErrorType: null`

Add action:
```ts
setSessionPlan: (plan: { coachNote: string | null; focusErrorType: string | null }) => void;
```

Implement:
```ts
setSessionPlan: (plan) => set({ coachNote: plan.coachNote, focusErrorType: plan.focusErrorType }),
```

- [ ] **Step 2: Create hooks/useSessionPlan.ts**

```ts
import { useUserStore } from '../store/userStore';

interface SessionPlanRequest {
  session_type: 'review' | 'new_pattern' | 'mixed';
  due_patterns: Array<{ pattern_id: number; srs_ease: number; days_overdue: number }>;
  recent_error_summary: Array<{ error_type: string; count: number; last_seen: string }>;
  session_history_summary: { sessions_completed: number; avg_accuracy: number; longest_streak: number };
}

interface SessionPlan {
  exercise_order: number[];
  difficulty_boost_pattern_ids: number[];
  focus_error_type: string | null;
  coach_note: string;
  hint_delay_ms: number;
}

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:3000';

export const fetchSessionPlan = async (
  req: SessionPlanRequest,
  accessToken: string
): Promise<SessionPlan | null> => {
  try {
    const response = await Promise.race([
      fetch(`${SERVER_URL}/ai/plan-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(req),
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ]);

    if (!response.ok) return null;
    return await (response as Response).json();
  } catch {
    return null;
  }
};
```

- [ ] **Step 3: Implement reorderByPlan helper and wire session planner**

Read `app/session/[sessionId].tsx`. Add the `reorderByPlan` helper and call the planner:

```ts
import { toLocalDateString } from '../../lib/utils';

// Reorders exercises to match the plan's patternId order.
// Duplicate patternIds in plan = that exercise appears twice.
const reorderByPlan = (exercises: Exercise[], planOrder: number[]): Exercise[] => {
  const byPatternId = new Map<number, Exercise>();
  for (const ex of exercises) {
    if (!byPatternId.has(ex.patternId)) byPatternId.set(ex.patternId, ex);
  }
  return planOrder.reduce<Exercise[]>((acc, patternId) => {
    const ex = byPatternId.get(patternId);
    if (ex) acc.push(ex);
    return acc;
  }, []);
};

// In session initialization, before setExercises():
const plan = await fetchSessionPlan(
  { ...planRequest, session_date_local: toLocalDateString(new Date()) },
  session?.access_token ?? ''
);

if (plan) {
  const reordered = reorderByPlan(exercises, plan.exercise_order);
  sessionStore.setExercises(reordered);
  sessionStore.setSessionPlan({ coachNote: plan.coach_note, focusErrorType: plan.focus_error_type });
} else {
  // Fallback: SRS-ordered exercises
  sessionStore.setExercises(exercises);
}
```

- [ ] **Step 4: Show coach note in hear-examples**

Read `app/session/hear-examples.tsx`. Add a banner above the first example:
```tsx
const coachNote = useSessionStore(s => s.coachNote);

{coachNote && (
  <View style={styles.coachNoteBanner}>
    <Text style={styles.coachNoteText}>🎯 {coachNote}</Text>
  </View>
)}
```

- [ ] **Step 5: Show coach note in summary**

In `app/session/summary.tsx`, show coach note in a "Today's Focus" section below the star rating.

- [ ] **Step 6: Commit**

```bash
git add hooks/useSessionPlan.ts store/sessionStore.ts app/session/[sessionId].tsx app/session/hear-examples.tsx app/session/summary.tsx
git commit -m "feat: AI session planner — personalized exercise order and coach note based on error history"
```

---

### Task 11: AI Immersion Story Generator

**Files:**
- Create: `hooks/useImmersionStory.ts`
- Modify: `app/session/immersion.tsx`
- Modify: `components/session/ImmersionPlayer.tsx`
- Modify: `store/userStore.ts`

- [ ] **Step 1: Add story index tracking to userStore**

Read `store/userStore.ts`. Add:
```ts
tier1StoryIndex: number;
tier2StoryIndex: number;

incrementStoryIndex: (tier: 'tier1' | 'tier2') => void;
```

Implement:
```ts
incrementStoryIndex: (tier) =>
  set(s => ({
    tier1StoryIndex: tier === 'tier1' ? s.tier1StoryIndex + 1 : s.tier1StoryIndex,
    tier2StoryIndex: tier === 'tier2' ? s.tier2StoryIndex + 1 : s.tier2StoryIndex,
  })),
```

Persist via MMKV (follow existing pattern in userStore for other persisted fields).

- [ ] **Step 2: Create hooks/useImmersionStory.ts**

```ts
import { useState, useEffect } from 'react';
import { useUserStore } from '../store/userStore';
import { tier1Stories } from '../data/immersion/tier1-stories'; // fallback

interface GeneratedStory {
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

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:3000';

export const useImmersionStory = (
  knownPatternIds: number[],
  knownVocab: string[],
  tier: 'tier1' | 'tier2'
) => {
  const [story, setStory] = useState<GeneratedStory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const storyIndex = useUserStore(s => tier === 'tier1' ? s.tier1StoryIndex : s.tier2StoryIndex);
  const incrementStoryIndex = useUserStore(s => s.incrementStoryIndex);
  const session = useUserStore(s => s.session);

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
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              known_pattern_ids: knownPatternIds,
              known_vocab_words: knownVocab,
              tier,
              story_index: storyIndex,
            }),
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
        ]);

        if (!cancelled && (response as Response).ok) {
          const data = await (response as Response).json();
          setStory(data);
        }
      } catch {
        // Fallback to static story
        if (!cancelled) {
          const fallback = tier1Stories[storyIndex % tier1Stories.length];
          setStory(fallback as GeneratedStory);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchStory();
    return () => { cancelled = true; };
  }, []); // Only fetch once per immersion phase

  const markComplete = () => incrementStoryIndex(tier);

  return { story, isLoading, markComplete };
};
```

- [ ] **Step 3: Update ImmersionPlayer to support new_vocab**

Read `components/session/ImmersionPlayer.tsx`. Add:
- `new_vocab?: Array<{ word: string; translation: string }>` to props
- A "Vocabulary" section at the bottom of the story:
  ```tsx
  {new_vocab && new_vocab.length > 0 && (
    <View style={styles.vocabSection}>
      <Text style={styles.vocabHeader}>New Words</Text>
      {new_vocab.map(v => (
        <Text key={v.word} style={styles.vocabItem}>
          <Text style={styles.vocabWord}>{v.word}</Text> — {v.translation}
        </Text>
      ))}
    </View>
  )}
  ```

- [ ] **Step 4: Update comprehension question validation**

In the immersion screen or ImmersionPlayer, replace click-to-reveal answers with actual validation:
```ts
const checkAnswer = (userAnswer: string, correctAnswer: string): boolean => {
  const normalize = (s: string) =>
    s.trim().toLowerCase().replace(/[¿?¡!.,;:]/g, '').replace(/\s+/g, ' ');
  return normalize(userAnswer) === normalize(correctAnswer);
};
```

On incorrect: show `answer_en` as the explanation.

- [ ] **Step 5: Wire useImmersionStory into immersion.tsx**

Read `app/session/immersion.tsx`. Replace the static story lookup with:
```ts
const { story, isLoading, markComplete } = useImmersionStory(
  knownPatternIds,
  knownVocabWords,
  tier
);
```

Show a loading skeleton while `isLoading`. Call `markComplete()` when user finishes the story.

- [ ] **Step 6: Commit**

```bash
git add hooks/useImmersionStory.ts components/session/ImmersionPlayer.tsx app/session/immersion.tsx store/userStore.ts
git commit -m "feat: AI immersion story generation — personalized i+1 stories with vocabulary glossary and real answer validation"
```

---

## Chunk 6: Mobile — DB Migrations + Conversation Mode

### Task 12: Add error_type and source columns to exercise_attempts (prerequisite for Task 13)

**Files:**
- Modify: `lib/db.ts`

**Must be done before Task 13** — conversation screen passes `patternId: null` and `exerciseId: null` to `recordAttemptIncremental`, which requires the function signature and DB schema to support nullable values.

- [ ] **Step 1: Update recordAttemptIncremental signature in lib/db.ts**

Read `lib/db.ts`. Find `recordAttemptIncremental`. Change `patternId: number` and `exerciseId: number` to `patternId: number | null` and `exerciseId: number | null`. Update the SQL to handle null values (SQLite accepts NULL for INTEGER columns that allow null).

- [ ] **Step 2: Add DB migrations**

In `initializeDatabase()`, add (if not already added in the bug-fixes plan):
```ts
try {
  await db.runAsync('ALTER TABLE exercise_attempts ADD COLUMN error_type TEXT');
} catch {}
try {
  await db.runAsync(`ALTER TABLE exercise_attempts ADD COLUMN source TEXT NOT NULL DEFAULT 'construction'`);
} catch {}
```

- [ ] **Step 3: Run tests**

```bash
npm test
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/db.ts
git commit -m "feat: nullable patternId/exerciseId in recordAttemptIncremental for conversation mode support"
```

---

### Task 13: Conversation Screen

**Files:**
- Create: `app/session/conversation.tsx`
- Modify: `app/(tabs)/practice.tsx`

- [ ] **Step 1: Read app/(tabs)/practice.tsx to understand existing layout**

- [ ] **Step 2: Create app/session/conversation.tsx**

```tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useUserStore } from '../../store/userStore';
import { useAllProgress } from '../../hooks/useAllProgress';
import { theme } from '../../lib/theme';
import { useDatabase } from '../../hooks/useDatabase';
import { recordAttemptIncremental } from '../../lib/db';
import type { ErrorType } from '../../types';

const MAX_TURNS = 8;
const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:3000';

interface ConversationTurn {
  role: 'npc' | 'user';
  text_es: string;
  text_en?: string;
  feedback?: {
    grammar_ok: boolean;
    naturalness: string;
    coaching_note: string;
    error_type: ErrorType | null;
  } | null;
  showTranslation: boolean;
  showFeedback: boolean;
}

const SCENARIOS: Record<string, { label: string; opening: string }> = {
  ordering_coffee: { label: 'Ordering Coffee', opening: '¡Buenos días! ¿Qué desea tomar?' },
  asking_directions: { label: 'Asking Directions', opening: '¡Hola! ¿Necesita ayuda?' },
  meeting_neighbor: { label: 'Meeting a Neighbor', opening: '¡Hola! Soy su nuevo vecino. ¿Cómo se llama?' },
  market_shopping: { label: 'Market Shopping', opening: '¡Buenas tardes! ¿En qué le puedo ayudar?' },
  asking_time: { label: 'Asking the Time', opening: 'Disculpe, ¿tiene la hora?' },
};

export default function ConversationScreen() {
  const { scenario = 'ordering_coffee' } = useLocalSearchParams<{ scenario: string }>();
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isNpcLoading, setIsNpcLoading] = useState(false);
  const [turnNumber, setTurnNumber] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const hasRetriedRef = useRef(false); // tracks whether we've already retried once per turn
  const npcEnRef = useRef<string | null>(null); // stores English translation from 'translation' SSE event
  const session = useUserStore(s => s.session);
  const userId = useUserStore(s => s.userId) ?? '';
  const db = useDatabase();
  // Derive introduced pattern IDs from progress data
  const { data: progress } = useAllProgress();
  const knownPatternIds = Object.entries(progress ?? {})
    .filter(([, status]) => status !== null)
    .map(([id]) => Number(id));

  // Initialize with opening NPC line
  useEffect(() => {
    sendNpcTurn([], false);
  }, []);

  const sendNpcTurn = async (history: ConversationTurn[], evaluateLast: boolean) => {
    hasRetriedRef.current = false; // reset retry flag for each new turn
    npcEnRef.current = null;       // reset translation for each new turn
    setIsNpcLoading(true);

    const conversationHistory = history.map(t => ({
      role: t.role,
      text_es: t.text_es,
    }));

    let npcText = '';

    try {
      const response = await Promise.race([
        fetch(`${SERVER_URL}/ai/conversation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            scenario,
            turn_number: turnNumber,
            conversation_history: conversationHistory,
            // Pass introduced pattern IDs so Claude calibrates language complexity
            // Read from userStore/progress: patterns with status !== null
            user_known_pattern_ids: knownPatternIds,
            evaluate_last_turn: evaluateLast,
          }),
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
      ]);

      const reader = (response as Response).body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let feedbackData: ConversationTurn['feedback'] = null;
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('event: npc_token')) continue;
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.token !== undefined) {
              npcText += data.token;
              // Update NPC bubble in real-time
              setTurns(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'npc' && last.text_es === '...') {
                  return [...prev.slice(0, -1), { ...last, text_es: npcText }];
                }
                return prev;
              });
            }
            if (data.npc_response_en !== undefined) {
              npcEnRef.current = data.npc_response_en; // from 'translation' SSE event
            }
            if (data.user_turn_feedback !== undefined) {
              feedbackData = data.user_turn_feedback;
            }
            if (data.conversation_complete !== undefined) {
              done = data.conversation_complete;
              if (done) setIsComplete(true);
            }
          }
        }
      }

      // With sentinel design, npcText is already plain Spanish text (not JSON).
      // npcEn and feedbackData arrive via separate SSE events (translation, feedback).
      // The SSE event handler below accumulates them into npcEnRef and feedbackData.
      // By this point, all events have been processed — just update turns state.

      setTurns(prev => {
        const withoutPlaceholder = prev.filter(t => !(t.role === 'npc' && t.text_es === '...'));

        // Update feedback on last user turn
        let updated = withoutPlaceholder;
        if (evaluateLast && feedbackData !== null) {
          updated = updated.map((t, i) =>
            i === updated.length - 1 && t.role === 'user'
              ? { ...t, feedback: feedbackData }
              : t
          );

          // Record attempt with error type
          if (feedbackData?.error_type && db) {
            recordAttemptIncremental(db, userId, {
              sessionId: 'conversation',
              patternId: null,
              exerciseId: null,
              verdict: feedbackData.grammar_ok ? 'correct' : 'incorrect',
              responseTimeMs: 0,
              hintLevelUsed: 0,
              errorType: feedbackData.error_type,
              source: 'conversation',
            }).catch(() => {});
          }
        }

        return [
          ...updated,
          {
            role: 'npc',
            text_es: npcText.trim(),
            text_en: npcEnRef.current ?? undefined,  // set by 'translation' SSE event handler
            showTranslation: false,
            showFeedback: false,
          },
        ];
      });
    } catch (err) {
      // Spec: retry once after 1 second, then show error and end conversation
      if (!hasRetriedRef.current) {
        hasRetriedRef.current = true;
        setTimeout(() => sendNpcTurn(history, evaluateLast), 1000);
        return;
      }
      // Retry failed — end gracefully
      Alert.alert('Connection lost', 'Your progress is saved. Ending conversation.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setIsNpcLoading(false);
      setTurnNumber(n => n + 1);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleUserSubmit = () => {
    if (!userInput.trim() || isNpcLoading || isComplete) return;

    const newTurn: ConversationTurn = {
      role: 'user',
      text_es: userInput.trim(),
      showTranslation: false,
      showFeedback: false,
    };

    const placeholder: ConversationTurn = {
      role: 'npc',
      text_es: '...',
      showTranslation: false,
      showFeedback: false,
    };

    const newHistory = [...turns, newTurn, placeholder];
    setTurns(newHistory);
    setUserInput('');

    if (turnNumber >= MAX_TURNS) {
      setIsComplete(true);
      return;
    }

    sendNpcTurn([...turns, newTurn], true);
  };

  const toggleTranslation = (index: number) => {
    setTurns(prev => prev.map((t, i) =>
      i === index ? { ...t, showTranslation: !t.showTranslation } : t
    ));
  };

  const toggleFeedback = (index: number) => {
    setTurns(prev => prev.map((t, i) =>
      i === index ? { ...t, showFeedback: !t.showFeedback } : t
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Exit</Text>
        </TouchableOpacity>
        <Text style={styles.scenarioLabel}>{SCENARIOS[scenario]?.label}</Text>
        <Text style={styles.turnCounter}>Turn {Math.min(turnNumber, MAX_TURNS)}/{MAX_TURNS}</Text>
      </View>

      {/* Chat */}
      <ScrollView ref={scrollRef} style={styles.chat} contentContainerStyle={styles.chatContent}>
        {turns.map((turn, i) => (
          <View key={i} style={turn.role === 'npc' ? styles.npcRow : styles.userRow}>
            <View style={turn.role === 'npc' ? styles.npcBubble : styles.userBubble}>
              <Text style={turn.role === 'npc' ? styles.npcText : styles.userText}>
                {turn.text_es}
              </Text>
              {turn.role === 'npc' && (
                <TouchableOpacity onPress={() => toggleTranslation(i)}>
                  <Text style={styles.translationToggle}>
                    {turn.showTranslation ? '▲ Hide translation' : '▼ Show translation'}
                  </Text>
                  {turn.showTranslation && turn.text_en && (
                    <Text style={styles.translationText}>{turn.text_en}</Text>
                  )}
                </TouchableOpacity>
              )}
              {turn.role === 'user' && turn.feedback && (
                <TouchableOpacity onPress={() => toggleFeedback(i)}>
                  <Text style={styles.feedbackToggle}>
                    {turn.showFeedback ? '▲ Hide feedback' : '▼ Show feedback'}
                  </Text>
                  {turn.showFeedback && (
                    <Text style={styles.feedbackText}>{turn.feedback.coaching_note}</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
        {isNpcLoading && (
          <View style={styles.npcRow}>
            <View style={styles.npcBubble}>
              <Text style={styles.npcText}>...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      {!isComplete ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.inputRow}
        >
          <TextInput
            style={styles.input}
            value={userInput}
            onChangeText={setUserInput}
            placeholder="Respond in Spanish..."
            placeholderTextColor={theme.colors.gray}
            onSubmitEditing={handleUserSubmit}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={handleUserSubmit} style={styles.sendButton}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.completeBar}>
          <Text style={styles.completeText}>Conversation complete!</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.doneButton}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.brown },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { color: theme.colors.gold, fontSize: 16 },
  scenarioLabel: { color: theme.colors.cream, fontSize: 16, fontWeight: '600' },
  turnCounter: { color: theme.colors.gray, fontSize: 14 },
  chat: { flex: 1 },
  chatContent: { padding: 16, gap: 12 },
  npcRow: { alignItems: 'flex-start' },
  userRow: { alignItems: 'flex-end' },
  npcBubble: { backgroundColor: theme.colors.brownMid, borderRadius: 12, padding: 12, maxWidth: '80%' },
  userBubble: { backgroundColor: theme.colors.gold, borderRadius: 12, padding: 12, maxWidth: '80%' },
  npcText: { color: theme.colors.cream, fontSize: 16, lineHeight: 22 },
  userText: { color: theme.colors.brown, fontSize: 16, lineHeight: 22 },
  translationToggle: { color: theme.colors.goldDim, fontSize: 12, marginTop: 6 },
  translationText: { color: theme.colors.creamDim, fontSize: 14, fontStyle: 'italic', marginTop: 4 },
  feedbackToggle: { color: theme.colors.brownLight, fontSize: 12, marginTop: 6 },
  feedbackText: { color: theme.colors.brown, fontSize: 14, fontStyle: 'italic', marginTop: 4 },
  inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: theme.colors.brownMid, gap: 8 },
  input: { flex: 1, backgroundColor: theme.colors.brownMid, borderRadius: 8, padding: 12, color: theme.colors.cream, fontSize: 16 },
  sendButton: { backgroundColor: theme.colors.gold, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  sendText: { color: theme.colors.brown, fontWeight: '700' },
  completeBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.brownMid },
  completeText: { color: theme.colors.cream, fontSize: 16 },
  doneButton: { backgroundColor: theme.colors.gold, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  doneText: { color: theme.colors.brown, fontWeight: '700' },
});
```

- [ ] **Step 3: Add Conversation entry point to practice.tsx**

Read `app/(tabs)/practice.tsx`. Add a "Conversation Practice" card section after the existing review cards:

```tsx
import { useAllProgress } from '../../hooks/useAllProgress';

// Check unlock condition (3+ patterns with at least one attempt)
const { data: progress } = useAllProgress();
const introductedCount = Object.values(progress ?? {}).filter(p => p !== null).length;
const conversationUnlocked = introductedCount >= 3;

// In render:
<TouchableOpacity
  style={[styles.conversationCard, !conversationUnlocked && styles.locked]}
  onPress={() => conversationUnlocked && router.push('/session/conversation?scenario=ordering_coffee')}
  disabled={!conversationUnlocked}
>
  <Text style={styles.conversationTitle}>Conversation Practice</Text>
  <Text style={styles.conversationSubtitle}>
    {conversationUnlocked
      ? 'Practice real Spanish conversations with an AI tutor'
      : `Complete ${3 - introductedCount} more patterns to unlock`}
  </Text>
  {!conversationUnlocked && <Text style={styles.lockIcon}>🔒</Text>}
</TouchableOpacity>
```

- [ ] **Step 4: Commit**

```bash
git add app/session/conversation.tsx app/(tabs)/practice.tsx
git commit -m "feat: conversation mode — real-time back-and-forth with AI Spanish tutor via SSE streaming"
```

---

## Chunk 7: Mobile DB Migrations for AI Columns

### Task 13: Add error_type and source columns to exercise_attempts

**Files:**
- Modify: `lib/db.ts`

These columns are required for AI evaluation error tracking and conversation attempt storage. They were specified in the bug-fixes plan (Task 7, Step 6) but are listed here as a dependency reminder. If already done in the bug-fixes plan, skip this task.

- [ ] **Step 1: Confirm migrations exist in lib/db.ts**

Search for `error_type` in `lib/db.ts`:
```bash
grep -n "error_type" lib/db.ts
```
If found in `initializeDatabase()`, skip to Step 3. If not found, add them.

- [ ] **Step 2: Add migrations to initializeDatabase()**

```ts
try {
  await db.runAsync('ALTER TABLE exercise_attempts ADD COLUMN error_type TEXT');
} catch {}
try {
  await db.runAsync(`ALTER TABLE exercise_attempts ADD COLUMN source TEXT NOT NULL DEFAULT 'construction'`);
} catch {}
```

Also update `recordAttemptIncremental()` function signature to accept `patternId: number | null` and `exerciseId: number | null` (nullable for conversation turns).

- [ ] **Step 3: Commit**

```bash
git add lib/db.ts
git commit -m "feat: add error_type and source columns to exercise_attempts for AI tracking"
```

---

## Final

- [ ] **Run all tests**

```bash
npm test
```
Expected: All pass

- [ ] **Test /ai/evaluate endpoint**

```bash
cd server && npm run dev
# In another terminal:
curl -X POST http://localhost:3000/ai/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"pattern_id":1,"pattern_description":"Converting -tion to -cion","expected_answer_es":"La situacion es correcta","acceptable_alternatives":[],"user_answer":"La situacion esta correcta","hint_level_used":0}'
```
Expected: JSON with `verdict`, `explanation_en`, `corrected_es`, `error_type`

- [ ] **Test /ai/conversation SSE endpoint**

```bash
curl -N -X POST http://localhost:3000/ai/conversation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  --no-buffer \
  -d '{"scenario":"ordering_coffee","turn_number":1,"conversation_history":[],"user_known_pattern_ids":[1,2,3],"evaluate_last_turn":false}'
```
Expected: SSE events streaming — `npc_token` events with Spanish text, followed by `translation`, `feedback`, `done` events

- [ ] **Final commit**

```bash
git status
git add -A
git commit -m "feat: AI integration complete — evaluation, session planning, immersion generation, conversation mode"
```
