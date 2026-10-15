/**
 * Backgammon AI Personality & Difficulty Engine
 *
 * Implements 3 distinct player personas with exact behavioral & error-rate constraints:
 *
 * 1. COMPLETE BEGINNER (مبتدی):
 *    - Plays randomly and makes frequent mistakes.
 *    - Prefers simple moves, often leaves blots unprotected, ignores the doubling cube, rarely builds primes/anchors.
 *    - Suboptimal checker plays 60-70% of the time.
 *    - Never calculates deeply; plays fast and carelessly.
 *
 * 2. NOVICE (نوآموز):
 *    - Basic knowledge of the rules.
 *    - Understands hitting and bearing off but frequently makes positional mistakes.
 *    - Sometimes leaves unnecessary blots, misjudges races, and uses the doubling cube poorly.
 *    - Plays reasonably in simple positions but fails in complex ones.
 *    - Error rate around 40-50%.
 *
 * 3. INTERMEDIATE (متوسط):
 *    - Basic strategy (hitting, making points, priming) but makes consistent positional errors.
 *    - Occasionally leaves blots in dangerous positions, mismanages the cube, and fails to play best race/containment moves.
 *    - Error rate around 25-35%. Plays solid against beginners but loses to stronger players.
 *
 * 4. GRANDMASTER (استاد بزرگ):
 *    - Full 2-ply tournament lookahead, deep prime formation, strict WBGF mathematical cube thresholds.
 */

import { BoardLocation, CheckerState3D } from '../libgdx/Gdx3DEngine';
import {
  calculatePipCount,
  getWBGFLegalFirstSteps,
  isPlayerInBearingOffPhase,
  simulateSingleStepMove,
} from './backgammonRuleEngine';
import {
  chooseBestGrandmasterMoveStep,
  evaluateBoardPosition,
  shouldAITakePlayerDouble,
} from './grandmasterAI';

export type AIDifficulty = 'beginner' | 'novice' | 'intermediate' | 'grandmaster';

export interface AIDifficultyProfile {
  id: AIDifficulty;
  name: string;
  persianName: string;
  badge: string;
  tagline: string;
  persianTagline: string;
  description: string;
  persianDescription: string;
  errorRate: string;
  moveDelayMs: number;
  rollDelayMs: number;
  themeColor: string;
}

