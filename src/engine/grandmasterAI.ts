/**
 * Grandmaster Heuristic Backgammon AI Engine (`ROYAL AI`)
 *
 * Evaluates legal WBGF moves using multi-step lookahead and tournament positional heuristics:
 * - Hitting opponent blots (sending to the bar)
 * - Making key points (Golden 5-point, Bar 7-point, Inner Home Board points)
 * - Building consecutive Primes (3-, 4-, 5-, and 6-prime walls)
 * - Minimizing blot exposure in front of opponent attackers
 * - Escaping back checkers & Pip-race equity
 * - Real Doubling Cube Take/Drop and Offer evaluation
 */

import { BoardLocation, CheckerState3D } from '../libgdx/Gdx3DEngine';
import {
  calculatePipCount,
  getWBGFLegalFirstSteps,
  simulateSingleStepMove,
} from './backgammonRuleEngine';

/**
 * Computes a static positional evaluation score from the perspective of `forLight`.
 * Higher score = stronger position for `forLight`.
 */
export function evaluateBoardPosition(
  checkers: CheckerState3D[],
  forLight: boolean
): number {
  const myOff: BoardLocation = forLight ? 'off-light' : 'off-dark';
  const oppOff: BoardLocation = forLight ? 'off-dark' : 'off-light';
  const myBar: BoardLocation = forLight ? 'bar-light' : 'bar-dark';
  const oppBar: BoardLocation = forLight ? 'bar-dark' : 'bar-light';

  const myCounts = new Array<number>(25).fill(0);
  const oppCounts = new Array<number>(25).fill(0);

  let myBorneOff = 0;
  let oppBorneOff = 0;
  let myOnBar = 0;
  let oppOnBar = 0;

  for (const c of checkers) {
    if (c.isLight === forLight) {
      if (c.location === myOff) myBorneOff++;
      else if (c.location === myBar) myOnBar++;
      else if (typeof c.location === 'number') myCounts[c.location]++;
    } else {
      if (c.location === oppOff) oppBorneOff++;
      else if (c.location === oppBar) oppOnBar++;
      else if (typeof c.location === 'number') oppCounts[c.location]++;
    }
  }

  let score = 0;

  // 1. Borne-off and Bar differential
  score += (myBorneOff - oppBorneOff) * 44;
  score += oppOnBar * 39;
  score -= myOnBar * 43;

  // 2. Pip count race advantage
  const myPips = calculatePipCount(checkers, forLight);
  const oppPips = calculatePipCount(checkers, !forLight);
  score += (oppPips - myPips) * 0.52;

  // 3. Point control, Anchors, Primes, and Blot vulnerability
  let consecutiveMadePoints = 0;
  let maxPrimeLen = 0;

  for (let pt = 1; pt <= 24; pt++) {
    // Normalize point index relative to `forLight`'s home board (1 = 1-point, 24 = furthest back point)
    const relPt = forLight ? pt : 25 - pt;
    const count = myCounts[pt];

    if (count >= 2) {
      consecutiveMadePoints++;
      if (consecutiveMadePoints > maxPrimeLen) {
        maxPrimeLen = consecutiveMadePoints;
      }

      // Strategic point weights
      if (relPt === 5) {
        score += 21; // Golden 5-point
      } else if (relPt === 7) {
        score += 17; // Bar 7-point
      } else if (relPt === 4) {
        score += 16; // 4-point
      } else if (relPt >= 1 && relPt <= 6) {
        score += 12; // Other home board points
      } else if (relPt >= 8 && relPt <= 11) {
        score += 9.5; // Outer board prime points
      } else if (relPt >= 20 && relPt <= 22) {
        score += 11; // Defensive anchor in opponent's home board
      } else {
        score += 5;
      }

      // Slight penalty for excessive candlestick stacks (> 5 checkers on one point)
      if (count > 5) {
        score -= (count - 5) * 3.2;
      }
    } else {
      consecutiveMadePoints = 0;

      // Single blot vulnerability analysis
      if (count === 1) {
        // Check if opponent has checkers that can move onto `pt` (or on the bar)
        let directAttackers = oppOnBar > 0 ? 2 : 0;
        for (let dist = 1; dist <= 6; dist++) {
          const oppSourcePt = forLight ? pt - dist : pt + dist;
          if (oppSourcePt >= 1 && oppSourcePt <= 24) {
            if (oppCounts[oppSourcePt] > 0) {
              directAttackers += 2;
            }
          }
        }

        if (directAttackers > 0) {
          // Blots closer to our own home board are much more costly if hit
          const locationDangerWeight = (25 - relPt) / 12;
          score -= (12 + directAttackers * 3.5) * locationDangerWeight;
        } else {
          score -= 3.5;
        }
      }
    }

    // Penalize straggler checkers stuck deep on 23/24 points late in the game
    if (relPt >= 23 && count === 1) {
      score -= 8;
    }
  }

  // 4. Exponential bonus for consecutive prime walls (3-prime, 4-prime, 5-prime, 6-prime)
  if (maxPrimeLen >= 2) {
    score += maxPrimeLen * maxPrimeLen * 5.8;
  }

  return score;
}

