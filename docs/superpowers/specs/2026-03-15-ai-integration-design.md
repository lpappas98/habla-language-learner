# Spec: AI Integration — Habla Language Learning
**Date:** 2026-03-15
**Project:** Habla — Spanish Learning App
**Status:** Approved

---

## Overview

Integrate Claude API at four touchpoints in the learning loop to make Habla adaptive, responsive, and more effective than static content alone. All existing pattern-based learning flows remain intact — AI layers on top to improve feedback quality, personalize sessions, generate dynamic content, and enable authentic conversation practice.

**Research foundations:**
- Hattie & Timperley (2007): Specific feedback with explanation is 3x more effective than right/wrong alone
- Kornell & Bjork (2008): Interleaving struggling patterns with stronger ones improves long-term retention
- Krashen (1982): Comprehensible input at i+1 level is the primary driver of language acquisition
- Long (1996): Negotiated meaning through authentic interaction is irreplaceable for production fluency
- Flavell (1979): Metacognitive awareness of learning patterns improves retention outcomes

---

## Architecture

### Guiding Principles
- All Claude API calls go through the server — never direct client → Claude
- Fallback to existing behavior (fuzzyMatch, static stories, SRS ordering) if server is unreachable
- Cache responses aggressively to minimize cost and latency
- Error types tagged on each attempt feed downstream into session planner
- All endpoints require `Authorization: Bearer <supabase_jwt>` header — server validates via Supabase auth

### Model
All endpoints use `claude-sonnet-4-6` (current Sonnet model). This is the API model ID. Conversation mode uses streaming (`stream: true`).

### Request Flow
```
Mobile Client → Hono Server (auth middleware) → Claude API
                      ↓
              Cache (Redis, keyed per spec below)
                      ↓
              Response → Client
```

### Caching Strategy

| Endpoint | Cache Key | TTL | Notes |
|---|---|---|---|
| `/ai/evaluate` | `sha256(pattern_id + ":" + normalize(user_answer))` | 7 days | Shared across users — evaluation of "esta" for pattern 3 is always the same |
| `/ai/plan-session` | `sha256(user_id + ":" + session_date_local)` | 24 hours | `session_date_local` = device's YYYY-MM-DD; second session same day gets same plan intentionally |
| `/ai/generate-story` | `sha256(sorted_pattern_ids.join(",") + ":" + tier + ":" + story_index)` | Permanent | Cache naturally misses when pattern set changes (new ID in sorted list) — no explicit invalidation needed |
| `/ai/conversation` | None | — | Stateful, streaming — not cacheable |

---

## Integration Point 1: Construction Evaluation

### Current Behavior
`fuzzyMatch()` returns `correct | close | incorrect`. No explanation.

### New Behavior
1. User submits construction answer
2. `fuzzyMatch()` runs instantly (no network call)
3. **If `correct`:** accept immediately — no Claude call. Cost optimization: ~60-70% of responses are correct.
4. **If `close` or `incorrect`:** call `/ai/evaluate`
5. **Claude's verdict overrides fuzzyMatch.** If fuzzyMatch says `close` but Claude says `correct` (semantic equivalence), the attempt is marked `correct`. Claude is the authority.
6. FeedbackOverlay shows `explanation_en` below the correct answer

### Server Endpoint: `POST /ai/evaluate`

**Request:**
```json
{
  "user_id": "uuid",
  "pattern_id": 3,
  "pattern_description": "Converting -tion words to -ción",
  "expected_answer_es": "La situación es complicada",
  "acceptable_alternatives": ["Es una situación complicada"],
  "user_answer": "La situación esta complicada",
  "hint_level_used": 1
}
```

**Response:**
```json
{
  "verdict": "close",
  "explanation_en": "Almost! 'Está' needs an accent mark and uses estar (temporary state), not esta (this).",
  "corrected_es": "La situación está complicada",
  "error_type": "accent_mark"
}
```

`error_type` is one of: `ser_vs_estar | gender_agreement | word_order | accent_mark | vocabulary | verb_conjugation | article | other`

**Auth & side effects:** Server validates JWT, extracts `user_id` from token (ignores `user_id` in request body as defense against spoofing). Server does NOT write the `ExerciseAttempt` — the client writes it using the `verdict` from the response. `hint_level_used` is informational context for Claude's prompt only; it does not affect scoring.

### System Prompt Strategy
Claude is a Spanish tutor giving feedback to an English-speaking learner. Tone is encouraging. Explanation in English, correction in Spanish. Maximum 2 sentences. No linguistic jargon.

### Mobile Changes
- `construction.tsx`: After `close`/`incorrect` from fuzzyMatch, call `/ai/evaluate`. Show loading state ("Checking...") while awaiting. Timeout: 5 seconds — if exceeded, fall back to fuzzyMatch verdict with no explanation.
- `FeedbackOverlay`: Add optional `explanation?: string` prop
- Store `error_type` on `ExerciseAttempt` — add `error_type TEXT` column to `exercise_attempts` table

---

## Integration Point 2: Session Planner

### Current Behavior
Session loads SRS-due exercises ordered by `next_due_at`, shuffled randomly.

