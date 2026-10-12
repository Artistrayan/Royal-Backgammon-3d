/**
 * World Backgammon Federation (WBGF) Tournament Rule Engine
 *
 * Implements:
 * 1. Exact Live Pip Count calculation (starting at 167 pips per player)
 * 2. Single-Die & Combined Multi-Die Move generation (1-Tap compound moves across 2..4 dice)
 * 3. WBGF Compulsory Max-Dice & Higher-Die Rule enforcement
 * 4. Official Single (1x), Gammon / مارس (2x), and Backgammon / سیاه‌مارس (3x) detection
 */

import { BoardLocation, CheckerState3D } from '../libgdx/Gdx3DEngine';

export interface SingleStepMove {
  checkerId: number;
  fromLoc: BoardLocation;
  toLoc: BoardLocation;
  dieUsed: number;
  hitOpponentCheckerId: number | null;
}

export interface SelectableDestinationMove {
  fromLoc: BoardLocation;
  toLoc: BoardLocation;
  /** Sequence of 1 to 4 individual die steps executed when the player clicks `toLoc` */
  steps: {
    fromLoc: BoardLocation;
    toLoc: BoardLocation;
    dieUsed: number;
  }[];
  isCombinedMove: boolean;
  totalPipsMoved: number;
}

export type VictoryType = 'single' | 'gammon' | 'backgammon';

export interface MatchVictoryOutcome {
  winner: 'light' | 'dark';
  victoryType: VictoryType;
  victoryLabel: string;
  baseMultiplier: 1 | 2 | 3;
  cubeValue: number;
  totalMultiplier: number;
  coinsAwarded: number;
}

/**
 * Calculates the exact Pip Count for `isLight` (starts at 167 at the beginning of a standard match).
 */
export function calculatePipCount(
  checkers: CheckerState3D[],
  isLight: boolean
): number {
  const offLoc: BoardLocation = isLight ? 'off-light' : 'off-dark';
  const barLoc: BoardLocation = isLight ? 'bar-light' : 'bar-dark';

  let pips = 0;
  for (const c of checkers) {
    if (c.isLight !== isLight) continue;
    if (c.location === offLoc) continue;
    if (c.location === barLoc) {
      pips += 25;
    } else if (typeof c.location === 'number') {
      pips += isLight ? c.location : 25 - c.location;
    }
  }
  return pips;
}

/**
 * Checks whether all 15 checkers of `isLight` are inside their Home Board (1..6 for Light, 19..24 for Dark) or borne off.
 */
export function isPlayerInBearingOffPhase(
  checkers: CheckerState3D[],
  isLight: boolean
): boolean {
  const offLoc: BoardLocation = isLight ? 'off-light' : 'off-dark';
  return checkers
    .filter((c) => c.isLight === isLight)
    .every((c) => {
      if (c.location === offLoc) return true;
      if (typeof c.location !== 'number') return false;
      return isLight
        ? c.location >= 1 && c.location <= 6
        : c.location >= 19 && c.location <= 24;
    });
}

/**
 * Computes raw legal single-die moves from `fromLoc` for a single die value.
 */
