/**
 * Decoupled Backgammon Game Variants Architecture
 *
 * Supports:
 * 1. Standard Backgammon (تخته‌نرد استاندارد بین‌المللی)
 * 2. Narde / Long Backgammon (نرد لانگ / تخته طولانی روسی و خاورمیانه)
 * 3. Hypergammon (هایپرگامون - ۳ مهره‌ای پرهیجان)
 *
 * Plugs dynamically into rule validation and 3D board state without altering Three.js render loop.
 */

import { BoardLocation, CheckerState3D } from '../libgdx/Gdx3DEngine';

export type GameVariantId = 'standard' | 'narde' | 'hypergammon';

export interface GameVariantConfig {
  id: GameVariantId;
  name: string;
  persianName: string;
  tagline: string;
  checkersPerPlayer: number;
  allowHitting: boolean;
  allowDoublingCube: boolean;
  sameDirectionMovement: boolean;
  maxCheckersFromHeadPerTurn?: number;
  initialCheckersFactory: () => CheckerState3D[];
  description: string;
  persianDescription: string;
}

/**
 * 1. Standard Backgammon Initial State (15 checkers per player)
 * Light moves 24 -> 1 (Home 1..6)
 * Dark moves 1 -> 24 (Home 19..24)
 */
export function createStandardInitialCheckers(): CheckerState3D[] {
  const checkers: CheckerState3D[] = [];
  let idCounter = 1;

  const addCheckers = (isLight: boolean, location: BoardLocation, count: number) => {
    for (let i = 0; i < count; i++) {
      checkers.push({
        id: idCounter++,
        isLight,
        location,
        stackIndex: i,
      });
    }
  };

  // Standard WBGF Setup:
  // Light (Gold/White): 2 on pt 24, 5 on pt 13, 3 on pt 8, 5 on pt 6
  addCheckers(true, 24, 2);
  addCheckers(true, 13, 5);
  addCheckers(true, 8, 3);
  addCheckers(true, 6, 5);

  // Dark (Silver/Black): 2 on pt 1, 5 on pt 12, 3 on pt 17, 5 on pt 19
  addCheckers(false, 1, 2);
  addCheckers(false, 12, 5);
  addCheckers(false, 17, 3);
  addCheckers(false, 19, 5);

  return checkers;
}

/**
 * 2. Narde (Long Backgammon) Initial State:
 * All 15 checkers start on the "head" (point 24 for Light, point 12 for Dark)
 * Both players move in the same counter-clockwise direction!
 * No hitting allowed.
 */
export function createNardeInitialCheckers(): CheckerState3D[] {
  const checkers: CheckerState3D[] = [];
  let idCounter = 1;

  // Light's head is on point 24 (15 checkers)
  for (let i = 0; i < 15; i++) {
    checkers.push({
      id: idCounter++,
      isLight: true,
      location: 24,
      stackIndex: i,
    });
  }

  // Dark's head is on point 12 (15 checkers)
  for (let i = 0; i < 15; i++) {
    checkers.push({
      id: idCounter++,
      isLight: false,
      location: 12,
      stackIndex: i,
    });
  }

  return checkers;
}

/**
 * 3. Hypergammon Initial State:
 * Fast action with only 3 checkers per player:
 * Light: points 24, 23, 22
 * Dark: points 1, 2, 3
 */
export function createHypergammonInitialCheckers(): CheckerState3D[] {
  const checkers: CheckerState3D[] = [];
  let idCounter = 1;

  // Light Checkers
  checkers.push({ id: idCounter++, isLight: true, location: 24, stackIndex: 0 });
  checkers.push({ id: idCounter++, isLight: true, location: 23, stackIndex: 0 });
  checkers.push({ id: idCounter++, isLight: true, location: 22, stackIndex: 0 });

  // Dark Checkers
  checkers.push({ id: idCounter++, isLight: false, location: 1, stackIndex: 0 });
  checkers.push({ id: idCounter++, isLight: false, location: 2, stackIndex: 0 });
  checkers.push({ id: idCounter++, isLight: false, location: 3, stackIndex: 0 });

  return checkers;
}

export const GAME_VARIANTS: Record<GameVariantId, GameVariantConfig> = {
  standard: {
    id: 'standard',
    name: 'Standard Backgammon',
    persianName: 'تخته‌نرد کلاسیک بین‌المللی',
    tagline: 'WBGF Tournament Rules • Hitting & Doubling Cube',
    checkersPerPlayer: 15,
    allowHitting: true,
    allowDoublingCube: true,
    sameDirectionMovement: false,
    initialCheckersFactory: createStandardInitialCheckers,
    description:
      'Official World Backgammon Federation rules. Checkers move in opposite directions, single blots can be hit and sent to the bar, and doubling cube multiplies match points.',
    persianDescription:
      'قوانین رسمی مسابقات فدراسیون جهانی. جهت حرکت مهره‌ها مخالف یکدیگر است، مهره‌های تک حریف قابلیت زدن دارند و مکعب دوبرابر برای افزایش امتیاز مسابقه فعال است.',
  },
  narde: {
    id: 'narde',
    name: 'Narde (Long Backgammon)',
    persianName: 'نرد لانگ (تخته طولانی / شش‌بش)',
    tagline: 'No Hitting • Same Direction • Head Rule',
    checkersPerPlayer: 15,
    allowHitting: false,
    allowDoublingCube: false,
    sameDirectionMovement: true,
    maxCheckersFromHeadPerTurn: 1,
    initialCheckersFactory: createNardeInitialCheckers,
    description:
      'Popular Russian & Caucasian variant. Both players move in the same counter-clockwise direction. No hitting is allowed; points with even one checker are blocked. Only one checker can be moved off the head per turn.',
    persianDescription:
      'سبک بسیار محبوب در روسیه، قفقاز و آذربایجان. هر دو بازیکن در یک جهت حرکت می‌کنند، زدن مهره وجود ندارد و هر خانه‌ای که یک مهره در آن باشد مسدود است. در هر نوبت فقط یک مهره از سرخانه برداشته می‌شود.',
  },
  hypergammon: {
    id: 'hypergammon',
    name: 'Hypergammon',
    persianName: 'هایپرگامون (سرعتی ۳ مهره‌ای)',
    tagline: '3 Checkers • High Variance • Fast Action',
    checkersPerPlayer: 3,
    allowHitting: true,
    allowDoublingCube: true,
    sameDirectionMovement: false,
    initialCheckersFactory: createHypergammonInitialCheckers,
    description:
      'High-speed, explosive backgammon variant with only 3 checkers per player starting on the furthest 3 points. Games finish in 2-3 minutes with massive doubling cube drama.',
    persianDescription:
      'نسخه فوق‌العاده سریع و پرهیجان با فقط ۳ مهره برای هر بازیکن در خانه‌های ابتدایی. هر دست در کمتر از ۳ دقیقه تمام می‌شود و هیجان تاس و کیوب در بالاترین حد است.',
  },
};
