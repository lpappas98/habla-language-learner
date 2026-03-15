# Spec: Bug Fixes & Architecture Improvements
**Date:** 2026-03-15
**Project:** Habla — Spanish Learning App
**Status:** Approved

---

## Overview

Fix critical bugs identified in the audit and improve core architecture to support a production-quality learning experience. All pattern-based learning flows, SRS, tier progression, and session phases remain intact. This spec addresses correctness, data integrity, and performance.

---

## 1. Critical Bug Fixes

### 1.1 Spaced Repetition — Wire SRS to Review Selection
**File:** `lib/db.ts`, `app/session/review.tsx`

**Problem:** `updateSRS()` writes `next_due_at` and `srs_ease` to the DB, but `getDueExercisesForReview()` ignores ease and shuffles randomly. SRS is implemented but non-functional.

**Fix — Selection Order:**
`getDueExercisesForReview()` orders by `next_due_at ASC` (most overdue first). The ease factor does NOT affect selection order — it only determines the *next* interval after review. Ease factor influences future scheduling only.

**Fix — SM-2 Scheduling Formula:**

On each review attempt, compute:
```
quality = 5 if correct, 2 if close, 0 if incorrect

new_ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
new_ease = max(1.3, new_ease)   // floor at 1.3

if quality >= 3 (correct or close):
  if interval == 0: new_interval = 1
  else if interval == 1: new_interval = 6
  else: new_interval = round(interval * new_ease)
else (incorrect):
  new_interval = 1

next_due_at = now() + new_interval days
```

This is the standard SM-2 algorithm. Store `srs_ease` and `srs_interval` on the `pattern_progress` row.

**Schema:** `srs_ease` already exists in the DB (confirmed in audit). `srs_interval` does not exist — add via migration:
```sql
ALTER TABLE pattern_progress ADD COLUMN srs_interval INTEGER NOT NULL DEFAULT 0;
```

**Migration strategy:** All schema changes in this spec are applied via `ALTER TABLE` statements in `lib/db.ts`'s `initializeDatabase()` function, wrapped in a `try/catch` (column-already-exists errors are swallowed — SQLite does not support `ADD COLUMN IF NOT EXISTS`). This is the existing pattern in the codebase.

### 1.2 Response Time Tracking — Fix startTimeRef Reset
**File:** `app/session/construction.tsx`

**Problem:** `startTimeRef.current = Date.now()` is set after computing `responseTimeMs`, so every response time after the first measures "time since last feedback shown" not "time since exercise started."

**Fix:** Move `startTimeRef.current = Date.now()` into the `useEffect` that fires when `currentIndex` changes (i.e., when the next exercise loads), not after recording the attempt. The ref resets at the moment the new exercise appears on screen.

### 1.3 Streak Calculation — Fix Off-by-One
**File:** `hooks/useStreak.ts`

**Problem:** `daysBetween()` uses `Math.round(Math.abs(...))` which returns 0 for same-day opens. Midnight edge cases can break streaks.

**Fix — Use Device Local Calendar Dates:**

All comparisons use device local time formatted as `YYYY-MM-DD` strings (not UTC). Timezone follows the device — no conversion.

```ts
const toLocalDateString = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

const today = toLocalDateString(new Date());
const last = toLocalDateString(new Date(lastPracticeTimestamp));

if (today === last) {
  // same day — no change to streak
} else if (daysBetweenDateStrings(last, today) === 1) {
  // consecutive day — increment
} else {
  // gap — reset to 1
}
```

`daysBetweenDateStrings` computes the difference by parsing YYYY-MM-DD into `Date` objects at midnight local time, then divides millisecond delta by 86400000 using `Math.floor` (not `Math.round`).

### 1.4 Pattern Prerequisites — Enforce Before Practice
**File:** `app/session/[sessionId].tsx`, `lib/db.ts`

**Problem:** `Pattern.prerequisites` array exists in types but is never checked.

**Fix:**

Session initializer calls `checkPrerequisitesMet(patternId)` before allowing a session to start.