export const AI_DIFFICULTY_PROFILES: Record<AIDifficulty, AIDifficultyProfile> = {
  beginner: {
    id: 'beginner',
    name: 'Complete Beginner',
    persianName: 'مبتدی (ساده)',
    badge: 'BEGINNER',
    tagline: 'Careless, simple moves & frequent blunders',
    persianTagline: 'بازی تصادفی، حرکات ساده، خطای مکرر و بدون کیوب',
    description:
      'Plays randomly and makes frequent mistakes. Prefers simple moves, often leaves blots unprotected, ignores the doubling cube, and rarely builds primes or anchors. Makes suboptimal checker plays 60-70% of the time. Plays fast and carelessly.',
    persianDescription:
      'حرکات تصادفی و اشتباهات مکرر، اولویت به پیشروی ساده تک‌مهره، رها کردن مهره‌های تک بدون محافظت، نادیده گرفتن تاس دوبرابر (کیوب)، عدم ساخت پرایم/دیوار، نرخ خطای ۶۰ تا ۷۰ درصد و بازی بسیار سریع و بی‌دقت.',
    errorRate: '60% - 70%',
    moveDelayMs: 360,
    rollDelayMs: 650,
    themeColor: '#34d399', // Emerald
  },
  novice: {
    id: 'novice',
    name: 'Novice Player',
    persianName: 'نوآموز (قوانین پایه)',
    badge: 'NOVICE',
    tagline: 'Hits & bears off, but struggles with positional strategy',
    persianTagline: 'مهارت در زدن و خروج، اما ضعف پوزیسیونی و کیوب',
    description:
      'Has basic knowledge of the rules. Understands hitting and bearing off but frequently makes positional mistakes. Sometimes leaves unnecessary blots, misjudges races, and uses the doubling cube poorly. Error rate around 40-50%.',
    persianDescription:
      'آشنایی با قوانین پایه، درک خوب از زدن مهره حریف و خارج کردن مهره‌ها (Bear-off)، اما خطاهای پوزیسیونی مکرر در موقعیت‌های پیچیده، رها کردن مهره تک غیرضروری، تخمین نادرست مسابقه پیپ و بازی ضعیف با کیوب (نرخ خطا ۴۰ تا ۵۰ درصد).',
    errorRate: '40% - 50%',
    moveDelayMs: 600,
    rollDelayMs: 950,
    themeColor: '#fbbf24', // Amber
  },
  intermediate: {
    id: 'intermediate',
    name: 'Intermediate Player',
    persianName: 'متوسط (تاکتیکی)',
    badge: 'INTERMEDIATE',
    tagline: 'Basic strategy, primes & anchors, but makes consistent errors',
    persianTagline: 'استراتژی پایه و پرایم، اما اشتباهات پوزیسیونی مداوم',
    description:
      'Knows basic strategy (hitting, making points, priming) but makes consistent positional errors. Occasionally leaves blots in dangerous positions, mismanages the cube, and fails to play the best race or containment moves. Error rate around 25-35%.',
    persianDescription:
      'تسلط به استراتژی‌های اساسی مانند زدن مهره، ساخت خانه‌های کلیدی (۵ و ۷) و ساخت پرایم، اما بروز اشتباهات پوزیسیونی مداوم، رها کردن گاه‌به‌گاه مهره تک در نقاط آسیب‌پذیر، مدیریت نامناسب کیوب در لحظات حساس و نرخ خطای ۲۵ تا ۳۵ درصد.',
    errorRate: '25% - 35%',
    moveDelayMs: 780,
    rollDelayMs: 1100,
    themeColor: '#60a5fa', // Blue
  },
  grandmaster: {
    id: 'grandmaster',
    name: 'Grandmaster Royal AI',
    persianName: 'استاد بزرگ (رویال AI)',
    badge: 'GRANDMASTER',
    tagline: 'WBGF Tournament Level, 2-Ply lookahead & optimal equity',
    persianTagline: 'سطح قهرمانی جهان، تحلیل ۲ لایه‌ای و کیوب بی‌نقص',
    description:
      'Tournament-level heuristic engine using 2-ply lookahead over remaining dice, golden 5-point priorities, exponential prime wall bonuses, pip equity, and strict 23% WBGF doubling cube threshold.',
    persianDescription:
      'هوش مصنوعی پیشرفته قهرمانی فدراسیون جهانی با تحلیل عمیق شاخه‌ها، اولویت‌های خانه طلایی ۵ و خانه بار ۷، محاسبه ریاضی دقیق پیپ و تصمیم‌گیری بهینه در مکعب دوبرابر.',
    errorRate: '< 5%',
    moveDelayMs: 920,
    rollDelayMs: 1250,
    themeColor: '#c084fc', // Purple
  },
};

export interface AICubeDecision {
  take: boolean;
  reason: string;
  aiWinEstimatePercent: number;
}

/**
 * Checks if a step hits an opponent checker
 */
function doesStepHitOpponent(
  checkers: CheckerState3D[],
  isLight: boolean,
  toLoc: BoardLocation
): boolean {
  if (typeof toLoc !== 'number') return false;
  const oppCheckers = checkers.filter(
    (c) => c.location === toLoc && c.isLight !== isLight
  );
  return oppCheckers.length === 1;
}

/**
 * Checks if a step bears off a checker
 */
function doesStepBearOff(isLight: boolean, toLoc: BoardLocation): boolean {
  return isLight ? toLoc === 'off-light' : toLoc === 'off-dark';
}

/**
 * Evaluates whether destination point makes an anchor/point (2+ checkers of same color)
 */
function doesStepMakeAnchor(
  checkers: CheckerState3D[],
  isLight: boolean,
  toLoc: BoardLocation
): boolean {
  if (typeof toLoc !== 'number') return false;
  const friendlyOnDest = checkers.filter(
    (c) => c.location === toLoc && c.isLight === isLight
  ).length;
  // If there is currently 1 checker, moving another there creates a made point (anchor)
  return friendlyOnDest === 1;
}

/**
 * Checks if source location has exactly 2 checkers, so moving one leaves a blot behind
 */
function doesStepLeaveSourceBlot(
  checkers: CheckerState3D[],
  isLight: boolean,
  fromLoc: BoardLocation
): boolean {
  if (typeof fromLoc !== 'number') return false;
  const friendlyOnSource = checkers.filter(
    (c) => c.location === fromLoc && c.isLight === isLight
  ).length;
  return friendlyOnSource === 2; // Was a safe made point, now broken into a blot!
}