/**
 * Selects the strongest single step move for `isLight` given `remainingDice`,
 * using 2-ply lookahead over the remaining dice in the turn.
 */
export function chooseBestGrandmasterMoveStep(
  checkers: CheckerState3D[],
  isLight: boolean,
  remainingDice: number[]
): { fromLoc: BoardLocation; toLoc: BoardLocation; dieUsed: number } | null {
  const legalFirstSteps = getWBGFLegalFirstSteps(
    checkers,
    isLight,
    remainingDice
  );
  if (legalFirstSteps.length === 0) return null;
  if (legalFirstSteps.length === 1) return legalFirstSteps[0];

  let bestStep = legalFirstSteps[0];
  let bestScore = -Infinity;

  for (const step1 of legalFirstSteps) {
    const sim1 = simulateSingleStepMove(
      checkers,
      isLight,
      step1.fromLoc,
      step1.toLoc,
      step1.dieUsed
    );
    const state1 = sim1.nextCheckers;

    const nextDice = [...remainingDice];
    const usedIdx = nextDice.indexOf(step1.dieUsed);
    if (usedIdx !== -1) {
      nextDice.splice(usedIdx, 1);
    }

    let branchScore: number;
    if (nextDice.length > 0) {
      const secondSteps = getWBGFLegalFirstSteps(state1, isLight, nextDice);
      if (secondSteps.length > 0) {
        let maxSecondScore = -Infinity;
        for (const step2 of secondSteps) {
          const sim2 = simulateSingleStepMove(
            state1,
            isLight,
            step2.fromLoc,
            step2.toLoc,
            step2.dieUsed
          );
          const s2 = evaluateBoardPosition(sim2.nextCheckers, isLight);
          if (s2 > maxSecondScore) {
            maxSecondScore = s2;
          }
        }
        branchScore = maxSecondScore;
      } else {
        branchScore = evaluateBoardPosition(state1, isLight);
      }
    } else {
      branchScore = evaluateBoardPosition(state1, isLight);
    }

    if (branchScore > bestScore) {
      bestScore = branchScore;
      bestStep = step1;
    }
  }

  return bestStep;
}

/**
 * Determines whether the AI (`aiIsLight`) should accept (TAKE) or decline (PASS/DROP)
 * a Doubling Cube offer from the player.
 * In Backgammon theory, the defender should TAKE if their win probability is >= ~22-25%.
 */
export function shouldAITakePlayerDouble(
  checkers: CheckerState3D[],
  aiIsLight: boolean
): { take: boolean; reason: string; aiWinEstimatePercent: number } {
  const aiScore = evaluateBoardPosition(checkers, aiIsLight);
  // Map heuristic score (-120..+120) to estimated win probability (0..100%) via logistic curve
  const winProb = 1 / (1 + Math.exp(-aiScore / 48));
  const aiWinEstimatePercent = Math.round(winProb * 100);

  if (aiWinEstimatePercent >= 23) {
    return {
      take: true,
      reason: `ROYAL AI TAKES CUBE (Est. Equity ${aiWinEstimatePercent}%)`,
      aiWinEstimatePercent,
    };
  }
  return {
    take: false,
    reason: `ROYAL AI DROPS CUBE (Est. Equity ${aiWinEstimatePercent}% < 23% Threshold)`,
    aiWinEstimatePercent,
  };
}