`checkPrerequisitesMet(patternId)` is recursive up to **3 levels deep**:
1. Load pattern's `prerequisites` array
2. For each prerequisite: check that its `PatternProgress.status` is `'mastered'`
3. For each unmet top-level prerequisite: recursively check its own prerequisites (depth 2)
4. For each unmet depth-2 prerequisite: check its prerequisites (depth 3, no further)
5. Return: `{ met: boolean, deepestUnmetPatternId: number | null }`

**Which pattern shows in the modal:** The `deepestUnmetPatternId` — i.e., walk the prerequisite tree depth-first (left-to-right by array index) and return the deepest unmet prerequisite found. This is the foundational gap the user must fill first.

Example: Pattern 5 requires [3]. Pattern 3 requires [1]. Pattern 1 is not mastered → modal shows Pattern 1.

If prerequisites unmet:
- Show modal: "Complete [Pattern Name] first to unlock this pattern"
- Modal has CTA: "Practice [Pattern Name]" — navigates to that pattern's session
- No session starts

### 1.5 Pattern Unlock Navigation — Sync Phase State
**File:** `app/session/pattern-unlock.tsx`

**Problem:** "Start Practicing" navigates to `hear-examples` without calling `setPhase()` in sessionStore.

**Fix:** In the `onPress` handler for "Start Practicing":
```ts
useSessionStore.getState().setPhase('hear_examples');
router.push('/session/hear-examples');
```
Order matters — set phase before navigation.

### 1.6 Mastery Demotion — Allow Regression
**File:** `lib/db.ts`

**Problem:** Once `mastered`, a pattern never regresses.

**Fix:**

In `updatePatternProgress()`, after computing `newStatus`:
- If existing status is `'mastered'`:
  - Query `exercise_attempts` filtered by `user_id` and `pattern_id`, ordered by `created_at DESC`, limited to rows from the last 5 distinct `session_id` values
  - "Accuracy per session" = `COUNT(*) WHERE verdict = 'correct' / COUNT(*)` for all attempts in that session with this `pattern_id`
  - Compute rolling average across those 5 session accuracy values
  - If rolling average < 0.70 → demote to `'practicing'`
- Log demotion event to new `demotion_log` table:
  ```sql
  CREATE TABLE IF NOT EXISTS demotion_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    pattern_id INTEGER NOT NULL,
    demoted_at TEXT NOT NULL,
    rolling_accuracy REAL NOT NULL
  );
  ```
  Migration: add `CREATE TABLE IF NOT EXISTS demotion_log ...` to `initializeDatabase()` (idempotent).

---

## 2. Architecture Improvements

### 2.1 React Query — Cache All Data Fetching
**Files:** `app/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/patterns.tsx`, `app/(tabs)/profile.tsx`, `hooks/usePatternProgress.ts`

**Problem:** `getAllPatternProgress()` and `getPatterns()` called on every render across 5+ screens with no caching. `@tanstack/react-query` is already imported but unused.

**Fix:**

Define shared query keys:
```ts
export const QUERY_KEYS = {
  patterns: ['patterns'] as const,
  progress: ['progress'] as const,
  streak: ['streak'] as const,
};
```

Create two custom hooks:
- `usePatterns()` → wraps `useQuery({ queryKey: QUERY_KEYS.patterns, queryFn: getPatterns, staleTime: 1000 * 60 * 5 })` (5 min — patterns rarely change)
- `useAllProgress()` → wraps `useQuery({ queryKey: QUERY_KEYS.progress, queryFn: getAllPatternProgress, staleTime: 0 })` (always fresh)

After any session completion or exercise attempt, call:
```ts
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.progress });
```

Replace all direct DB calls in `(tabs)/index.tsx`, `(tabs)/patterns.tsx`, `(tabs)/profile.tsx`, and `hooks/usePatternProgress.ts` with these hooks.

### 2.2 Session Persistence — Incremental Save
**Files:** `store/sessionStore.ts`, `lib/db.ts`, `app/session/[sessionId].tsx`, `app/_layout.tsx`

**Problem:** Session only saved on summary screen. Force-quit loses all in-session progress.

**Fix — Incremental Write:**
After each exercise attempt is recorded in sessionStore, also immediately write the attempt to the `exercise_attempts` table (this table already exists in schema). This is a fire-and-forget write — don't await it in the UI path. If the write fails (SQLite error), the error is logged to console but silently swallowed — lost attempts are acceptable in this version. A retry queue is out of scope.