### New Behavior
Before session initialization, call `/ai/plan-session`. Result drives exercise order and difficulty settings for the session.

### Server Endpoint: `POST /ai/plan-session`

**Request:**
```json
{
  "session_type": "review",
  "due_patterns": [
    { "pattern_id": 3, "srs_ease": 1.8, "days_overdue": 3 }
  ],
  "recent_error_summary": [
    { "error_type": "ser_vs_estar", "count": 7, "last_seen": "2026-03-14" },
    { "error_type": "gender_agreement", "count": 3, "last_seen": "2026-03-13" }
  ],
  "session_history_summary": {
    "sessions_completed": 12,
    "avg_accuracy": 0.74,
    "longest_streak": 5
  }
}
```

`user_id` extracted from JWT — not in request body.

**Response:**
```json
{
  "exercise_order": [3, 7, 2, 9, 3, 5],
  "difficulty_boost_pattern_ids": [3, 7],
  "focus_error_type": "ser_vs_estar",
  "coach_note": "You've been mixing up ser and estar. Today we'll focus on temporary states.",
  "hint_delay_ms": 10000
}
```

**`exercise_order` with duplicate IDs:** Intentional. Pattern 3 appearing twice means the session planner determined this pattern needs two exercise passes. The client generates two separate exercise instances from the same pattern (different prompt/target if possible, same pattern if only one exercise exists).

**`hint_delay_ms` bounds:** Client clamps to `[3000, 20000]`. Default if field absent: `10000`.

**Cache:** 24-hour TTL per `user_id + session_date`. A user who completes a session and starts another the same day gets the same plan — this is acceptable. The plan is based on historical data, not real-time state, so same-day replay is low-risk.

### Metacognitive Note
`coach_note` shown at session start (hear-examples banner) and in session summary. Research: users who understand *why* they're practicing specific things retain better (Flavell, 1979).

### Mobile Changes
- `app/session/[sessionId].tsx`: Call `/ai/plan-session` before `setExercises()`. Fallback: SRS ordering if call fails.
- `store/sessionStore.ts`: Add `coachNote: string | null` and `focusErrorType: ErrorType | null`
- `app/session/hear-examples.tsx`: Render coach note as a banner
- `app/session/summary.tsx`: Render coach note in summary section

---

## Integration Point 3: Immersion Content Generator

### Current Behavior
Static hardcoded stories in `data/immersion/tier1-stories.ts`.

### New Behavior
On immersion phase entry: compute cache key from known pattern IDs. On cache miss, call `/ai/generate-story`. Static stories remain as fallback.

### Server Endpoint: `POST /ai/generate-story`

**Request:**
```json
{
  "known_pattern_ids": [1, 2, 3, 5, 7],
  "known_vocab_words": ["casa", "agua", "tiempo", "trabajo", "familia"],
  "tier": "tier1",
  "story_index": 3
}
```

`story_index`: A sequential counter stored in `userStore` per tier (e.g., `tier1StoryIndex: number`). Incremented after each story is viewed. Passed to Claude as a variation seed so the same pattern set produces different stories. Client increments and persists this value.

`user_id` extracted from JWT — not in request body.

**Response:**
```json
{
  "title_es": "Un día en el mercado",
  "title_en": "A Day at the Market",
  "body_es": "María va al mercado cada sábado. Ella busca frutas frescas y **verduras** [vegetables]...",
  "body_en": "María goes to the market every Saturday. She looks for fresh fruits and vegetables...",
  "new_vocab": [
    { "word": "verduras", "translation": "vegetables" },
    { "word": "frescas", "translation": "fresh (feminine plural)" }
  ],
  "comprehension_questions": [
    {
      "question_en": "When does María go to the market?",
      "answer_es": "Cada sábado",
      "answer_en": "Every Saturday"
    }
  ]
}
```

**Cache:** Permanent TTL. Key includes `sorted_pattern_ids` — when user unlocks a new pattern, sorted IDs change, producing a cache miss naturally. No explicit invalidation call needed.

### i+1 Implementation
System prompt instructs Claude to:
- Only use sentence patterns from the provided pattern descriptions
- Only use vocabulary from `known_vocab_words` for the narrative core
- Introduce exactly 2–3 new vocabulary words (bolded with inline translation in brackets)
- Keep story length 80–120 words in Spanish
- Set in a culturally relevant Latin American context

### Comprehension Answer Validation
Questions now have real validation. Client normalizes user input (lowercase, trim, remove punctuation) and normalizes `answer_es` the same way, then compares. If match: correct. If not: show `answer_en` as the explanation. No fuzzy matching — this is comprehension, not production.

### Mobile Changes
- `app/session/immersion.tsx`: Call `/ai/generate-story` on mount, show skeleton loader. Fallback: static story from `tier1-stories.ts`.
- `components/session/ImmersionPlayer.tsx`: Support `new_vocab` array — render glossary section at bottom of story
- `store/userStore.ts`: Add `tier1StoryIndex: number` (default 0), `tier2StoryIndex: number` (default 0)

---

## Integration Point 4: Conversation Mode

