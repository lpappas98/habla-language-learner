import { SRS_EASE_FLOOR } from './constants';

export const SRS_QUALITY = {
  correct: 5,
  close: 2,
  incorrect: 0,
} as const;

type Quality = typeof SRS_QUALITY[keyof typeof SRS_QUALITY];

interface SM2Input {
  ease: number;
  interval: number;
  quality: Quality;
}

interface SM2Result {
  newEase: number;
  newInterval: number;
}

export const computeSM2 = ({ ease, interval, quality }: SM2Input): SM2Result => {
  const newEase = Math.max(
    SRS_EASE_FLOOR,
    ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  let newInterval: number;
  if (quality >= 3) {
    if (interval === 0) newInterval = 1;
    else if (interval === 1) newInterval = 6;
    else newInterval = Math.round(interval * ease);
  } else {
    newInterval = 1;
  }

  return { newEase, newInterval };
};