**Fix — Session Completion Finalization:**
`saveSession()` becomes a finalization call: marks `sessions.is_complete = true` (new boolean column, default `false`) and computes summary stats. It no longer does the only write — it finalizes what was already written incrementally.

**Fix — Incomplete Session Detection:**
On app startup in `_layout.tsx`, query for any `sessions` row where `user_id = currentUserId AND is_complete = false`. If found:
- Show modal: "You have an unfinished session. Start fresh?"
- "Start Fresh" → mark old session `is_complete = true` with `abandoned = true` flag, proceed normally
- **Resume is out of scope** — only detection and discard is implemented in this spec

**Schema change:** Add to `sessions` table:
- `is_complete BOOLEAN NOT NULL DEFAULT 0`
- `abandoned BOOLEAN NOT NULL DEFAULT 0`

### 2.3 Multi-User SQLite — Replace Hardcoded User ID
**File:** `lib/db.ts`

**Problem:** All SQLite queries use hardcoded `'local'` as user ID.

**Fix:**
- All DB functions accept `userId` as an explicit parameter (not pulled from the store internally). This avoids coupling `lib/db.ts` to Zustand. Call sites pass `useUserStore.getState().userId`.
- Replace all `'local'` hardcoded strings with the `userId` parameter
- `userId` in userStore is set on login (Supabase `user.id`) and cleared on logout
- On logout: `DELETE FROM [all tables] WHERE user_id = :userId` — scoped delete, not full DB wipe
- On login: before `seedCurriculum()`, check `SELECT COUNT(*) FROM patterns WHERE user_id = :userId`. If count > 0, skip seed (idempotent guard). If 0, run seed.

### 2.4 Constants — Single Source of Truth
**Problem:** Tier counts, mastery thresholds scattered across 10+ files.

**Files to create:** `lib/constants.ts`

```ts
export const TIER1_PATTERN_COUNT = 15;
export const TIER2_PATTERN_COUNT = 25;
export const MASTERY_ACCURACY_THRESHOLD = 0.85;
export const MASTERY_MIN_ATTEMPTS = 10;
export const MASTERY_MIN_DAYS = 3;
export const DEMOTION_ACCURACY_THRESHOLD = 0.70;
export const DEMOTION_ROLLING_SESSIONS = 5;
export const SRS_EASE_FLOOR = 1.3;
export const SRS_EASE_DEFAULT = 2.5;
```

**Files to update** (replace hardcoded values with imports):
- `app/(tabs)/index.tsx`
- `app/(tabs)/patterns.tsx`
- `app/(tabs)/profile.tsx`
- `lib/db.ts`
- `hooks/usePatternProgress.ts`
- `data/curriculum/tier1.ts`, `tier2.ts`

### 2.5 Theme Constants — Centralize Colors
**Scope:** Only hardcoded hex values in `StyleSheet.create()` objects and inline `style=` props. NativeWind/Tailwind class strings are out of scope for this spec.

**Files to create:** `lib/theme.ts`

```ts
export const theme = {
  colors: {
    gold: '#D4A017',
    goldLight: '#F0C040',
    brown: '#1A1008',
    brownMid: '#2C1A0E',
    cream: '#F5E6C8',
    green: '#4CAF50',
    red: '#F44336',
    white: '#FFFFFF',
    gray: '#9E9E9E',
  },
  // extend as needed
};
```

**Files to update** (replace `#D4A017` and other scattered hex values):
- `components/session/FeedbackOverlay.tsx`
- `components/session/ConstructionPrompt.tsx`
- `components/session/PatternCard.tsx`
- `components/curriculum/PatternNode.tsx`
- `components/curriculum/PatternTree.tsx`
- `app/session/construction.tsx`
- `app/session/summary.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/patterns.tsx`
- `app/(tabs)/profile.tsx`

### 2.6 Adaptive Difficulty — Wire to Exercise Selection
**Files:** `lib/adaptiveDifficulty.ts`, `store/sessionStore.ts`, `app/session/construction.tsx`, `components/session/ConstructionPrompt.tsx`

