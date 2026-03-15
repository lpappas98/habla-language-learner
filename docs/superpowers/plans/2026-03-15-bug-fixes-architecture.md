# Bug Fixes & Architecture Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical bugs (SRS, streak, response timing, prerequisites, mastery demotion) and improve architecture (React Query caching, session persistence, multi-user DB, constants/theme consolidation, adaptive difficulty).

**Architecture:** Pure logic lives in `lib/` and is fully testable. Screens and stores consume these functions. React Query wraps all DB reads at the hook layer. All DB functions receive `userId` as an explicit parameter.

**Tech Stack:** Expo 55, React Native 0.83, expo-sqlite, Zustand 5, @tanstack/react-query 5, TypeScript 5.9, Jest + @testing-library/react-native

**Spec:** `docs/superpowers/specs/2026-03-15-bug-fixes-architecture-design.md`

---

## Chunk 1: Test Setup + Foundation Files

### Task 1: Install Jest + React Native Testing Library

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`
- Create: `jest.setup.ts`

- [ ] **Step 1: Install test dependencies**

```bash
npm install --save-dev jest @types/jest jest-expo @testing-library/react-native @testing-library/jest-native
```

- [ ] **Step 2: Add jest config**

Create `jest.config.js`:
```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: ['./jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

- [ ] **Step 3: Add jest setup file**

Create `jest.setup.ts`:
```ts
import '@testing-library/jest-native/extend-expect';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock expo-speech-recognition
jest.mock('expo-speech-recognition', () => ({}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);
```

- [ ] **Step 4: Add test script to package.json**

Add to `scripts`:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 5: Run to confirm setup works**

```bash
npm test -- --passWithNoTests
```
Expected: `Test Suites: 0 passed, 0 total`

- [ ] **Step 6: Commit**

```bash
git add jest.config.js jest.setup.ts package.json package-lock.json
git commit -m "chore: add Jest + React Native Testing Library"
```

---

### Task 2: Create lib/constants.ts

**Files:**
- Create: `lib/constants.ts`
- Create: `__tests__/lib/constants.test.ts`

- [ ] **Step 1: Write the test**

Create `__tests__/lib/constants.test.ts`:
```ts
import {
  TIER1_PATTERN_COUNT,
  TIER2_PATTERN_COUNT,
  MASTERY_ACCURACY_THRESHOLD,
  MASTERY_MIN_ATTEMPTS,
  MASTERY_MIN_DAYS,
  DEMOTION_ACCURACY_THRESHOLD,
  DEMOTION_ROLLING_SESSIONS,
  SRS_EASE_FLOOR,
  SRS_EASE_DEFAULT,
  DIFFICULTY_CONFIGS,
} from '../../lib/constants';

describe('constants', () => {
  it('exports tier counts', () => {
    expect(TIER1_PATTERN_COUNT).toBe(15);
    expect(TIER2_PATTERN_COUNT).toBe(25);
  });

  it('exports mastery thresholds', () => {
    expect(MASTERY_ACCURACY_THRESHOLD).toBe(0.85);
    expect(MASTERY_MIN_ATTEMPTS).toBe(10);
    expect(MASTERY_MIN_DAYS).toBe(3);
  });

  it('exports demotion thresholds', () => {
    expect(DEMOTION_ACCURACY_THRESHOLD).toBe(0.70);
    expect(DEMOTION_ROLLING_SESSIONS).toBe(5);
  });

  it('exports difficulty configs for all 4 levels', () => {
    expect(DIFFICULTY_CONFIGS.easy.hintDelayMs).toBe(5000);
    expect(DIFFICULTY_CONFIGS.normal.hintDelayMs).toBe(10000);
    expect(DIFFICULTY_CONFIGS.hard.hintDelayMs).toBe(15000);
    expect(DIFFICULTY_CONFIGS.expert.hintDelayMs).toBe(20000);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm test -- constants
```
Expected: FAIL — module not found

- [ ] **Step 3: Create lib/constants.ts**

```ts
import { DifficultyConfig } from '../types';

export const TIER1_PATTERN_COUNT = 15;
export const TIER2_PATTERN_COUNT = 25;

export const MASTERY_ACCURACY_THRESHOLD = 0.85;
export const MASTERY_MIN_ATTEMPTS = 10;
export const MASTERY_MIN_DAYS = 3;

export const DEMOTION_ACCURACY_THRESHOLD = 0.70;
export const DEMOTION_ROLLING_SESSIONS = 5;

export const SRS_EASE_FLOOR = 1.3;
export const SRS_EASE_DEFAULT = 2.5;

export const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
  easy:   { hintDelayMs: 5000,  fuzzyMatchThreshold: 0.75, sentenceFrameMode: 'proactive' },
  normal: { hintDelayMs: 10000, fuzzyMatchThreshold: 0.85, sentenceFrameMode: 'level2' },
  hard:   { hintDelayMs: 15000, fuzzyMatchThreshold: 0.90, sentenceFrameMode: 'level3' },
  expert: { hintDelayMs: 20000, fuzzyMatchThreshold: 0.95, sentenceFrameMode: 'never' },
};

export const FEEDBACK_MESSAGES = {
  correct: ['¡Perfecto!', '¡Excelente!', '¡Muy bien!', 'Correct!'],
  close: ['Almost there!', 'Very close!', 'Nearly perfect!'],
  incorrect: ["Not quite — let's look at this.", 'Try again!', 'Keep going!'],
};
```

- [ ] **Step 4: Run to confirm passing**

```bash
npm test -- constants
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/constants.ts __tests__/lib/constants.test.ts
git commit -m "feat: add lib/constants.ts — single source of truth for all thresholds"
```

---

### Task 3: Create lib/utils.ts

**Files:**
- Create: `lib/utils.ts`
- Create: `__tests__/lib/utils.test.ts`

- [ ] **Step 1: Write the test**

Create `__tests__/lib/utils.test.ts`:
```ts
import { toLocalDateString, daysBetweenDateStrings, normalizeSpanish } from '../../lib/utils';

describe('toLocalDateString', () => {
  it('formats date as YYYY-MM-DD in local time', () => {
    const date = new Date(2026, 2, 15); // March 15, 2026 local
    expect(toLocalDateString(date)).toBe('2026-03-15');
  });

  it('pads month and day with zeros', () => {
    const date = new Date(2026, 0, 5); // Jan 5
    expect(toLocalDateString(date)).toBe('2026-01-05');
  });
});

describe('daysBetweenDateStrings', () => {
  it('returns 0 for same date', () => {
    expect(daysBetweenDateStrings('2026-03-15', '2026-03-15')).toBe(0);
  });

  it('returns 1 for consecutive days', () => {
    expect(daysBetweenDateStrings('2026-03-14', '2026-03-15')).toBe(1);
  });

  it('returns 7 for one week apart', () => {
    expect(daysBetweenDateStrings('2026-03-08', '2026-03-15')).toBe(7);
  });

  it('handles month boundaries', () => {
    expect(daysBetweenDateStrings('2026-01-31', '2026-02-01')).toBe(1);
  });
});

describe('normalizeSpanish', () => {
  it('lowercases and trims', () => {
    expect(normalizeSpanish('  Hola  ')).toBe('hola');
  });

  it('removes punctuation', () => {
    expect(normalizeSpanish('¿Cómo estás?')).toBe('cómo estás');
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm test -- utils
```
Expected: FAIL

- [ ] **Step 3: Create lib/utils.ts**

```ts
export const toLocalDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const daysBetweenDateStrings = (a: string, b: string): number => {
  const msA = new Date(a + 'T00:00:00').getTime();
  const msB = new Date(b + 'T00:00:00').getTime();
  return Math.floor(Math.abs(msB - msA) / 86400000);
};

export const normalizeSpanish = (s: string): string =>
  s.trim().toLowerCase().replace(/[¿?¡!.,;:]/g, '').replace(/\s+/g, ' ').trim();
```

- [ ] **Step 4: Run to confirm passing**

```bash
npm test -- utils
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/utils.ts __tests__/lib/utils.test.ts
git commit -m "feat: add lib/utils.ts with toLocalDateString, daysBetweenDateStrings, normalizeSpanish"
```

---

### Task 4: Update types/index.ts

**Files:**
- Modify: `types/index.ts`
- Create: `__tests__/types/index.test.ts`

- [ ] **Step 1: Read the existing types file**

Read `types/index.ts` in full to understand the current shape before modifying.

- [ ] **Step 2: Write the test**

Create `__tests__/types/index.test.ts`:
```ts
import { isExerciseType, toDifficultyLabel } from '../../types';

describe('isExerciseType', () => {
  it('accepts valid types', () => {
    expect(isExerciseType('recognize')).toBe(true);
    expect(isExerciseType('construct')).toBe(true);
  });

  it('rejects invalid types', () => {
    expect(isExerciseType('unknown')).toBe(false);
    expect(isExerciseType('')).toBe(false);
  });
});

describe('toDifficultyLabel', () => {
  it('maps scalar ranges to labels', () => {
    expect(toDifficultyLabel(0.1)).toBe('easy');
    expect(toDifficultyLabel(0.4)).toBe('normal');
    expect(toDifficultyLabel(0.7)).toBe('hard');
    expect(toDifficultyLabel(0.9)).toBe('expert');
  });
});
```

- [ ] **Step 3: Run to confirm it fails**

```bash
npm test -- types/index
```
Expected: FAIL

- [ ] **Step 4: Add new types to types/index.ts**

Add the following to `types/index.ts` (do not remove existing types — add alongside):

```ts
// --- Discriminated Exercise Union ---
export interface BaseExercise {
  id: number;
  patternId: number;
  promptEn: string;
  targetEs: string;
  acceptableAlternatives: string[];
}

export interface RecognizeExercise extends BaseExercise {
  type: 'recognize';
  options: string[];
  correctIndex: number;
}

export interface ConstructExercise extends BaseExercise {
  type: 'construct';
  sentenceFrame?: string;
  hintWords?: string[];
}

export type Exercise = RecognizeExercise | ConstructExercise;

// --- Type Guards ---
export const isExerciseType = (t: string): t is Exercise['type'] =>
  t === 'recognize' || t === 'construct';

// --- Named Types ---
export type HintLevel = 0 | 1 | 2 | 3;

export type ErrorType =
  | 'ser_vs_estar' | 'gender_agreement' | 'word_order'
  | 'accent_mark' | 'vocabulary' | 'verb_conjugation'
  | 'article' | 'other';

export type MatchResult = 'correct' | 'close' | 'incorrect';

export interface DifficultyConfig {
  hintDelayMs: number;
  fuzzyMatchThreshold: number;
  sentenceFrameMode: 'proactive' | 'level2' | 'level3' | 'never';
}

export type DifficultyLabel = 'easy' | 'normal' | 'hard' | 'expert';

export const toDifficultyLabel = (scalar: number): DifficultyLabel => {
  if (scalar < 0.3) return 'easy';
  if (scalar < 0.6) return 'normal';
  if (scalar < 0.8) return 'hard';
  return 'expert';
};
```

- [ ] **Step 5: Run to confirm passing**

```bash
npm test -- types/index
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add types/index.ts __tests__/types/index.test.ts
git commit -m "feat: add discriminated Exercise union, ErrorType, DifficultyConfig, and type guards"
```

---

### Task 5: Create lib/theme.ts

**Files:**
- Create: `lib/theme.ts`

- [ ] **Step 1: Create lib/theme.ts**

```ts
export const theme = {
  colors: {
    gold: '#D4A017',
    goldLight: '#F0C040',
    goldDim: '#B8860B',
    brown: '#1A1008',
    brownMid: '#2C1A0E',
    brownLight: '#3D2A1A',
    cream: '#F5E6C8',
    creamDim: '#D4C4A0',
    green: '#4CAF50',
    greenLight: '#81C784',
    red: '#F44336',
    redLight: '#E57373',
    white: '#FFFFFF',
    gray: '#9E9E9E',
    grayLight: '#BDBDBD',
    transparent: 'transparent',
  },
} as const;

export type ThemeColors = typeof theme.colors;
```

- [ ] **Step 2: Replace hardcoded hex values in the 10 consumer files**

Search for hardcoded colors:
```bash
grep -rn "#D4A017\|#1A1008\|#2C1A0E\|#F5E6C8\|#4CAF50\|#F44336\|#B8860B\|#3D2A1A\|#D4C4A0" \
  --include="*.tsx" --include="*.ts" \
  components/session/ components/curriculum/ app/session/ app/\(tabs\)/
```

In each file returned, add `import { theme } from '../../lib/theme';` (adjust relative path) and replace each hex with the corresponding `theme.colors.*` constant.

Files to update per spec §2.5:
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

- [ ] **Step 3: Commit**

```bash
git add lib/theme.ts components/session/ components/curriculum/ app/session/construction.tsx app/session/summary.tsx app/\(tabs\)/index.tsx app/\(tabs\)/patterns.tsx app/\(tabs\)/profile.tsx
git commit -m "feat: add lib/theme.ts and replace all hardcoded hex colors with theme constants"
```

---

## Chunk 2: Database Fixes

### Task 6: SM-2 SRS Algorithm

**Files:**
- Create: `lib/srs.ts`
- Create: `__tests__/lib/srs.test.ts`
- Modify: `lib/db.ts`

- [ ] **Step 1: Write the test**

Create `__tests__/lib/srs.test.ts`:
```ts
import { computeSM2, SRS_QUALITY } from '../../lib/srs';

describe('computeSM2', () => {
  const defaultState = { ease: 2.5, interval: 0 };

  describe('correct answer (quality 5)', () => {
    it('sets interval to 1 on first review', () => {
      const result = computeSM2(defaultState, SRS_QUALITY.CORRECT);
      expect(result.interval).toBe(1);
    });

    it('sets interval to 6 on second review', () => {
      const result = computeSM2({ ease: 2.5, interval: 1 }, SRS_QUALITY.CORRECT);
      expect(result.interval).toBe(6);
    });

    it('multiplies by ease factor on subsequent reviews', () => {
      const result = computeSM2({ ease: 2.5, interval: 6 }, SRS_QUALITY.CORRECT);
      expect(result.interval).toBe(15); // round(6 * 2.5)
    });

    it('increases ease factor slightly', () => {
      const result = computeSM2(defaultState, SRS_QUALITY.CORRECT);
      expect(result.ease).toBeGreaterThan(2.5);
    });
  });

  describe('close answer (quality 2)', () => {
    it('still advances interval if >= 3? No — quality 2 < 3, resets', () => {
      // quality 2 = close, which is < 3, so interval resets to 1
      const result = computeSM2({ ease: 2.5, interval: 6 }, SRS_QUALITY.CLOSE);
      expect(result.interval).toBe(1);
    });

    it('decreases ease factor', () => {
      const result = computeSM2(defaultState, SRS_QUALITY.CLOSE);
      expect(result.ease).toBeLessThan(2.5);
    });
  });

  describe('incorrect answer (quality 0)', () => {
    it('resets interval to 1', () => {
      const result = computeSM2({ ease: 2.5, interval: 30 }, SRS_QUALITY.INCORRECT);
      expect(result.interval).toBe(1);
    });

    it('decreases ease factor significantly', () => {
      const result = computeSM2(defaultState, SRS_QUALITY.INCORRECT);
      expect(result.ease).toBeLessThan(2.5);
    });

    it('does not drop ease below 1.3', () => {
      const result = computeSM2({ ease: 1.3, interval: 1 }, SRS_QUALITY.INCORRECT);
      expect(result.ease).toBe(1.3);
    });
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm test -- srs
```
Expected: FAIL

- [ ] **Step 3: Create lib/srs.ts**

```ts
import { SRS_EASE_FLOOR } from './constants';

export const SRS_QUALITY = {
  CORRECT: 5,
  CLOSE: 2,
  INCORRECT: 0,
} as const;

export type SRSQuality = (typeof SRS_QUALITY)[keyof typeof SRS_QUALITY];

export interface SRSState {
  ease: number;
  interval: number;
}

export interface SRSResult {
  ease: number;
  interval: number;
  nextDueDays: number;
}

export const computeSM2 = (state: SRSState, quality: SRSQuality): SRSResult => {
  const { ease, interval } = state;

  const newEase = Math.max(
    SRS_EASE_FLOOR,
    ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  let newInterval: number;
  if (quality >= 3) {
    if (interval === 0) newInterval = 1;
    else if (interval === 1) newInterval = 6;
    else newInterval = Math.round(interval * newEase);
  } else {
    newInterval = 1;
  }

  return { ease: newEase, interval: newInterval, nextDueDays: newInterval };
};
```

- [ ] **Step 4: Run to confirm passing**

```bash
npm test -- srs
```
Expected: PASS

- [ ] **Step 5: Update lib/db.ts — updateSRS function**

Read `lib/db.ts` first. Find the `updateSRS()` function and replace its body to use `computeSM2`:

```ts
// At top of lib/db.ts, add import:
import { computeSM2, SRS_QUALITY, SRSQuality } from './srs';

// Replace updateSRS function body:
export const updateSRS = async (
  db: SQLiteDatabase,
  userId: string,
  patternId: number,
  verdict: MatchResult
): Promise<void> => {
  const row = await db.getFirstAsync<{ srs_ease: number; srs_interval: number }>(
    'SELECT srs_ease, srs_interval FROM pattern_progress WHERE user_id = ? AND pattern_id = ?',
    [userId, patternId]
  );

  const ease = row?.srs_ease ?? 2.5;
  const interval = row?.srs_interval ?? 0;

  const quality: SRSQuality =
    verdict === 'correct' ? SRS_QUALITY.CORRECT :
    verdict === 'close'   ? SRS_QUALITY.CLOSE :
                            SRS_QUALITY.INCORRECT;

  const { ease: newEase, interval: newInterval, nextDueDays } = computeSM2(
    { ease, interval },
    quality
  );

  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + nextDueDays);

  await db.runAsync(
    `UPDATE pattern_progress
     SET srs_ease = ?, srs_interval = ?, next_due_at = ?
     WHERE user_id = ? AND pattern_id = ?`,
    [newEase, newInterval, nextDue.toISOString(), userId, patternId]
  );
};
```

- [ ] **Step 6: Update getDueExercisesForReview to order by next_due_at**

Find `getDueExercisesForReview()` in `lib/db.ts`. Change its ORDER BY clause from random to `next_due_at ASC`:

```ts
// Replace the SELECT query in getDueExercisesForReview:
const rows = await db.getAllAsync<ExerciseRow>(
  `SELECT e.*, pp.next_due_at FROM exercises e
   JOIN pattern_progress pp ON pp.pattern_id = e.pattern_id AND pp.user_id = ?
   WHERE pp.next_due_at <= datetime('now')
   ORDER BY pp.next_due_at ASC
   LIMIT 20`,
  [userId]
);
```

- [ ] **Step 7: Remove random shuffle in review.tsx**

Read `app/session/review.tsx`. Find the shuffle call (`.sort(() => Math.random() - 0.5)` or similar). Remove it — exercises are already ordered by the DB query.

- [ ] **Step 8: Run tests**

```bash
npm test -- srs
```
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add lib/srs.ts __tests__/lib/srs.test.ts lib/db.ts app/session/review.tsx
git commit -m "feat: implement SM-2 spaced repetition — SRS now actually determines review order"
```

---

### Task 7: Mastery Demotion

**Files:**
- Create: `__tests__/lib/mastery.test.ts`
- Modify: `lib/db.ts`

- [ ] **Step 1: Write the test**

Create `__tests__/lib/mastery.test.ts`:
```ts
import { computeRollingAccuracy, shouldDemote } from '../../lib/mastery';

describe('computeRollingAccuracy', () => {
  it('returns 1.0 for all correct', () => {
    const sessions = [
      { correct: 5, total: 5 },
      { correct: 3, total: 3 },
    ];
    expect(computeRollingAccuracy(sessions)).toBe(1.0);
  });

  it('computes average of per-session accuracies', () => {
    const sessions = [
      { correct: 4, total: 5 },  // 0.8
      { correct: 3, total: 5 },  // 0.6
    ];
    expect(computeRollingAccuracy(sessions)).toBeCloseTo(0.7);
  });

  it('returns 1.0 with no sessions', () => {
    expect(computeRollingAccuracy([])).toBe(1.0);
  });
});

describe('shouldDemote', () => {
  it('demotes when rolling accuracy below threshold', () => {
    const sessions = Array(5).fill({ correct: 3, total: 5 }); // 0.6 avg
    expect(shouldDemote(sessions)).toBe(true);
  });

  it('does not demote when accuracy above threshold', () => {
    const sessions = Array(5).fill({ correct: 4, total: 5 }); // 0.8 avg
    expect(shouldDemote(sessions)).toBe(false);
  });

  it('does not demote with fewer than 3 sessions', () => {
    const sessions = [{ correct: 0, total: 5 }]; // would demote but not enough data
    expect(shouldDemote(sessions)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm test -- mastery
```
Expected: FAIL

- [ ] **Step 3: Create lib/mastery.ts**

```ts
import { DEMOTION_ACCURACY_THRESHOLD } from './constants';

export interface SessionAccuracy {
  correct: number;
  total: number;
}

export const computeRollingAccuracy = (sessions: SessionAccuracy[]): number => {
  if (sessions.length === 0) return 1.0;
  const avg = sessions.reduce((sum, s) => sum + (s.total > 0 ? s.correct / s.total : 1), 0) / sessions.length;
  return avg;
};

// 3-session minimum prevents demotion on insufficient data — reasonable implementation choice
// not explicitly in spec but protects users from early demotion on too few data points
export const shouldDemote = (sessions: SessionAccuracy[]): boolean => {
  if (sessions.length < 3) return false;
  return computeRollingAccuracy(sessions) < DEMOTION_ACCURACY_THRESHOLD;
};
```

- [ ] **Step 4: Run to confirm passing**

```bash
npm test -- mastery
```
Expected: PASS

- [ ] **Step 5: Wire demotion into lib/db.ts — updatePatternProgress**

Read `lib/db.ts`. Find `updatePatternProgress()`. After computing `newStatus`, add demotion check:

```ts
// Add import at top:
import { shouldDemote, SessionAccuracy } from './mastery';

// Inside updatePatternProgress, after computing newStatus:
let finalStatus = newStatus;
if (existing.status === 'mastered') {
  // Fetch last 5 session accuracies for this pattern
  const sessionRows = await db.getAllAsync<{ session_id: string; correct: number; total: number }>(
    `SELECT
       session_id,
       SUM(CASE WHEN verdict = 'correct' THEN 1 ELSE 0 END) as correct,
       COUNT(*) as total
     FROM exercise_attempts
     WHERE user_id = ? AND pattern_id = ?
     GROUP BY session_id
     ORDER BY MAX(created_at) DESC
     LIMIT ?`,
    [userId, patternId, DEMOTION_ROLLING_SESSIONS]
  );

  const accuracies: SessionAccuracy[] = sessionRows.map(r => ({
    correct: r.correct,
    total: r.total,
  }));

  if (shouldDemote(accuracies)) {
    finalStatus = 'practicing';
    const rollingAccuracy = computeRollingAccuracy(accuracies); // reuse lib/mastery.ts function
    await db.runAsync(
      `INSERT INTO demotion_log (user_id, pattern_id, demoted_at, rolling_accuracy)
       VALUES (?, ?, datetime('now'), ?)`,
      [userId, patternId, rollingAccuracy]
    );
  }
}
```

- [ ] **Step 6: Add migrations to initializeDatabase()**

Read `lib/db.ts`. In `initializeDatabase()`, add after existing migrations:

```ts
// Add srs_interval column
try {
  await db.runAsync('ALTER TABLE pattern_progress ADD COLUMN srs_interval INTEGER NOT NULL DEFAULT 0');
} catch {}

// Add error_type and source columns to exercise_attempts
try {
  await db.runAsync('ALTER TABLE exercise_attempts ADD COLUMN error_type TEXT');
} catch {}
try {
  await db.runAsync(`ALTER TABLE exercise_attempts ADD COLUMN source TEXT NOT NULL DEFAULT 'construction'`);
} catch {}

// Add is_complete and abandoned to sessions
try {
  await db.runAsync('ALTER TABLE sessions ADD COLUMN is_complete INTEGER NOT NULL DEFAULT 0');
} catch {}
try {
  await db.runAsync('ALTER TABLE sessions ADD COLUMN abandoned INTEGER NOT NULL DEFAULT 0');
} catch {}

// Create demotion_log table
await db.runAsync(`
  CREATE TABLE IF NOT EXISTS demotion_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    pattern_id INTEGER NOT NULL,
    demoted_at TEXT NOT NULL,
    rolling_accuracy REAL NOT NULL
  )
`);
```

- [ ] **Step 7: Run tests**

```bash
npm test -- mastery srs
```
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add lib/mastery.ts __tests__/lib/mastery.test.ts lib/db.ts
git commit -m "feat: implement mastery demotion and DB schema migrations"
```

---

### Task 8: Multi-User DB — Replace Hardcoded 'local'

**Files:**
- Modify: `lib/db.ts`

- [ ] **Step 1: Read lib/db.ts to find all 'local' occurrences**

```bash
grep -n "'local'" lib/db.ts
```

- [ ] **Step 2: Add userId parameter to all DB functions**

For every exported function in `lib/db.ts` that uses `'local'` as user ID:
- Add `userId: string` as the first parameter
- Replace `'local'` with `userId`

Functions to update (will vary based on current code):
- `getPatterns(userId)`
- `getAllPatternProgress(userId)`
- `updatePatternProgress(userId, ...)`
- `getDueExercisesForReview(userId)`
- `getExercisesForPattern(userId, patternId)`
- `recordExerciseAttempt(userId, ...)`
- `saveSession(userId, ...)`
- `seedCurriculum(userId)`

- [ ] **Step 3: Add logout cleanup function**

Add to `lib/db.ts`:
```ts
export const clearUserData = async (db: SQLiteDatabase, userId: string): Promise<void> => {
  await db.runAsync('DELETE FROM exercise_attempts WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM sessions WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM pattern_progress WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM vocabulary WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM demotion_log WHERE user_id = ?', [userId]);
};
```

- [ ] **Step 4: Add idempotent seed guard**

Find `seedCurriculum()` in `lib/db.ts`. Add guard at top:
```ts
const existing = await db.getFirstAsync<{ count: number }>(
  'SELECT COUNT(*) as count FROM patterns WHERE user_id = ?', [userId]
);
if (existing && existing.count > 0) return; // already seeded
```

- [ ] **Step 5: Update all call sites to pass userId**

Search for all callers of DB functions in:
- `app/_layout.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/patterns.tsx`
- `app/(tabs)/profile.tsx`
- `app/session/[sessionId].tsx`
- `app/session/review.tsx`
- `hooks/usePatternProgress.ts`

At each call site, get `userId` from `useUserStore.getState().userId` and pass it through.

- [ ] **Step 6: Wire logout in userStore**

Read `store/userStore.ts`. Add import for `clearUserData`. In the logout action:
```ts
logout: async () => {
  const userId = get().userId;
  if (userId && db) {
    await clearUserData(db, userId);
  }
  set({ userId: null, ... }); // clear rest of user state
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/db.ts store/userStore.ts app/_layout.tsx app/(tabs)/index.tsx app/(tabs)/patterns.tsx app/(tabs)/profile.tsx app/session/[sessionId].tsx app/session/review.tsx hooks/usePatternProgress.ts
git commit -m "fix: pass userId explicitly to all DB functions — remove hardcoded 'local' user"
```

---

## Chunk 3: Core Bug Fixes

### Task 9: Fix Streak Calculation

**Files:**
- Modify: `hooks/useStreak.ts`
- Create: `__tests__/hooks/useStreak.test.ts`

- [ ] **Step 1: Read hooks/useStreak.ts in full**

- [ ] **Step 2: Write the test**

Create `__tests__/hooks/useStreak.test.ts`:
```ts
import { computeStreakUpdate } from '../../hooks/useStreak';

describe('computeStreakUpdate', () => {
  const today = '2026-03-15';

  it('does not change streak for same-day open', () => {
    const result = computeStreakUpdate({
      lastPracticeDate: '2026-03-15',
      currentStreak: 5,
      today,
    });
    expect(result.streak).toBe(5);
    expect(result.changed).toBe(false);
  });

  it('increments streak for consecutive day', () => {
    const result = computeStreakUpdate({
      lastPracticeDate: '2026-03-14',
      currentStreak: 5,
      today,
    });
    expect(result.streak).toBe(6);
    expect(result.changed).toBe(true);
  });

  it('resets streak after a gap', () => {
    const result = computeStreakUpdate({
      lastPracticeDate: '2026-03-13',
      currentStreak: 10,
      today,
    });
    expect(result.streak).toBe(1);
    expect(result.changed).toBe(true);
  });

  it('starts streak at 1 with no prior practice', () => {
    const result = computeStreakUpdate({
      lastPracticeDate: null,
      currentStreak: 0,
      today,
    });
    expect(result.streak).toBe(1);
    expect(result.changed).toBe(true);
  });

  it('handles midnight boundary correctly — no rounding', () => {
    // March 14 at 23:59 → March 15 at 00:01 = consecutive day
    const result = computeStreakUpdate({
      lastPracticeDate: '2026-03-14',
      currentStreak: 3,
      today: '2026-03-15',
    });
    expect(result.streak).toBe(4);
  });
});
```

- [ ] **Step 3: Run to confirm it fails**

```bash
npm test -- useStreak
```
Expected: FAIL

- [ ] **Step 4: Extract pure function from useStreak.ts**

At the top of `hooks/useStreak.ts`, add the pure function (and export it for testing):

```ts
import { daysBetweenDateStrings, toLocalDateString } from '../lib/utils';

export interface StreakUpdateInput {
  lastPracticeDate: string | null;
  currentStreak: number;
  today: string;
}

export interface StreakUpdateResult {
  streak: number;
  changed: boolean;
}

export const computeStreakUpdate = (input: StreakUpdateInput): StreakUpdateResult => {
  const { lastPracticeDate, currentStreak, today } = input;

  if (!lastPracticeDate) {
    return { streak: 1, changed: true };
  }

  const diff = daysBetweenDateStrings(lastPracticeDate, today);

  if (diff === 0) return { streak: currentStreak, changed: false };
  if (diff === 1) return { streak: currentStreak + 1, changed: true };
  return { streak: 1, changed: true };
};
```

- [ ] **Step 5: Update hook to use the pure function**

In the `useStreak` hook body, replace the existing streak logic with a call to `computeStreakUpdate`, passing `toLocalDateString(new Date())` as `today`. Remove the old `toDateString` helper and old `daysBetween` logic.

- [ ] **Step 6: Run to confirm passing**

```bash
npm test -- useStreak
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add hooks/useStreak.ts __tests__/hooks/useStreak.test.ts
git commit -m "fix: streak calculation — use local calendar dates, no Math.round, correct boundary handling"
```

---

### Task 10: Fix Response Time Tracking

**Files:**
- Modify: `app/session/construction.tsx`

- [ ] **Step 1: Read app/session/construction.tsx in full**

- [ ] **Step 2: Find startTimeRef usage**

Locate:
- Where `startTimeRef = useRef(Date.now())` is declared
- Where `responseTimeMs = Date.now() - startTimeRef.current` is computed
- Where `startTimeRef.current = Date.now()` is reset (incorrect location)

- [ ] **Step 3: Fix the reset timing**

Remove `startTimeRef.current = Date.now()` from wherever it currently resets after recording the attempt.

Add a `useEffect` that resets the ref when the exercise index changes:
```ts
useEffect(() => {
  startTimeRef.current = Date.now();
}, [currentIndex]); // currentIndex = which exercise we're on
```

This ensures the timer resets the moment the new exercise appears, not after feedback.

- [ ] **Step 4: Add a console verification**

Temporarily add `console.log('Response time:', responseTimeMs, 'ms')` after computing `responseTimeMs`. Run the app, complete two exercises back-to-back. Confirm the second exercise's time reads ~the time you actually took, not the time since the feedback screen appeared. Remove the log before committing.

- [ ] **Step 5: Commit**

```bash
git add app/session/construction.tsx
git commit -m "fix: response time tracking — reset timer on exercise load, not after recording attempt"
```

---

### Task 11: Fix Pattern Unlock Phase Sync

**Files:**
- Modify: `app/session/pattern-unlock.tsx`

- [ ] **Step 1: Read app/session/pattern-unlock.tsx**

- [ ] **Step 2: Find the "Start Practicing" handler**

Locate the `onPress` or equivalent handler that navigates to `hear-examples`.

- [ ] **Step 3: Add setPhase call before navigation**

```ts
import { useSessionStore } from '../../store/sessionStore';

// In the handler:
const handleStartPracticing = () => {
  useSessionStore.getState().setPhase('hear_examples');
  router.push('/session/hear-examples');
};
```

Ensure `setPhase` is called BEFORE `router.push`.

- [ ] **Step 4: Verify phase state is correct**

Add a temporary `console.log('Phase after set:', useSessionStore.getState().phase)` immediately after `setPhase('hear_examples')`. Run the app, tap "Start Practicing" on the unlock screen, confirm the log shows `hear_examples` before navigation fires. Remove the log before committing.

- [ ] **Step 5: Commit**

```bash
git add app/session/pattern-unlock.tsx
git commit -m "fix: set session phase before navigation in pattern-unlock screen"
```

---

## Chunk 4: Architecture — React Query + Session Persistence + Prerequisites

### Task 12: React Query Hooks

**Files:**
- Create: `lib/queryKeys.ts`
- Create: `hooks/usePatterns.ts`
- Create: `hooks/useAllProgress.ts`
- Modify: `hooks/usePatternProgress.ts`
- Modify: `app/(tabs)/index.tsx`
- Modify: `app/(tabs)/patterns.tsx`
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Create lib/queryKeys.ts — single source of truth for all query keys**

```ts
export const QUERY_KEYS = {
  patterns: ['patterns'] as const,
  progress: ['progress'] as const,
  streak: ['streak'] as const,
};
```

- [ ] **Step 2: Read app/_layout.tsx to confirm QueryClient setup**

Verify `QueryClientProvider` wraps the app. If not, add:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient();
// Wrap root layout children:
<QueryClientProvider client={queryClient}>
  {children}
</QueryClientProvider>
```

- [ ] **Step 3: Create hooks/usePatterns.ts**

```ts
import { useQuery } from '@tanstack/react-query';
import { useDatabase } from './useDatabase';
import { useUserStore } from '../store/userStore';
import { getPatterns } from '../lib/db';
import { QUERY_KEYS } from '../lib/queryKeys';

export const usePatterns = () => {
  const db = useDatabase();
  const userId = useUserStore(s => s.userId) ?? '';

  return useQuery({
    queryKey: QUERY_KEYS.patterns,
    queryFn: () => getPatterns(db!, userId),
    enabled: !!db && !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
```

- [ ] **Step 4: Create hooks/useAllProgress.ts**

```ts
import { useQuery } from '@tanstack/react-query';
import { useDatabase } from './useDatabase';
import { useUserStore } from '../store/userStore';
import { getAllPatternProgress } from '../lib/db';
import { QUERY_KEYS } from '../lib/queryKeys';

export const useAllProgress = () => {
  const db = useDatabase();
  const userId = useUserStore(s => s.userId) ?? '';

  return useQuery({
    queryKey: QUERY_KEYS.progress,
    queryFn: () => getAllPatternProgress(db!, userId),
    enabled: !!db && !!userId,
    staleTime: 0,
  });
};
```

- [ ] **Step 5: Create hooks/useDatabase.ts (if it doesn't exist)**

Check if a hook exists that exposes the SQLite db instance. If not, create:
```ts
import { useSQLiteContext } from 'expo-sqlite';
export const useDatabase = () => useSQLiteContext();
```

- [ ] **Step 6: Update hooks/usePatternProgress.ts**

Read this file. Replace any direct `getAllPatternProgress()` call with `useAllProgress()`. Replace any direct `getPatterns()` call with `usePatterns()`.

- [ ] **Step 7: Replace direct DB calls in tab screens**

In `app/(tabs)/index.tsx`: replace `useEffect(() => { getAllPatternProgress()... })` with `const { data: progress } = useAllProgress()`. Same for `getPatterns` → `usePatterns`.

Repeat for `app/(tabs)/patterns.tsx` and `app/(tabs)/profile.tsx`.

- [ ] **Step 8: Invalidate on session completion**

In `app/session/summary.tsx`, after session is saved, add:
```ts
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../lib/queryKeys';

const queryClient = useQueryClient();
// After saveSession():
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.progress });
```

- [ ] **Step 9: Commit**

```bash
git add lib/queryKeys.ts hooks/usePatterns.ts hooks/useAllProgress.ts hooks/useDatabase.ts hooks/usePatternProgress.ts app/(tabs)/index.tsx app/(tabs)/patterns.tsx app/(tabs)/profile.tsx app/session/summary.tsx
git commit -m "feat: React Query caching for patterns and progress — eliminates per-render DB scans"
```

---

### Task 13: Incremental Session Persistence

**Files:**
- Modify: `lib/db.ts`
- Modify: `store/sessionStore.ts`
- Modify: `app/session/[sessionId].tsx`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Add recordAttemptIncremental to lib/db.ts**

```ts
export const recordAttemptIncremental = async (
  db: SQLiteDatabase,
  userId: string,
  attempt: {
    sessionId: string;
    patternId: number;
    exerciseId: number;
    verdict: MatchResult;
    responseTimeMs: number;
    hintLevelUsed: number;
    errorType?: ErrorType;
    source?: 'construction' | 'conversation';
  }
): Promise<void> => {
  await db.runAsync(
    `INSERT INTO exercise_attempts
     (user_id, session_id, pattern_id, exercise_id, verdict, response_time_ms,
      hint_level_used, error_type, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      userId, attempt.sessionId, attempt.patternId, attempt.exerciseId,
      attempt.verdict, attempt.responseTimeMs, attempt.hintLevelUsed,
      attempt.errorType ?? null, attempt.source ?? 'construction',
    ]
  );
};
```

- [ ] **Step 2: Add schema migrations for new session columns**

In `lib/db.ts`, inside `initializeDatabase()`, add (alongside the other `try/catch` migrations from Task 7):
```ts
try {
  await db.runAsync('ALTER TABLE sessions ADD COLUMN is_complete INTEGER NOT NULL DEFAULT 0');
} catch {}
try {
  await db.runAsync('ALTER TABLE sessions ADD COLUMN abandoned INTEGER NOT NULL DEFAULT 0');
} catch {}
```

Note: do NOT add a `completed_at` column — use the existing `created_at` or `updated_at` column if needed, or omit it entirely. The spec only requires `is_complete` and `abandoned`.

- [ ] **Step 3: Add finalizeSession to lib/db.ts**

```ts
export const finalizeSession = async (
  db: SQLiteDatabase,
  userId: string,
  sessionId: string,
  abandoned = false
): Promise<void> => {
  await db.runAsync(
    `UPDATE sessions SET is_complete = 1, abandoned = ?
     WHERE user_id = ? AND id = ?`,
    [abandoned ? 1 : 0, userId, sessionId]
  );
};

export const findIncompleteSession = async (
  db: SQLiteDatabase,
  userId: string
): Promise<{ id: string } | null> => {
  return db.getFirstAsync<{ id: string }>(
    `SELECT id FROM sessions WHERE user_id = ? AND is_complete = 0 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
};
```

- [ ] **Step 4: Fire-and-forget write after each attempt**

The store must NOT import or access the DB directly (spec: DB functions receive `userId` as parameter from call sites, no Zustand coupling in `lib/db.ts`). The write should happen at the call site — in the screen that calls the store action.

In `app/session/construction.tsx`, after calling the sessionStore action that records the attempt, add:
```ts
// Fire-and-forget DB write — errors are logged but not surfaced to user
recordAttemptIncremental(db, userId, attempt).catch(e =>
  console.warn('Failed to persist attempt:', e)
);
```

`db` comes from `useDatabase()`, `userId` from `useUserStore(s => s.userId)`.

Repeat this pattern in `app/session/review.tsx` and `app/session/recognize.tsx` — wherever exercise attempts are recorded.

- [ ] **Step 4: Add incomplete session detection to _layout.tsx**

In `app/_layout.tsx`, in the startup effect after DB init:
```ts
const incomplete = await findIncompleteSession(db, userId);
if (incomplete) {
  // Show alert
  Alert.alert(
    'Unfinished Session',
    'You have an unfinished practice session. Start fresh?',
    [
      { text: 'Start Fresh', onPress: () => finalizeSession(db, userId, incomplete.id, true) },
    ]
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/db.ts store/sessionStore.ts app/session/[sessionId].tsx app/_layout.tsx
git commit -m "feat: incremental session persistence — attempts saved immediately, incomplete session detection on startup"
```

---

### Task 14: Pattern Prerequisites Enforcement

**Files:**
- Create: `lib/prerequisites.ts`
- Create: `__tests__/lib/prerequisites.test.ts`
- Modify: `app/session/[sessionId].tsx`

- [ ] **Step 1: Write the test**

Create `__tests__/lib/prerequisites.test.ts`:
```ts
import { findDeepestUnmetPrerequisite } from '../../lib/prerequisites';
import { PatternStatus } from '../../types';

type StatusMap = Record<number, PatternStatus | null>;
type PrereqMap = Record<number, number[]>;

describe('findDeepestUnmetPrerequisite', () => {
  const prereqs: PrereqMap = {
    1: [],
    2: [1],
    3: [2],
    4: [1, 2],
    5: [3],
  };

  const allMastered: StatusMap = { 1: 'mastered', 2: 'mastered', 3: 'mastered', 4: 'mastered', 5: 'mastered' };

  it('returns null when all prerequisites are mastered', () => {
    expect(findDeepestUnmetPrerequisite(5, prereqs, allMastered)).toBeNull();
  });

  it('returns the direct unmet prerequisite', () => {
    const statuses: StatusMap = { ...allMastered, 3: 'practicing' };
    expect(findDeepestUnmetPrerequisite(5, prereqs, statuses)).toBe(3);
  });

  it('walks recursively to find deepest unmet prerequisite', () => {
    const statuses: StatusMap = { ...allMastered, 1: null, 2: null, 3: null };
    // 5 requires 3, 3 requires 2, 2 requires 1 — deepest is 1
    expect(findDeepestUnmetPrerequisite(5, prereqs, statuses)).toBe(1);
  });

  it('handles patterns with no prerequisites', () => {
    expect(findDeepestUnmetPrerequisite(1, prereqs, {})).toBeNull();
  });

  it('stops recursion at depth 3 and returns null rather than infinite-looping', () => {
    // Chain: 5 → 3 → 2 → 1. With depth limit 3, starting from 5:
    // depth 0: check 3 (unmet) → depth 1: check 2 (unmet) → depth 2: check 1 (unmet) → depth 3: stop
    // Should return 1 (deepest found within limit)
    const statuses: StatusMap = { 1: null, 2: null, 3: null, 4: null, 5: null };
    const result = findDeepestUnmetPrerequisite(5, prereqs, statuses);
    expect(result).not.toBeNull(); // Found something within depth limit
    expect(result).toBe(1);        // Got to the deepest it could reach
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm test -- prerequisites
```
Expected: FAIL

- [ ] **Step 3: Create lib/prerequisites.ts**

```ts
import { PatternStatus } from '../types';

type StatusMap = Record<number, PatternStatus | null>;
type PrereqMap = Record<number, number[]>;

export const findDeepestUnmetPrerequisite = (
  patternId: number,
  prereqMap: PrereqMap,
  statusMap: StatusMap,
  depth = 0
): number | null => {
  if (depth >= 3) return null;

  const prereqs = prereqMap[patternId] ?? [];

  for (const prereqId of prereqs) {
    const status = statusMap[prereqId];
    if (status !== 'mastered') {
      // Check this prerequisite's own prerequisites first (depth-first)
      const deeper = findDeepestUnmetPrerequisite(prereqId, prereqMap, statusMap, depth + 1);
      return deeper ?? prereqId;
    }
  }

  return null;
};
```

- [ ] **Step 4: Run to confirm passing**

```bash
npm test -- prerequisites
```
Expected: PASS

- [ ] **Step 5: Wire into session initializer**

In `app/session/[sessionId].tsx`, before allowing the session to proceed, add a prerequisites check:

```ts
import { findDeepestUnmetPrerequisite } from '../../lib/prerequisites';

// Build prereqMap from patterns data and statusMap from progress data
const unmetId = findDeepestUnmetPrerequisite(patternId, prereqMap, statusMap);
if (unmetId !== null) {
  const unmetPattern = patterns.find(p => p.id === unmetId);
  Alert.alert(
    'Complete Prerequisites First',
    `You need to master "${unmetPattern?.nameEn ?? 'a previous pattern'}" before practicing this one.`,
    [{
      text: `Practice ${unmetPattern?.nameEn ?? 'prerequisite'}`,
      onPress: () => router.replace(`/session/${unmetId}`),
    }]
  );
  return;
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/prerequisites.ts __tests__/lib/prerequisites.test.ts app/session/[sessionId].tsx
git commit -m "feat: enforce pattern prerequisites — deepest unmet prerequisite shown with navigation to it"
```

---

## Chunk 5: Cleanup — Adaptive Difficulty, Type Safety, Deduplication, Constants

### Task 15: Wire Adaptive Difficulty to Exercise Selection

**Files:**
- Modify: `lib/adaptiveDifficulty.ts`
- Modify: `store/sessionStore.ts`
- Modify: `app/session/construction.tsx`
- Modify: `components/session/ConstructionPrompt.tsx`

- [ ] **Step 1: Read lib/adaptiveDifficulty.ts and store/sessionStore.ts**

- [ ] **Step 2: Export getDifficultyConfig from adaptiveDifficulty**

```ts
import { toDifficultyLabel } from '../types';
import { DIFFICULTY_CONFIGS } from './constants';
import { DifficultyConfig } from '../types';

export const getDifficultyConfig = (scalar: number): DifficultyConfig => {
  const label = toDifficultyLabel(scalar);
  return DIFFICULTY_CONFIGS[label];
};
```

- [ ] **Step 3: Pass DifficultyConfig into construction.tsx**

In `construction.tsx`, read `difficultyLevel` from sessionStore, compute config:
```ts
const difficultyLevel = useSessionStore(s => s.difficultyLevel);
const difficultyConfig = getDifficultyConfig(difficultyLevel ?? 0.4);
```

Pass `difficultyConfig` as a prop to `ConstructionPrompt`.

- [ ] **Step 4: Update ConstructionPrompt to accept DifficultyConfig**

In `components/session/ConstructionPrompt.tsx`:
```ts
interface Props {
  // ... existing props
  difficultyConfig: DifficultyConfig;
}
```

Replace hardcoded values:
- `10000` hint delay → `difficultyConfig.hintDelayMs`
- `0.85` fuzzy threshold → `difficultyConfig.fuzzyMatchThreshold`
- Sentence frame logic → check `difficultyConfig.sentenceFrameMode`

- [ ] **Step 5: Commit**

```bash
git add lib/adaptiveDifficulty.ts store/sessionStore.ts app/session/construction.tsx components/session/ConstructionPrompt.tsx
git commit -m "feat: wire adaptive difficulty scalar to hint delay and fuzzy threshold"
```

---

### Task 16: Type Safety — Remove Unsafe Casts

**Files:**
- Modify: `app/(tabs)/patterns.tsx`
- Modify: `lib/db.ts`
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Fix patterns.tsx unsafe cast**

Read `app/(tabs)/patterns.tsx`. Find `as unknown as Pattern[]`. Fix the tier2 data export to return `Pattern[]` directly so the cast is unnecessary. Check `data/curriculum/tier2.ts` — ensure it exports with the correct type, then remove the cast.

- [ ] **Step 2: Fix db.ts type assertion**

Find `r.type as Exercise['type']`. Replace with:
```ts
import { isExerciseType } from '../types';

const type = isExerciseType(r.type) ? r.type : 'construct';
```

- [ ] **Step 3: Fix profile.tsx dynamic require**

Find `require('../../lib/mmkv')`. Replace with a static import at the top of the file:
```ts
import { getSettings } from '../../lib/mmkv';
```

Remove the dynamic `require`.

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/patterns.tsx lib/db.ts app/(tabs)/profile.tsx data/curriculum/tier2.ts
git commit -m "fix: remove unsafe type casts — isExerciseType guard, static mmkv import, proper tier2 types"
```

---

### Task 17: Deduplication — Shared Utilities and Constants

**Files:**
- Modify: `hooks/useStreak.ts` (remove duplicate toDateString)
- Modify: `lib/db.ts` (remove duplicate toDateString)
- Modify: `app/session/construction.tsx` (use FEEDBACK_MESSAGES)
- Modify: `app/session/review.tsx` (use FEEDBACK_MESSAGES)

- [ ] **Step 1: Remove duplicate toDateString from useStreak.ts and db.ts**

Both files currently define a local `toDateString` or similar helper. Remove them and import `toLocalDateString` from `lib/utils.ts` instead.

- [ ] **Step 2: Replace hardcoded feedback strings**

In `app/session/construction.tsx` and `app/session/review.tsx`, find hardcoded "Correct!", "Almost!", etc. strings. Replace with imports from `lib/constants.ts`:
```ts
import { FEEDBACK_MESSAGES } from '../../lib/constants';
// Usage:
const msg = FEEDBACK_MESSAGES.correct[Math.floor(Math.random() * FEEDBACK_MESSAGES.correct.length)];
```

- [ ] **Step 3: Replace hardcoded tier counts across files**

Find all `15` and `25` references meaning tier counts in `app/(tabs)/index.tsx`, `app/(tabs)/patterns.tsx`, `app/(tabs)/profile.tsx`. Import from `lib/constants.ts` instead.

- [ ] **Step 4: Replace hardcoded colors**

In the 10 files listed in the spec (Section 2.5), replace `#D4A017`, `#1A1008`, and other hardcoded hex values with `theme.colors.*` imports from `lib/theme.ts`.

Run a search first:
```bash
grep -r "#D4A017\|#1A1008\|#2C1A0E\|#F5E6C8" --include="*.tsx" --include="*.ts" -l
```

Then update each file.

- [ ] **Step 5: Extract HintDisplay component**

Read `components/session/ConstructionPrompt.tsx` and `app/session/construction.tsx`. Identify the hint rendering JSX (the UI that shows hint text based on `hintLevel`). Extract it into a new component:

Create `components/session/HintDisplay.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../lib/theme';
import type { HintLevel } from '../../types';

interface Props {
  hintLevel: HintLevel;
  sentenceFrame?: string;
  hintWords?: string[];
}

export const HintDisplay: React.FC<Props> = ({ hintLevel, sentenceFrame, hintWords }) => {
  if (hintLevel === 0) return null;
  // Render hint content based on hintLevel — move the existing JSX here
  // ...
};
```

Replace the duplicated hint JSX in both `ConstructionPrompt.tsx` and `construction.tsx` with `<HintDisplay hintLevel={hintLevel} sentenceFrame={sentenceFrame} hintWords={hintWords} />`.

- [ ] **Step 6: Run all tests**

```bash
npm test
```
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add lib/utils.ts lib/constants.ts components/session/HintDisplay.tsx components/session/ConstructionPrompt.tsx app/session/construction.tsx app/session/review.tsx app/(tabs)/index.tsx app/(tabs)/patterns.tsx app/(tabs)/profile.tsx
git commit -m "refactor: extract HintDisplay component, centralize feedback messages and tier counts"
```

---

## Final

- [ ] **Run full test suite**

```bash
npm test
```
Expected: All tests pass

- [ ] **Verify app builds**

```bash
npx expo export --platform ios 2>&1 | tail -20
```
Expected: No TypeScript errors

- [ ] **Final commit if any loose changes**

```bash
git status
git add -A
git commit -m "chore: final cleanup — bug fixes and architecture complete"
```