export function getSingleDieMoveFromLocation(
  checkers: CheckerState3D[],
  isLight: boolean,
  fromLoc: BoardLocation,
  die: number
): { toLoc: BoardLocation; dieUsed: number } | null {
  const barLoc: BoardLocation = isLight ? 'bar-light' : 'bar-dark';
  const offLoc: BoardLocation = isLight ? 'off-light' : 'off-dark';

  // Must enter from the bar first if any checker is on the bar
  const onBarCount = checkers.filter((c) => c.location === barLoc).length;
  if (onBarCount > 0 && fromLoc !== barLoc) {
    return null;
  }

  if (fromLoc === 'off-light' || fromLoc === 'off-dark') {
    return null;
  }

  const hasMover = checkers.some(
    (c) => c.isLight === isLight && c.location === fromLoc
  );
  if (!hasMover) return null;

  const canBearOff = isPlayerInBearingOffPhase(checkers, isLight);

  let targetPoint: number;
  if (fromLoc === 'bar-light') {
    targetPoint = 25 - die; // 24..19
  } else if (fromLoc === 'bar-dark') {
    targetPoint = die; // 1..6
  } else {
    targetPoint = isLight ? fromLoc - die : fromLoc + die;
  }

  if (targetPoint >= 1 && targetPoint <= 24) {
    const oppOnTarget = checkers.filter(
      (c) => c.location === targetPoint && c.isLight !== isLight
    ).length;
    if (oppOnTarget <= 1) {
      return { toLoc: targetPoint, dieUsed: die };
    }
    return null;
  }

  // Bearing off
  if (canBearOff && typeof fromLoc === 'number') {
    if (isLight && targetPoint <= 0) {
      if (targetPoint === 0) {
        return { toLoc: offLoc, dieUsed: die };
      }
      // Overshoot bear-off: only legal if no checker is on a higher home-board point (fromLoc + 1 .. 6)
      const hasHigherChecker = checkers.some(
        (c) =>
          c.isLight &&
          typeof c.location === 'number' &&
          c.location > fromLoc &&
          c.location <= 6
      );
      if (!hasHigherChecker) {
        return { toLoc: offLoc, dieUsed: die };
      }
    } else if (!isLight && targetPoint >= 25) {
      if (targetPoint === 25) {
        return { toLoc: offLoc, dieUsed: die };
      }
      // Overshoot bear-off for Dark: only legal if no checker is on a further home-board point (19 .. fromLoc - 1)
      const hasHigherChecker = checkers.some(
        (c) =>
          !c.isLight &&
          typeof c.location === 'number' &&
          c.location < fromLoc &&
          c.location >= 19
      );
      if (!hasHigherChecker) {
        return { toLoc: offLoc, dieUsed: die };
      }
    }
  }

  return null;
}

/**
 * Pure state transition: applies a single checker move from `fromLoc` to `toLoc` on a cloned checker array.
 */
export function simulateSingleStepMove(
  checkers: CheckerState3D[],
  isLight: boolean,
  fromLoc: BoardLocation,
  toLoc: BoardLocation,
  dieUsed: number
): {
  nextCheckers: CheckerState3D[];
  stepRecord: SingleStepMove | null;
} {
  const moversAtSource = checkers
    .filter((c) => c.isLight === isLight && c.location === fromLoc)
    .sort((a, b) => b.stackIndex - a.stackIndex);

  if (moversAtSource.length === 0) {
    return { nextCheckers: checkers, stepRecord: null };
  }

  const movingChecker = moversAtSource[0];
  let nextCheckers = checkers.map((c) => ({ ...c }));
  let hitOpponentCheckerId: number | null = null;

  if (typeof toLoc === 'number') {
    const oppOnDest = nextCheckers.filter(
      (c) => c.location === toLoc && c.isLight !== isLight
    );
    if (oppOnDest.length === 1) {
      const oppChecker = oppOnDest[0];
      hitOpponentCheckerId = oppChecker.id;
      const oppBarLoc: BoardLocation = oppChecker.isLight
        ? 'bar-light'
        : 'bar-dark';
      const newBarStackIdx = nextCheckers.filter(
        (c) => c.location === oppBarLoc && c.id !== oppChecker.id
      ).length;
      nextCheckers = nextCheckers.map((c) =>
        c.id === oppChecker.id
          ? { ...c, location: oppBarLoc, stackIndex: newBarStackIdx }
          : c
      );
    }
  }

  const newDestStackIdx = nextCheckers.filter(
    (c) => c.location === toLoc && c.id !== movingChecker.id
  ).length;

  nextCheckers = nextCheckers.map((c) =>
    c.id === movingChecker.id
      ? { ...c, location: toLoc, stackIndex: newDestStackIdx }
      : c
  );

  // Re-normalize source stack indices
  const remainingAtSource = nextCheckers
    .filter((c) => c.location === fromLoc)
    .sort((a, b) => a.stackIndex - b.stackIndex);
  remainingAtSource.forEach((c, idx) => {
    c.stackIndex = idx;
  });

  return {
    nextCheckers,
    stepRecord: {
      checkerId: movingChecker.id,
      fromLoc,
      toLoc,
      dieUsed,
      hitOpponentCheckerId,
    },
  };
}

