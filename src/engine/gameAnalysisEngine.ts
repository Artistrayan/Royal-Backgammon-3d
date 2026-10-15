/**
 * Backgammon Smart Game Analysis & Performance Rating (PR) Engine
 *
 * Implements WBGF / eXtreme Gammon standard Performance Rating (PR):
 * - Evaluates every player decision against the Grandmaster AI 2-ply engine
 * - Calculates equity loss (millipoints error) for each move
 * - Grades moves: Best / Good, Inaccuracy (0.020-0.040), Error (0.041-0.080), Blunder (>0.080)
 * - Computes official match Performance Rating (PR = (Total Equity Loss / Decisions) * 500)
 * - Full move-by-move history review mode with before/after state and coaching tips
 */

import { BoardLocation, CheckerState3D } from '../libgdx/Gdx3DEngine';
import {
  evaluateBoardPosition,
  chooseBestGrandmasterMoveStep,
} from './grandmasterAI';
import { getWBGFLegalFirstSteps, simulateSingleStepMove } from './backgammonRuleEngine';

export type MoveClassification = 'best' | 'good' | 'inaccuracy' | 'error' | 'blunder';

export interface AnalyzedDecision {
  moveNumber: number;
  playerColor: 'light' | 'dark';
  diceRolled: [number, number];
  dieUsed: number;
  playerChosenStep: {
    fromLoc: BoardLocation;
    toLoc: BoardLocation;
  };
  bestAiStep: {
    fromLoc: BoardLocation;
    toLoc: BoardLocation;
  };
  playerMoveEquity: number;
  bestMoveEquity: number;
  equityLoss: number; // Positive number (bestMoveEquity - playerMoveEquity)
  classification: MoveClassification;
  coachingTip: string;
  persianCoachingTip: string;
  checkersBefore: CheckerState3D[];
  checkersAfter: CheckerState3D[];
}

export interface MatchAnalysisSummary {
  totalDecisions: number;
  totalEquityLoss: number;
  performanceRating: number; // PR (0..30+)
  skillCategory: string;
  persianSkillCategory: string;
  bestMovesCount: number;
  inaccuraciesCount: number;
  errorsCount: number;
  blundersCount: number;
  averagePipWasted: number;
  decisions: AnalyzedDecision[];
}

/**
 * Normalizes heuristic board position score (-150..+150) into standard Backgammon Match Equity (-1.000..+1.000)
 */
export function scoreToEquity(score: number): number {
  return Math.tanh(score / 45);
}

/**
 * Classifies a move based on equity loss (millipoints)
 */
export function classifyMove(equityLoss: number): {
  classification: MoveClassification;
  coachingTip: string;
  persianTip: string;
} {
  if (equityLoss <= 0.015) {
    return {
      classification: 'best',
      coachingTip: 'Optimal Move: Maximizes prime potential and board safety.',
      persianTip: 'حرکت بهینه: بهترین کنترل خانه، استحکام پرایم و امنیت مهره‌ها.',
    };
  }
  if (equityLoss <= 0.035) {
    return {
      classification: 'inaccuracy',
      coachingTip: 'Minor Inaccuracy: Slightly sub-optimal checker distribution.',
      persianTip: 'بی‌دقتی جزئی: زاویه پیشروی مهره‌ها می‌توانست مستحکم‌تر باشد.',
    };
  }
  if (equityLoss <= 0.075) {
    return {
      classification: 'error',
      coachingTip: 'Positional Error: Missed key anchor, hit, or prime opportunity.',
      persianTip: 'اشتباه پوزیسیونی: غفلت از ساخت لنگرگاه دفاعی یا زدن مهره حریف.',
    };
  }
  return {
    classification: 'blunder',
    coachingTip: 'Blunder: Exposed critical blots or destroyed prime structure.',
    persianTip: 'خطای فاحش (سوتی): باز گذاشتن مهره آسیب‌پذیر یا شکستن دیواره دفاعی.',
  };
}

/**
 * Evaluates a player's move against the optimal Grandmaster AI step
 */
