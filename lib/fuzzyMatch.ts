export type MatchResult = 'correct' | 'close' | 'partial' | 'incorrect';

/**
 * Computes the Levenshtein distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics for fuzzy comparison
    .replace(/[¿¡.,!?]/g, '')
    .trim();
}

function normalizeStrict(s: string): string {
  return s.toLowerCase().replace(/[¿¡.,!?]/g, '').trim();
}

/**
 * Evaluates a user response against expected and acceptable answers.
 * Returns a MatchResult:
 *   - 'correct'   : exact match (ignoring case/punctuation) or within 1 edit
 *   - 'close'     : within 2-3 edits (accent errors, minor typo)
 *   - 'partial'   : 4-6 edits or >50% word overlap
 *   - 'incorrect' : too far from any acceptable answer
 */
export function evaluateResponse(
  userResponse: string,
  expectedEs: string,
  acceptableEs: string[],
  fuzzyMatchThreshold = 0.15
): { result: MatchResult; bestMatch: string; distance: number } {
  const allAccepted = [expectedEs, ...acceptableEs];
  const userNorm = normalize(userResponse);

  let bestDistance = Infinity;
  let bestMatch = expectedEs;

  for (const candidate of allAccepted) {
    const candidateNorm = normalize(candidate);

    // Exact match after normalization
    if (userNorm === candidateNorm) {
      return { result: 'correct', bestMatch: candidate, distance: 0 };
    }

    const dist = levenshtein(userNorm, candidateNorm);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = candidate;
    }
  }

  const bestNorm = normalize(bestMatch);
  const maxLen = Math.max(userNorm.length, bestNorm.length);
  const relativeDistance = maxLen > 0 ? bestDistance / maxLen : 0;

  // Word-level matching: check if content words (≥4 chars) fuzzy-match
  const userWordArr = userNorm.split(/\s+/).filter(w => w.length >= 4);
  const bestWordArr = normalize(bestMatch).split(/\s+/).filter(w => w.length >= 4);
  const userWordSet = new Set(userNorm.split(/\s+/));
  const bestWordSet = new Set(normalize(bestMatch).split(/\s+/));

  // Exact word overlap
  const exactWordOverlap = [...userWordSet].filter(w => bestWordSet.has(w)).length /
    Math.max(userWordSet.size, bestWordSet.size);

  // Fuzzy word overlap: content words within 25% edit distance count as matches
  let fuzzyWordMatches = 0;
  for (const uw of userWordArr) {
    for (const bw of bestWordArr) {
      const wordDist = levenshtein(uw, bw);
      const threshold = Math.max(2, Math.floor(Math.max(uw.length, bw.length) * 0.25));
      if (wordDist <= threshold) {
        fuzzyWordMatches++;
        break;
      }
    }
  }
  const fuzzyWordOverlap = bestWordArr.length > 0
    ? fuzzyWordMatches / Math.max(userWordArr.length, bestWordArr.length)
    : 0;

  if (bestDistance <= 1) {
    return { result: 'correct', bestMatch, distance: bestDistance };
  } else if (bestDistance <= 3 || relativeDistance <= fuzzyMatchThreshold) {
    return { result: 'close', bestMatch, distance: bestDistance };
  } else if (bestDistance <= 8 || exactWordOverlap >= 0.5 || fuzzyWordOverlap >= 0.5) {
    return { result: 'partial', bestMatch, distance: bestDistance };
  } else {
    return { result: 'incorrect', bestMatch, distance: bestDistance };
  }
}

/**
 * Quick exact check (strict normalization, preserving accents).
 */
export function isExactMatch(userResponse: string, expectedEs: string, acceptableEs: string[]): boolean {
  const userStrict = normalizeStrict(userResponse);
  return [expectedEs, ...acceptableEs].some(a => normalizeStrict(a) === userStrict);
}