/**
 * Generates all unique legal single-step moves across the entire board for one die value.
 */
function getAllSingleStepsForDie(
  checkers: CheckerState3D[],
  isLight: boolean,
  die: number
): { fromLoc: BoardLocation; toLoc: BoardLocation; dieUsed: number }[] {
  const barLoc: BoardLocation = isLight ? 'bar-light' : 'bar-dark';
  const candidateLocations = new Set<BoardLocation>();

  for (const c of checkers) {
    if (c.isLight === isLight && c.location !== 'off-light' && c.location !== 'off-dark') {
      candidateLocations.add(c.location);
    }
  }

  if (candidateLocations.has(barLoc)) {
    const move = getSingleDieMoveFromLocation(checkers, isLight, barLoc, die);
    return move ? [{ fromLoc: barLoc, toLoc: move.toLoc, dieUsed: die }] : [];
  }

  const results: { fromLoc: BoardLocation; toLoc: BoardLocation; dieUsed: number }[] = [];
  for (const loc of candidateLocations) {
    const move = getSingleDieMoveFromLocation(checkers, isLight, loc, die);
    if (move) {
      results.push({ fromLoc: loc, toLoc: move.toLoc, dieUsed: die });
    }
  }
  return results;
}

/**
 * WBGF Compulsory Maximum Dice & Higher Die Rule:
 * Explores the legal move tree for `remainingDice` and returns only those initial steps
 * `(fromLoc, toLoc, dieUsed)` that lead to the maximum number of dice played (and highest die if only 1 can be played).
 */
export function getWBGFLegalFirstSteps(
  checkers: CheckerState3D[],
  isLight: boolean,
  remainingDice: number[]
): { fromLoc: BoardLocation; toLoc: BoardLocation; dieUsed: number }[] {
  if (remainingDice.length === 0) return [];

  const uniqueDice = Array.from(new Set(remainingDice));
  interface FirstStepCandidate {
    step: { fromLoc: BoardLocation; toLoc: BoardLocation; dieUsed: number };
    maxDiceUsedInBranch: number;
    maxPipSumInBranch: number;
  }

  const candidates: FirstStepCandidate[] = [];

  function computeMaxDepth(
    state: CheckerState3D[],
    diceLeft: number[]
  ): { maxDepth: number; maxPipSum: number } {
    if (diceLeft.length === 0) return { maxDepth: 0, maxPipSum: 0 };
    const uniq = Array.from(new Set(diceLeft));
    let bestDepth = 0;
    let bestPipSum = 0;

    for (const d of uniq) {
      const steps = getAllSingleStepsForDie(state, isLight, d);
      if (steps.length === 0) continue;

      const idx = diceLeft.indexOf(d);
      const nextDice = [...diceLeft];
      nextDice.splice(idx, 1);

      for (const st of steps) {
        const { nextCheckers } = simulateSingleStepMove(
          state,
          isLight,
          st.fromLoc,
          st.toLoc,
          d
        );
        const sub = computeMaxDepth(nextCheckers, nextDice);
        const totalD = 1 + sub.maxDepth;
        const totalPips = d + sub.maxPipSum;
        if (
          totalD > bestDepth ||
          (totalD === bestDepth && totalPips > bestPipSum)
        ) {
          bestDepth = totalD;
          bestPipSum = totalPips;
        }
      }
    }

    return { maxDepth: bestDepth, maxPipSum: bestPipSum };
  }

  let globalMaxDiceUsed = 0;
  let globalMaxPipSum = 0;

  for (const d of uniqueDice) {
    const firstSteps = getAllSingleStepsForDie(checkers, isLight, d);
    const idx = remainingDice.indexOf(d);
    const nextDice = [...remainingDice];
    nextDice.splice(idx, 1);

    for (const st of firstSteps) {
      const { nextCheckers } = simulateSingleStepMove(
        checkers,
        isLight,
        st.fromLoc,
        st.toLoc,
        d
      );
      const sub =
        nextDice.length > 0 && nextDice.length <= 2
          ? computeMaxDepth(nextCheckers, nextDice)
          : { maxDepth: 0, maxPipSum: 0 };
      const maxDiceUsedInBranch = 1 + sub.maxDepth;
      const maxPipSumInBranch = d + sub.maxPipSum;

      if (maxDiceUsedInBranch > globalMaxDiceUsed) {
        globalMaxDiceUsed = maxDiceUsedInBranch;
        globalMaxPipSum = maxPipSumInBranch;
      } else if (
        maxDiceUsedInBranch === globalMaxDiceUsed &&
        maxPipSumInBranch > globalMaxPipSum
      ) {
        globalMaxPipSum = maxPipSumInBranch;
      }

      candidates.push({
        step: st,
        maxDiceUsedInBranch,
        maxPipSumInBranch,
      });
    }
  }

  return candidates
    .filter((c) => {
      if (c.maxDiceUsedInBranch < globalMaxDiceUsed) return false;
      // WBGF Higher-Die Rule: if only 1 die can be played out of 2 different dice, must play the higher die
      if (
        globalMaxDiceUsed === 1 &&
        uniqueDice.length === 2 &&
        c.maxPipSumInBranch < globalMaxPipSum
      ) {
        return false;
      }
      return true;
    })
    .map((c) => c.step);
}