/**
 * Computes tactical score of a single move for Novice/Intermediate evaluation
 */
function scoreTacticalStep(
  checkers: CheckerState3D[],
  isLight: boolean,
  step: { fromLoc: BoardLocation; toLoc: BoardLocation; dieUsed: number }
): number {
  let score = 0;
  const hits = doesStepHitOpponent(checkers, isLight, step.toLoc);
  const bearsOff = doesStepBearOff(isLight, step.toLoc);
  const makesPoint = doesStepMakeAnchor(checkers, isLight, step.toLoc);
  const leavesBlot = doesStepLeaveSourceBlot(checkers, isLight, step.fromLoc);

  if (hits) score += 45;
  if (bearsOff) score += 40;
  if (makesPoint) score += 25;
  if (leavesBlot) score -= 18;

  // Normalized destination point priority
  if (typeof step.toLoc === 'number') {
    const relPt = isLight ? step.toLoc : 25 - step.toLoc;
    if (relPt === 5) score += 18; // Golden 5-point
    else if (relPt === 7) score += 14; // Bar 7-point
    else if (relPt <= 6) score += 10;
  }

  return score;
}

/**
 * 1. COMPLETE BEGINNER AI MOVE LOGIC:
 * - Make suboptimal checker plays 60-70% of the time.
 * - Prefer simple moves, often leave blots unprotected, ignore primes/anchors.
 * - Never calculate deeply; play fast and carelessly.
 */
function chooseBeginnerMoveStep(
  checkers: CheckerState3D[],
  isLight: boolean,
  legalSteps: { fromLoc: BoardLocation; toLoc: BoardLocation; dieUsed: number }[]
): { fromLoc: BoardLocation; toLoc: BoardLocation; dieUsed: number } {
  const isSuboptimalPlay = Math.random() < 0.65; // 60-70% suboptimal error rate

  if (isSuboptimalPlay) {
    // Score moves with beginner biases:
    // Beginners prefer simple advances, avoid making anchors, leave blots, and pick carelessly
    const scoredCandidates = legalSteps.map((step) => {
      let beginnerScore = Math.random() * 20;

      // Beginners rarely build primes or anchors; penalize anchoring
      if (doesStepMakeAnchor(checkers, isLight, step.toLoc)) {
        beginnerScore -= 25;
      }

      // Beginners often leave blots unprotected and break points
      if (doesStepLeaveSourceBlot(checkers, isLight, step.fromLoc)) {
        beginnerScore += 10; // Carelessly breaks points!
      }

      // Simple single-die advance of any lone checker
      if (typeof step.fromLoc === 'number' && typeof step.toLoc === 'number') {
        beginnerScore += 12;
      }

      return { step, beginnerScore };
    });

    scoredCandidates.sort((a, b) => b.beginnerScore - a.beginnerScore);
    // Pick from the top of the beginner-biased (suboptimal) candidate list
    return scoredCandidates[0].step;
  }

  // Remaining 35%: pick a random legal step without deep calculation
  const randomIndex = Math.floor(Math.random() * legalSteps.length);
  return legalSteps[randomIndex];
}

/**
 * 2. NOVICE AI MOVE LOGIC:
 * - Understands hitting and bearing off.
 * - Frequently makes positional mistakes (leaves unnecessary blots, misjudges races).
 * - Plays reasonably in simple positions but fails in complex ones.
 * - Error rate around 40-50%.
 */