**Problem:** `adjustDifficulty()` computes a scalar but `selectNextExercise()` never reads it.

**Current defaults (from codebase):**
- Hint delay: 10,000ms
- FuzzyMatch threshold: 0.85 (Levenshtein similarity)
- Sentence frame shown: only on level 2+ hint

**Difficulty levels and their effect:**

| Scalar Range | Label | Hint Delay | FuzzyMatch Threshold | Sentence Frame |
|---|---|---|---|---|
| 0.0 – 0.3 | Easy | 5,000ms | 0.75 | Shown proactively |
| 0.3 – 0.6 | Normal | 10,000ms | 0.85 | Level 2 hint |
| 0.6 – 0.8 | Hard | 15,000ms | 0.90 | Level 3 hint only |
| 0.8 – 1.0 | Expert | 20,000ms | 0.95 | Never shown |

**Fix:** `selectNextExercise()` reads `sessionStore.difficultyLevel` and passes a `DifficultyConfig` object to `construction.tsx` and `ConstructionPrompt.tsx`. These components use the config values instead of hardcoded defaults.

```ts
// types/index.ts
export interface DifficultyConfig {
  hintDelayMs: number;       // How long before hint button appears
  fuzzyMatchThreshold: number; // 0–1, minimum similarity to count as 'close'
  sentenceFrameMode: 'proactive' | 'level2' | 'level3' | 'never';
}
```

---

## 3. Type Safety

### 3.1 Discriminated Union for Exercise
**File:** `types/index.ts`

The `type` field already exists in the DB (`exercise_attempts.type`). No DB migration needed — only TypeScript types change. After the union is defined, `Exercise['type']` resolves to `'recognize' | 'construct'` — the type guard in 3.2 remains valid.

Replace the `Exercise` interface with a discriminated union:
```ts
interface BaseExercise {
  id: number;
  patternId: number;
  promptEn: string;
  targetEs: string;
  acceptableAlternatives: string[];
}

interface RecognizeExercise extends BaseExercise {
  type: 'recognize';
  options: string[];
  correctIndex: number;
}

interface ConstructExercise extends BaseExercise {
  type: 'construct';
  sentenceFrame?: string;
  hintWords?: string[];
}

export type Exercise = RecognizeExercise | ConstructExercise;
```

Update all consumers to narrow on `exercise.type` before accessing type-specific fields.

### 3.2 Remove Unsafe Casts

- `patterns.tsx` `as unknown as Pattern[]`: Fix the underlying tier2 data export to return `Pattern[]` directly
- `db.ts` `r.type as Exercise['type']`: Add a type guard:
  ```ts
  const isExerciseType = (t: string): t is Exercise['type'] =>
    t === 'recognize' || t === 'construct';
  ```
- `profile.tsx` `require('../../lib/mmkv')`: Replace with static `import { getSettings } from '../../lib/mmkv'`

### 3.3 Named Types for Magic Values

```ts
// types/index.ts
export type HintLevel = 0 | 1 | 2 | 3;
export type ErrorType =
  | 'ser_vs_estar' | 'gender_agreement' | 'word_order'
  | 'accent_mark' | 'vocabulary' | 'verb_conjugation'
  | 'article' | 'other';
export type MatchResult = 'correct' | 'close' | 'incorrect';
```

---

## 4. Deduplication

**New file:** `lib/utils.ts`

- Extract `toLocalDateString(date: Date): string` to `lib/utils.ts`. Remove duplicates in `useStreak.ts` and `lib/db.ts`.
- Extract feedback messages ("Correct!", "Almost there", etc.) to `lib/constants.ts` under a `FEEDBACK_MESSAGES` object. Files currently containing them: `app/session/construction.tsx`, `app/session/review.tsx`.
- Extract hint rendering logic from both `components/session/ConstructionPrompt.tsx` and `app/session/construction.tsx` into a single `HintDisplay` component in `components/session/`.

---

## Out of Scope

- Backend sync between SQLite and Supabase
- Offline mode / conflict resolution
- Session resume after force-quit
- Accessibility improvements
- Analytics dashboard