/**
 * Returns both Single-Die moves AND Combined Multi-Die moves (1-tap compound moves)
 * for a selected checker at `fromLoc`, respecting the WBGF Compulsory rule and preferred dice order!
 */
export function getSelectableMovesForLocation(
  checkers: CheckerState3D[],
  isLight: boolean,
  fromLoc: BoardLocation,
  remainingDice: number[]
): SelectableDestinationMove[] {
  if (remainingDice.length === 0) return [];

  const legalFirstSteps = getWBGFLegalFirstSteps(
    checkers,
    isLight,
    remainingDice
  ).filter((s) => s.fromLoc === fromLoc);

  if (legalFirstSteps.length === 0) return [];

  const destinations = new Map<BoardLocation, SelectableDestinationMove>();

  // 1. Add all single-die moves from `fromLoc` (prioritizing the order in `remainingDice`)
  for (const step1 of legalFirstSteps) {
    if (!destinations.has(step1.toLoc)) {
      destinations.set(step1.toLoc, {
        fromLoc,
        toLoc: step1.toLoc,
        steps: [step1],
        isCombinedMove: false,
        totalPipsMoved: step1.dieUsed,
      });
    }
  }

  // 2. Build Combined Multi-Die Moves (chains of 2, 3, or 4 dice with the same checker!)
  for (const step1 of legalFirstSteps) {
    if (step1.toLoc === 'off-light' || step1.toLoc === 'off-dark') continue;

    let currState = simulateSingleStepMove(
      checkers,
      isLight,
      step1.fromLoc,
      step1.toLoc,
      step1.dieUsed
    ).nextCheckers;

    const diceLeft = [...remainingDice];
    const usedIdx = diceLeft.indexOf(step1.dieUsed);
    if (usedIdx === -1) continue;
    diceLeft.splice(usedIdx, 1);

    const chainSteps = [step1];
    let currLoc: BoardLocation = step1.toLoc;
    let totalPips = step1.dieUsed;

    while (diceLeft.length > 0) {
      // Note: if the checker was on the bar AND there is still another checker on the bar,
      // the same checker cannot continue moving until all bar checkers have entered!
      const barLoc: BoardLocation = isLight ? 'bar-light' : 'bar-dark';
      const stillOnBar = currState.some((c) => c.location === barLoc);
      if (stillOnBar) break;

      const nextDie = diceLeft[0];
      const nextMove = getSingleDieMoveFromLocation(
        currState,
        isLight,
        currLoc,
        nextDie
      );
      if (!nextMove) break;

      const stepN: {
        fromLoc: BoardLocation;
        toLoc: BoardLocation;
        dieUsed: number;
      } = {
        fromLoc: currLoc,
        toLoc: nextMove.toLoc,
        dieUsed: nextDie,
      };
      chainSteps.push(stepN);
      totalPips += nextDie;
      diceLeft.shift();

      if (!destinations.has(stepN.toLoc)) {
        destinations.set(stepN.toLoc, {
          fromLoc,
          toLoc: stepN.toLoc,
          steps: [...chainSteps],
          isCombinedMove: true,
          totalPipsMoved: totalPips,
        });
      }

      currState = simulateSingleStepMove(
        currState,
        isLight,
        stepN.fromLoc,
        stepN.toLoc,
        stepN.dieUsed
      ).nextCheckers;
      currLoc = stepN.toLoc;

      if (currLoc === 'off-light' || currLoc === 'off-dark') break;
    }
  }

  return Array.from(destinations.values());
}