### Overview
A new optional practice mode. Claude plays a Spanish-speaking NPC in a scripted scenario. User responds via speech or text. 6–8 exchange turns, then session ends with a coaching summary.

### Unlock Condition
Available after user has `status !== null` in `pattern_progress` for at least **3 patterns** — meaning at least one exercise attempt has been made on each. "Introduced" = at least one attempt recorded. Checked against local DB.

### Scenarios (Tier 1 launch set)
- Ordering coffee at a café
- Asking for directions
- Meeting a new neighbor
- Buying something at a market
- Asking about the time

### Server Endpoint: `POST /ai/conversation` (streaming)

Stateless turn-by-turn. Client sends full conversation history each turn.

**Request:**
```json
{
  "scenario": "ordering_coffee",
  "turn_number": 2,
  "conversation_history": [
    { "role": "npc", "text_es": "¡Buenos días! ¿Qué desea?" },
    { "role": "user", "text_es": "Quiero un café, por favor" }
  ],
  "user_known_pattern_ids": [1, 2, 3, 5],
  "evaluate_last_turn": true
}
```

**`evaluate_last_turn`:** `false` on the first request (turn_number = 1) — there is no user turn yet. When `false`, `user_turn_feedback` in the response is `null`.

**Streaming Protocol:** Server-Sent Events (SSE). The connection sends three event types:

```
event: npc_token
data: {"token": "¡Claro"}

event: npc_token
data: {"token": "!"}

...

event: feedback
data: {"user_turn_feedback": {"grammar_ok": true, "naturalness": "natural", "coaching_note": "...", "error_type": null}}

event: done
data: {"conversation_complete": false}
```

Client accumulates `npc_token` events to build the NPC response string. `feedback` event arrives after all tokens. `done` event signals stream end. NPC response renders word-by-word as tokens arrive.

**Error Recovery:** If the SSE connection drops mid-stream:
- Retry once automatically (after 1 second)
- If retry fails: display error toast "Connection lost — your progress is saved up to this turn", end conversation, navigate to summary with turns completed so far
- Completed turns are written to DB immediately after each `done` event — partial conversations are valid

### ExerciseAttempt Schema for Conversations
Conversation turns write to `exercise_attempts` with:
- `pattern_id`: `NULL` (no specific pattern)
- `source`: `'conversation'` (new column: `source TEXT NOT NULL DEFAULT 'construction'`)
- `error_type`: from `user_turn_feedback.error_type` (same `ErrorType` union)
- Other fields: normal values

This means conversation errors appear in the session planner's `recent_error_summary` with the same `error_type` as construction errors. No source distinction is stored in this spec — future analytics can add source filtering if needed.

### Conversation UI (`app/session/conversation.tsx` — new screen)
- Chat bubble layout: NPC left, user right
- NPC response streams token-by-token
- Each user bubble has a collapsible feedback card (collapsed by default, tap to expand)
- English translation toggle per NPC line (collapsed by default)
- Speech input via existing `SpeechInput` component (with text fallback)
- Progress indicator: "Turn 3 of 8"
- Session ends at turn 8 or when Claude sets `conversation_complete: true`

### Session Summary Integration
- Summary screen receives: turns completed, list of `error_type` tags from the session
- If no errors: "Clean session! Great natural conversation."
- If errors: "Watch for [error_type] — you flagged it [N] times today."

### Access Point
- "Conversation" card in Practice tab (below pattern review)
- Card is locked with a lock icon until unlock condition met
- No special onboarding screen — scenarios are self-explanatory

---

## Server Changes

### Endpoints Summary

| Method | Path | New/Updated | Streaming |
|---|---|---|---|
| `POST` | `/ai/evaluate` | Updated (new request/response shape) | No |
| `POST` | `/ai/plan-session` | New | No |
| `POST` | `/ai/generate-story` | New (replaces `/ai/generate-exercise`) | No |
| `POST` | `/ai/conversation` | New | Yes (SSE) |

### Prompt Files
Store all system prompts as versioned text files in `server/src/prompts/`:
- `evaluate.txt`
- `plan-session.txt`
- `generate-story.txt`
- `conversation.txt`

### DB Schema Changes (Mobile SQLite)
```sql
ALTER TABLE exercise_attempts ADD COLUMN error_type TEXT;
ALTER TABLE exercise_attempts ADD COLUMN source TEXT NOT NULL DEFAULT 'construction';
```

---

## Cost Estimate (per active user/day)

| Feature | Calls/day | Avg tokens | Est. cost |
|---|---|---|---|
| Evaluation | ~8 (close/incorrect only) | 300 | ~$0.004 |
| Session planner | 1 | 500 | ~$0.0006 |
| Story generation | 0.3 (cache hit ~70%) | 800 | ~$0.0003 |
| Conversation | 0.5 sessions × 8 turns | 400/turn | ~$0.002 |
| **Total** | | | **~$0.007/user/day** |

---

## Out of Scope

- Pronunciation scoring (requires audio processing pipeline)
- Claude generating new curriculum patterns (stays human-authored)
- Real-time voice-to-voice conversation
- Multi-language support beyond Spanish
- Source-based filtering in session planner (construction vs. conversation errors)
