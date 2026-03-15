import { tier2aPatterns } from './tier2a';
import { tier2bPatterns } from './tier2b';

export type { PatternData } from './tier1';

export const tier2Patterns = [...tier2aPatterns, ...tier2bPatterns];
