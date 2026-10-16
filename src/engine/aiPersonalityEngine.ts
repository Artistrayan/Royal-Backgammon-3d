import {
  CheckerState3D,
  BoardLocation,
} from '../libgdx/Gdx3DEngine';
import {
  getWBGFLegalFirstSteps,
  calculatePipCount,
} from './backgammonRuleEngine';
import { chooseBestGrandmasterMoveStep } from './grandmasterAI';

export type AIDifficulty = 'beginner' | 'novice' | 'intermediate' | 'grandmaster';

export interface AIDifficultyProfile {
  id: AIDifficulty;
  name: string;
  persianName: string;
  badge: string;
  themeColor: string;
  errorRate: string;
  moveDelayMs: number;
  persianTagline: string;
  persianDescription: string;
}

export const AI_DIFFICULTY_PROFILES: Record<AIDifficulty, AIDifficultyProfile> = {
  beginner: {
    id: 'beginner',
    name: 'BEGINNER',
    persianName: 'مبتدی (بی‌تجربه)',
    badge: 'BEGINNER 65%',
    themeColor: '#f87171',
    errorRate: '60-70%',
    moveDelayMs: 350,
    persianTagline: 'بازی تصادفی با خطاهای مکرر، عجولانه و بدون محاسبه عمیق',
    persianDescription:
      'مهره‌ها را به صورت تصادفی و ساده حرکت می‌دهد. بیش از ۶۰ تا ۷۰ درصد مواقع اشتباهات فاحش تاکتیکی می‌کند، مهره‌های تک (Blot) بی‌دلیل بر جای می‌گذارد و هرگز کیوب دوبل را قبول نمی‌کند.',
  },
  novice: {
    id: 'novice',
    name: 'NOVICE',
    persianName: 'نوآموز',
    badge: 'NOVICE 45%',
    themeColor: '#fb923c',
    errorRate: '40-50%',
    moveDelayMs: 500,
    persianTagline: 'آشنایی سطحی با زدن مهره و بردن، اما اشتباهات پوزیسیونی زیاد',
    persianDescription:
      'اصول زدن مهره و بردن به خانه را بلد است اما در موقعیت‌های پیچیده دچار اشتباهات ۴۰-۵۰ درصدی می‌شود و ریسک‌ها را به درستی تشخیص نمی‌دهد.',
  },
  intermediate: {
    id: 'intermediate',
    name: 'INTERMEDIATE',
    persianName: 'متوسط',
    badge: 'INTERMEDIATE 30%',
    themeColor: '#fbbf24',
    errorRate: '25-35%',
    moveDelayMs: 650,
    persianTagline: 'آشنا با خانه بستن و سدسازی، خطاهای پوزیسیونی گاه‌به‌گاه',
    persianDescription:
      'استراتژی‌های پایه‌ای ساختن خانه و مسدودسازی را می‌داند اما حدود ۲۵ تا ۳۵ درصد در بازی‌های حساس و سرعت حرکت اشتباه می‌کند.',
  },
  grandmaster: {
    id: 'grandmaster',
    name: 'ROYAL GRANDMASTER',
    persianName: 'استاد بزرگ رویال',
    badge: 'GM AI 0%',
    themeColor: '#52f29c',
    errorRate: '0-5%',
    moveDelayMs: 800,
    persianTagline: 'محاسبه عمیق دو لایه (2-Ply) طبق استانداردهای مسابقات جهانی WBGF',
    persianDescription:
      'محاسبه دقیق ارزش پیپ، ساخت سدهای ۶ تایی و مدیریت ریاضی کیوب دوبل بر اساس آستانه ۲۳٪ برد.',
  },
};

export function getAIDelays(difficulty: AIDifficulty): { rollDelayMs: number; moveDelayMs: number } {
  switch (difficulty) {
    case 'beginner':
      return { rollDelayMs: 250, moveDelayMs: 350 };
    case 'novice':
      return { rollDelayMs: 350, moveDelayMs: 500 };
    case 'intermediate':
      return { rollDelayMs: 450, moveDelayMs: 650 };
    case 'grandmaster':
    default:
      return { rollDelayMs: 600, moveDelayMs: 850 };
  }
}

export function chooseAIMoveStep(
  checkers: CheckerState3D[],
  isLight: boolean,
  remainingDice: number[],
  difficulty: AIDifficulty = 'intermediate'
): { fromLoc: BoardLocation; toLoc: BoardLocation; dieUsed: number } | null {
  const legalSteps = getWBGFLegalFirstSteps(checkers, isLight, remainingDice);
  if (legalSteps.length === 0) return null;

  if (difficulty === 'grandmaster') {
    return chooseBestGrandmasterMoveStep(checkers, isLight, remainingDice);
  }

  // Determine error probability based on selected profile
  let errorProb = 0.3;
  if (difficulty === 'beginner') errorProb = 0.65;
  else if (difficulty === 'novice') errorProb = 0.45;
  else if (difficulty === 'intermediate') errorProb = 0.30;

  const isMistake = Math.random() < errorProb;

  if (isMistake) {
    // Beginner: prefers completely random or simplest moves
    const randomIndex = Math.floor(Math.random() * legalSteps.length);
    return legalSteps[randomIndex];
  }

  // Otherwise make a decent or best move
  return chooseBestGrandmasterMoveStep(checkers, isLight, remainingDice);
}

export function evaluateAIDoubleResponse(
  checkers: CheckerState3D[],
  isLight: boolean,
  difficulty: AIDifficulty = 'intermediate'
): { take: boolean; reason?: string } {
  if (difficulty === 'beginner') {
    // Beginner drops double 85% of time
    const take = Math.random() < 0.15;
    return { take, reason: take ? 'Careless Take' : 'Scared Drop' };
  }
  if (difficulty === 'novice') {
    const take = Math.random() < 0.4;
    return { take, reason: take ? 'Novice Gamble' : 'Positional Drop' };
  }
  if (difficulty === 'intermediate') {
    const take = Math.random() < 0.6;
    return { take, reason: take ? 'Reasonable Take' : 'Calculated Drop' };
  }
  // Grandmaster calculation
  const myPips = calculatePipCount(checkers, isLight);
  const oppPips = calculatePipCount(checkers, !isLight);
  const take = myPips <= oppPips + 12;
  return { take, reason: take ? 'Mathematical Equity Take' : 'Unfavorable Race Drop' };
}