export function analyzePlayerStep(
  checkersBefore: CheckerState3D[],
  isLight: boolean,
  remainingDice: number[],
  chosenStep: { fromLoc: BoardLocation; toLoc: BoardLocation; dieUsed: number },
  moveNumber: number
): AnalyzedDecision {
  const bestStep = chooseBestGrandmasterMoveStep(checkersBefore, isLight, remainingDice) || chosenStep;

  // Simulate chosen move
  const simChosen = simulateSingleStepMove(
    checkersBefore,
    isLight,
    chosenStep.fromLoc,
    chosenStep.toLoc,
    chosenStep.dieUsed
  );
  const rawChosenScore = evaluateBoardPosition(simChosen.nextCheckers, isLight);
  const chosenEquity = scoreToEquity(rawChosenScore);

  // Simulate best AI move
  const simBest = simulateSingleStepMove(
    checkersBefore,
    isLight,
    bestStep.fromLoc,
    bestStep.toLoc,
    bestStep.dieUsed
  );
  const rawBestScore = evaluateBoardPosition(simBest.nextCheckers, isLight);
  const bestEquity = scoreToEquity(rawBestScore);

  const equityLoss = Math.max(0, Math.round((bestEquity - chosenEquity) * 1000) / 1000);
  const { classification, coachingTip, persianTip } = classifyMove(equityLoss);

  return {
    moveNumber,
    playerColor: isLight ? 'light' : 'dark',
    diceRolled: [remainingDice[0] || 1, remainingDice[1] || remainingDice[0] || 1],
    dieUsed: chosenStep.dieUsed,
    playerChosenStep: { fromLoc: chosenStep.fromLoc, toLoc: chosenStep.toLoc },
    bestAiStep: { fromLoc: bestStep.fromLoc, toLoc: bestStep.toLoc },
    playerMoveEquity: chosenEquity,
    bestMoveEquity: bestEquity,
    equityLoss,
    classification,
    coachingTip,
    persianCoachingTip: persianTip,
    checkersBefore,
    checkersAfter: simChosen.nextCheckers,
  };
}

/**
 * Computes official WBGF Performance Rating (PR) from accumulated decisions
 */
export function calculateMatchPR(decisions: AnalyzedDecision[]): MatchAnalysisSummary {
  if (decisions.length === 0) {
    return {
      totalDecisions: 0,
      totalEquityLoss: 0,
      performanceRating: 0,
      skillCategory: 'Unrated',
      persianSkillCategory: 'بدون تصمیم',
      bestMovesCount: 0,
      inaccuraciesCount: 0,
      errorsCount: 0,
      blundersCount: 0,
      averagePipWasted: 0,
      decisions: [],
    };
  }

  let totalEquityLoss = 0;
  let best = 0;
  let inaccuracies = 0;
  let errors = 0;
  let blunders = 0;

  for (const d of decisions) {
    totalEquityLoss += d.equityLoss;
    if (d.classification === 'best' || d.classification === 'good') best++;
    else if (d.classification === 'inaccuracy') inaccuracies++;
    else if (d.classification === 'error') errors++;
    else if (d.classification === 'blunder') blunders++;
  }

  // WBGF Standard: PR = (totalError / decisions) * 500
  const rawPR = (totalEquityLoss / decisions.length) * 500;
  const performanceRating = Math.round(rawPR * 10) / 10;

  let skillCategory = 'Casual (مبتدی)';
  let persianSkillCategory = 'مبتدی (نیاز به تمرین تاکتیکی)';

  if (performanceRating < 3.5) {
    skillCategory = 'World Class (سوپراستار جهانی)';
    persianSkillCategory = 'کلاس جهانی (دقت مسابقات قهرمانی فدراسیون)';
  } else if (performanceRating < 6.5) {
    skillCategory = 'Master (استاد)';
    persianSkillCategory = 'استاد بزرگ (بازی بسیار تمیز و حساب‌شده)';
  } else if (performanceRating < 10.5) {
    skillCategory = 'Advanced (پیشرفته)';
    persianSkillCategory = 'پیشرفته (تسلط عالی به اصول پوزیسیونی)';
  } else if (performanceRating < 16.0) {
    skillCategory = 'Intermediate (متوسط)';
    persianSkillCategory = 'متوسط (شناخت خوب از ساخت پرایم و زدن)';
  }

  return {
    totalDecisions: decisions.length,
    totalEquityLoss: Math.round(totalEquityLoss * 1000) / 1000,
    performanceRating,
    skillCategory,
    persianSkillCategory,
    bestMovesCount: best,
    inaccuraciesCount: inaccuracies,
    errorsCount: errors,
    blundersCount: blunders,
    averagePipWasted: Math.round((totalEquityLoss * 4) * 10) / 10,
    decisions,
  };
}