function chooseNoviceMoveStep(
  checkers: CheckerState3D[],
  isLight: boolean,
  legalSteps: { fromLoc: BoardLocation; toLoc: BoardLocation; dieUsed: number }[]
): { fromLoc: BoardLocation; toLoc: BoardLocation; dieUsed: number } {
  // Check if there is an obvious hit or bear-off move
  const hittingSteps = legalSteps.filter((s) =>
    doesStepHitOpponent(checkers, isLight, s.toLoc)
  );
  if (hittingSteps.length > 0) {
    // Novice understands hitting! High chance of executing the hit
    if (Math.random() < 0.85) {
      return hittingSteps[Math.floor(Math.random() * hittingSteps.length)];
    }
  }

  const inBearingOff = isPlayerInBearingOffPhase(checkers, isLight);
  if (inBearingOff) {
    const bearOffSteps = legalSteps.filter((s) =>
      doesStepBearOff(isLight, s.toLoc)
    );
    if (bearOffSteps.length > 0) {
      // Novice understands bearing off
      if (Math.random() < 0.88) {
        return bearOffSteps[Math.floor(Math.random() * bearOffSteps.length)];
      }
    }
  }

  // In simple positions (<= 2 moves available), play reasonably
  if (legalSteps.length <= 2) {
    const sorted = [...legalSteps].sort(
      (a, b) =>
        scoreTacticalStep(checkers, isLight, b) -
        scoreTacticalStep(checkers, isLight, a)
    );
    return sorted[0];
  }

  // In complex positions: 40-50% error rate
  const makesError = Math.random() < 0.45;

  // Rank moves by standard tactical heuristic
  const ranked = legalSteps.map((step) => ({
    step,
    tacticalScore: scoreTacticalStep(checkers, isLight, step),
  }));
  ranked.sort((a, b) => b.tacticalScore - a.tacticalScore);

  if (makesError) {
    // Positional mistake: pick a suboptimal move that might leave unnecessary blots
    // Pick from the 2nd half or bottom moves
    const blunderIndex = Math.min(
      Math.floor(1 + Math.random() * (ranked.length - 1)),
      ranked.length - 1
    );
    return ranked[blunderIndex].step;
  }

  return ranked[0].step;
}

/**
 * 3. INTERMEDIATE AI MOVE LOGIC:
 * - Knows basic strategy (hitting, making points, priming).
 * - Makes consistent positional errors (leaves blots in dangerous positions, misjudges race/containment).
 * - Error rate around 25-35%.
 */
function chooseIntermediateMoveStep(
  checkers: CheckerState3D[],
  isLight: boolean,
  legalSteps: { fromLoc: BoardLocation; toLoc: BoardLocation; dieUsed: number }[]
): { fromLoc: BoardLocation; toLoc: BoardLocation; dieUsed: number } {
  // Rank moves using strategic evaluation
  const evaluatedMoves = legalSteps.map((step) => {
    const sim = simulateSingleStepMove(
      checkers,
      isLight,
      step.fromLoc,
      step.toLoc,
      step.dieUsed
    );
    const posScore = evaluateBoardPosition(sim.nextCheckers, isLight);
    const tacticalBonus = scoreTacticalStep(checkers, isLight, step) * 0.4;
    return {
      step,
      totalScore: posScore + tacticalBonus,
    };
  });

  evaluatedMoves.sort((a, b) => b.totalScore - a.totalScore);

  // 25-35% error rate (consistent positional errors)
  const makesError = Math.random() < 0.30;

  if (makesError && evaluatedMoves.length > 1) {
    // Occasionally leaves a blot or misjudges race: pick 2nd or 3rd best move
    const suboptimalIndex = Math.min(
      1 + (Math.random() < 0.35 && evaluatedMoves.length > 2 ? 1 : 0),
      evaluatedMoves.length - 1
    );
    return evaluatedMoves[suboptimalIndex].step;
  }

  // Solid play against beginner/novice
  return evaluatedMoves[0].step;
}

/**
 * Main AI move selection router based on selected difficulty
 */
export function chooseAIMoveStep(
  checkers: CheckerState3D[],
  isLight: boolean,
  remainingDice: number[],
  difficulty: AIDifficulty = 'intermediate'
): { fromLoc: BoardLocation; toLoc: BoardLocation; dieUsed: number } | null {
  const legalSteps = getWBGFLegalFirstSteps(checkers, isLight, remainingDice);
  if (legalSteps.length === 0) return null;
  if (legalSteps.length === 1) return legalSteps[0];

  switch (difficulty) {
    case 'beginner':
      return chooseBeginnerMoveStep(checkers, isLight, legalSteps);

    case 'novice':
      return chooseNoviceMoveStep(checkers, isLight, legalSteps);

    case 'intermediate':
      return chooseIntermediateMoveStep(checkers, isLight, legalSteps);

    case 'grandmaster':
    default:
      return chooseBestGrandmasterMoveStep(checkers, isLight, remainingDice);
  }
}

/**
 * Evaluates whether the AI should TAKE or DROP a Doubling Cube offer
 * tailored to each player persona:
 * - Beginner: Ignores the cube, takes or drops carelessly
 * - Novice: Uses cube poorly, noisy equity estimate
 * - Intermediate: Mismanages cube at key margins (occasional error)
 * - Grandmaster: Strict 23% tournament threshold
 */