/**
 * Checks if `isLight` has any legal move anywhere on the board.
 */
export function hasAnyLegalMoveOnBoard(
  checkers: CheckerState3D[],
  isLight: boolean,
  remainingDice: number[]
): boolean {
  return getWBGFLegalFirstSteps(checkers, isLight, remainingDice).length > 0;
}

/**
 * Evaluates a completed match for Single Win (1x), Gammon / مارس (2x), or Backgammon / سیاه‌مارس (3x),
 * multiplied by the active Doubling Cube value.
 */
export function evaluateMatchVictoryOutcome(
  checkers: CheckerState3D[],
  winner: 'light' | 'dark',
  cubeValue: number,
  baseCoinStake = 100
): MatchVictoryOutcome {
  const loserIsLight = winner === 'dark';
  const loserOffLoc: BoardLocation = loserIsLight ? 'off-light' : 'off-dark';
  const loserBarLoc: BoardLocation = loserIsLight ? 'bar-light' : 'bar-dark';

  const loserCheckers = checkers.filter((c) => c.isLight === loserIsLight);
  const loserBorneOff = loserCheckers.filter(
    (c) => c.location === loserOffLoc
  ).length;

  let victoryType: VictoryType = 'single';
  let baseMultiplier: 1 | 2 | 3 = 1;
  let victoryLabel = 'NORMAL VICTORY (1X)';

  if (loserBorneOff === 0) {
    // Check if any loser checker is on the bar or inside the winner's home board
    const inWinnerHomeOrBar = loserCheckers.some((c) => {
      if (c.location === loserBarLoc) return true;
      if (typeof c.location !== 'number') return false;
      // Winner's home board is 1..6 if winner is Light, or 19..24 if winner is Dark
      return winner === 'light'
        ? c.location >= 1 && c.location <= 6
        : c.location >= 19 && c.location <= 24;
    });

    if (inWinnerHomeOrBar) {
      victoryType = 'backgammon';
      baseMultiplier = 3;
      victoryLabel = 'BACKGAMMON — MARS SIAH (3X)';
    } else {
      victoryType = 'gammon';
      baseMultiplier = 2;
      victoryLabel = 'GAMMON — MARS (2X)';
    }
  }

  const effectiveCube = Math.max(1, cubeValue);
  const totalMultiplier = baseMultiplier * effectiveCube;

  return {
    winner,
    victoryType,
    victoryLabel,
    baseMultiplier,
    cubeValue: effectiveCube,
    totalMultiplier,
    coinsAwarded: baseCoinStake * totalMultiplier,
  };
}
