export type TournamentTierId = 'swiss_5' | 'swiss_10';

export interface TournamentTierConfig {
  id: TournamentTierId;
  title: string;
  persianTitle: string;
  entryFeeUsdt: number;
  maxParticipants: number;
  totalRounds: number;
  targetPointsSwiss: number;
  targetPointsQF: number;
  targetPointsSF: number;
  targetPointsFinal: number;
}

export const TOURNAMENT_TIERS: Record<TournamentTierId, TournamentTierConfig> = {
  swiss_5: {
    id: 'swiss_5',
    title: '5 USDT Swiss Cup',
    persianTitle: 'جام ۵ تتری سوئیسی',
    entryFeeUsdt: 5,
    maxParticipants: 32,
    totalRounds: 5,
    targetPointsSwiss: 5,
    targetPointsQF: 7,
    targetPointsSF: 9,
    targetPointsFinal: 11,
  },
  swiss_10: {
    id: 'swiss_10',
    title: '10 USDT Royal Masters',
    persianTitle: 'جام ۱۰ تتری رویال مسترز',
    entryFeeUsdt: 10,
    maxParticipants: 32,
    totalRounds: 5,
    targetPointsSwiss: 5,
    targetPointsQF: 7,
    targetPointsSF: 9,
    targetPointsFinal: 11,
  },
};

export interface TournamentParticipant {
  userId: string;
  username: string;
  rating: number;
  score?: number;
  swissPoints: number;
  buchholz: number;
  matchesPlayed: number;
  matchPointsWon: number;
  matchPointsConceded: number;
  eliminated?: boolean;
}

export interface TournamentMatch {
  matchId: string;
  tournamentId: string;
  round: number;
  roundIndex?: number;
  stage: 'swiss' | 'quarter_final' | 'semi_final' | 'final';
  player1: TournamentParticipant;
  player2: TournamentParticipant;
  targetPoints: number;
  winnerUserId?: string;
  winnerId?: string;
  isCompleted: boolean;
  status: 'scheduled' | 'in_progress' | 'completed';
  isCrawford?: boolean;
  isCrawfordGame?: boolean;
  doublingCubeValue?: number;
  scoreP1: number;
  scoreP2: number;
}

export interface TournamentState {
  id: string;
  tierId: TournamentTierId;
  config: TournamentTierConfig;
  status: 'registering' | 'swiss_stage' | 'knockout_stage' | 'completed';
  currentRound: number;
  participants: TournamentParticipant[];
  swissMatches: Record<number, TournamentMatch[]>;
  bracket: any;
  totalCollectedUsdt: number;
  platformFeeUsdt: number;
  prizePoolUsdt: number;
  prizesPaid: boolean;
  createdAt: number;
  winners?: {
    rank: number;
    userId: string;
    username: string;
    prizeUsdt: number;
  }[];
}