export function evaluateAIDoubleResponse(
  checkers: CheckerState3D[],
  aiIsLight: boolean,
  difficulty: AIDifficulty = 'intermediate'
): AICubeDecision {
  const baseDecision = shouldAITakePlayerDouble(checkers, aiIsLight);
  const realEquity = baseDecision.aiWinEstimatePercent;

  switch (difficulty) {
    case 'beginner': {
      // Beginner ignores the doubling cube! Plays carelessly without calculation
      const carelessGuess = Math.random() < 0.5;
      return {
        take: carelessGuess,
        reason: carelessGuess
          ? `BEGINNER AI: Carelessly accepted cube (ignored math & equity)`
          : `BEGINNER AI: Carelessly passed cube (disregarded position)`,
        aiWinEstimatePercent: carelessGuess ? 50 : 20,
      };
    }

    case 'novice': {
      // Novice uses the doubling cube poorly; large blunder noise (±30%)
      const noise = (Math.random() - 0.5) * 60;
      const perceivedEquity = Math.max(5, Math.min(95, Math.round(realEquity + noise)));
      const take = perceivedEquity >= 25;
      return {
        take,
        reason: take
          ? `NOVICE AI: Took cube (Misjudged equity at ~${perceivedEquity}%)`
          : `NOVICE AI: Dropped cube (Underestimated equity at ~${perceivedEquity}%)`,
        aiWinEstimatePercent: perceivedEquity,
      };
    }

    case 'intermediate': {
      // Intermediate knows basic rules but mismanages the cube on tight decisions (±15% noise)
      const noise = (Math.random() - 0.5) * 26;
      const perceivedEquity = Math.max(10, Math.min(90, Math.round(realEquity + noise)));
      const take = perceivedEquity >= 22;
      return {
        take,
        reason: take
          ? `INTERMEDIATE AI: Accepts double (Evaluated equity ~${perceivedEquity}%)`
          : `INTERMEDIATE AI: Passes cube (Evaluated equity ~${perceivedEquity}%)`,
        aiWinEstimatePercent: perceivedEquity,
      };
    }

    case 'grandmaster':
    default:
      return baseDecision;
  }
}

/**
 * Evaluates whether AI should OFFER a double to the human player during its turn
 */
export function shouldAIOfferDouble(
  checkers: CheckerState3D[],
  aiIsLight: boolean,
  difficulty: AIDifficulty = 'intermediate',
  currentCubeValue: number = 1
): { offer: boolean; reason: string } {
  if (currentCubeValue >= 64) {
    return { offer: false, reason: 'Cube at max 64x' };
  }

  const baseDecision = shouldAITakePlayerDouble(checkers, aiIsLight);
  const realWinPercent = baseDecision.aiWinEstimatePercent;

  switch (difficulty) {
    case 'beginner':
      // Beginner ignores the doubling cube; never initiates a double
      return { offer: false, reason: 'Beginner ignores doubling cube' };

    case 'novice': {
      // Novice rarely doubles, occasionally doubles late when overwhelming
      if (realWinPercent >= 84 && Math.random() < 0.4) {
        return {
          offer: true,
          reason: `NOVICE AI: Belated double offer (${realWinPercent}% win rate)`,
        };
      }
      return { offer: false, reason: 'Novice hesitant on cube' };
    }

    case 'intermediate': {
      // Intermediate offers when leading (>70%), but occasionally mistimes
      if (realWinPercent >= 70 && realWinPercent <= 82 && Math.random() < 0.65) {
        return {
          offer: true,
          reason: `INTERMEDIATE AI: Offers double (+${realWinPercent}% win equity)`,
        };
      }
      return { offer: false, reason: 'Intermediate holding cube' };
    }

    case 'grandmaster':
    default: {
      // WBGF optimal doubling window: between 68% and 78% win probability
      if (realWinPercent >= 68 && realWinPercent <= 78) {
        return {
          offer: true,
          reason: `ROYAL AI: Optimal doubling window (Equity ${realWinPercent}%)`,
        };
      }
      return { offer: false, reason: 'Not in optimal double window' };
    }
  }
}

/**
 * Returns AI turn delay timings according to difficulty persona
 */
export function getAIDelays(difficulty: AIDifficulty = 'intermediate'): {
  moveDelayMs: number;
  rollDelayMs: number;
} {
  const profile = AI_DIFFICULTY_PROFILES[difficulty] || AI_DIFFICULTY_PROFILES.intermediate;
  return {
    moveDelayMs: profile.moveDelayMs,
    rollDelayMs: profile.rollDelayMs,
  };
}
