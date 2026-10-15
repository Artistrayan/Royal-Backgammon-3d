/**
 * Backgammon Professional Tournament System Types
 *
 * Swiss System + Single Elimination Knockout Finals with USDT Buy-ins & Automated Prize Escrow:
 * - Preliminary: 5 Swiss Rounds (Match to 5 points)
 * - Finals: Top 8 Single Elimination (Quarter: to 7, Semi: to 9, Final: to 11)
 * - Official Crawford Rule & Doubling Cube
 * - 85% Prize Pool, 15% Platform fee
 * - Dynamic / Automated USDT Payout: 1st (40%), 2nd (22%), 3-4th (10% ea), 5-8th (4.5% ea)
 * - Anti-Cheat, Provably Fair Dice & Live Spectator Mode
 */

export type TournamentTierId = 'swiss_5' | 'swiss_10';

export type TournamentStage =
  | 'registering'
  | 'swiss_rounds'
  | 'knockout_quarter'
  | 'knockout_semi'
  | 'knockout_final'
  | 'completed';

export interface TournamentTierConfig {
  id: TournamentTierId;
  title: string;
  persianTitle: string;
  badge: string;
  entryFeeUsdt: number;
  minLevel: number;
  maxParticipants: number;
  swissRoundsCount: number;
  swissMatchPoints: number; // 5 pts
  quarterMatchPoints: number; // 7 pts
  semiMatchPoints: number; // 9 pts
  finalMatchPoints: number; // 11 pts
  rakePercent: number; // 15%
  prizePoolPercent: number; // 85%
  distribution: {
    first: number; // 40%
    second: number; // 22%
    semi: number; // 10% each (x2 = 20%)
    quarter: number; // 4.5% each (x4 = 18%)
  };
}

export const TOURNAMENT_TIERS: Record<TournamentTierId, TournamentTierConfig> = {
  swiss_5: {
    id: 'swiss_5',
    title: 'Royal Swiss Championship',
    persianTitle: 'قهرمانی سوئیسی رویال (۵ تتر)',
    badge: 'SWISS • 5 USDT',
    entryFeeUsdt: 5,
    minLevel: 1,
    maxParticipants: 32,
    swissRoundsCount: 5,
    swissMatchPoints: 5,
    quarterMatchPoints: 7,
    semiMatchPoints: 9,
    finalMatchPoints: 11,
    rakePercent: 15,
    prizePoolPercent: 85,
    distribution: {
      first: 40,
      second: 22,
      semi: 10,
      quarter: 4.5,
    },
  },
  swiss_10: {
    id: 'swiss_10',
    title: 'Sovereign High Roller Masters',
    persianTitle: 'مسترز های‌رولر سلطنتی (۱۰ تتر)',
    badge: 'MASTERS • 10 USDT',
    entryFeeUsdt: 10,
    minLevel: 5,
    maxParticipants: 32,
    swissRoundsCount: 5,
    swissMatchPoints: 5,
    quarterMatchPoints: 7,
    semiMatchPoints: 9,
    finalMatchPoints: 11,
    rakePercent: 15,
    prizePoolPercent: 85,
    distribution: {
      first: 40,
      second: 22,
      semi: 10,
      quarter: 4.5,
    },
  },
};

export interface TournamentParticipant {
  userId: string;
  username: string;
  level: number;
  rating: number; // ELO
  entryPaidUsdt: number;
  registeredAt: number;
  swissPoints: number; // Number of match wins (1 pt per win)
  buchholz: number; // Sum of opponents' swiss points (tiebreak)
  matchPointsWon: number; // Total game pips/points scored
  matchPointsConceded: number; // Total points conceded
  matchesPlayed: number;
  opponentsPlayed: string[]; // User IDs of previous opponents (no rematches)
  status: 'active' | 'eliminated' | 'champion' | 'runner_up';
  finalRank?: number;
  prizeWonUsdt?: number;
}

export interface TournamentMatch {
  matchId: string;
  tournamentId: string;
  stage: 'swiss' | 'quarter' | 'semi' | 'final';
  roundIndex: number; // 1..5 for Swiss
  bracketSlot?: string; // 'QF1', 'QF2', 'SF1', 'FINAL', etc.
  targetPoints: number; // 5, 7, 9, 11
  player1: {
    userId: string;
    username: string;
    level: number;
    rating: number;
    score: number; // points won in this match
  };
  player2: {
    userId: string;
    username: string;
    level: number;
    rating: number;
    score: number; // points won in this match
  };
  isCrawfordGame: boolean;
  crawfordHappened: boolean;
  doublingCubeValue: number;
  doublingCubeOwner: 'center' | 'light' | 'dark';
  status: 'pending' | 'in_progress' | 'completed';
  winnerUserId: string | null;
  roomId?: string;
  spectatorCount: number;
  startedAt?: number;
  completedAt?: number;
}

export interface TournamentKnockoutBracket {
  quarters: TournamentMatch[];
  semis: TournamentMatch[];
  final: TournamentMatch;
}

export interface TournamentState {
  id: string;
  tierId: TournamentTierId;
  config: TournamentTierConfig;
  status: TournamentStage;
  currentRound: number; // 1..5 in Swiss
  participants: TournamentParticipant[];
  swissMatches: Record<number, TournamentMatch[]>; // round -> matches
  bracket: TournamentKnockoutBracket | null;
  totalCollectedUsdt: number;
  platformFeeUsdt: number;
  prizePoolUsdt: number;
  prizesPaid: boolean;
  payoutSummary?: {
    champion: { userId: string; username: string; amountUsdt: number };
    runnerUp: { userId: string; username: string; amountUsdt: number };
    semifinalists: { userId: string; username: string; amountUsdt: number }[];
    quarterfinalists: { userId: string; username: string; amountUsdt: number }[];
  };
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface SpectatorMatchFeed {
  matchId: string;
  tournamentId: string;
  player1: { id: string; username: string; score: number };
  player2: { id: string; username: string; score: number };
  targetPoints: number;
  isCrawfordGame: boolean;
  cubeValue: number;
  cubeOwner: 'center' | 'light' | 'dark';
  turn: 'light' | 'dark';
  diceValues: [number, number];
  remainingDice: number[];
  proofHash: string;
  spectatorCount: number;
}
