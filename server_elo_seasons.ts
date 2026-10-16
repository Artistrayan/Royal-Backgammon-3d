export interface SeasonalLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  rating: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Grandmaster';
  wins: number;
  losses: number;
  winRate: number;
  seasonPoints: number;
}

export class SeasonalLeaderboard {
  private currentSeason = 'Season 1 - Spring 2026';

  getDynamicKFactor(rating: number): number {
    if (rating < 1400) return 32; // Bronze
    if (rating < 1700) return 24; // Silver
    if (rating < 2000) return 16; // Gold
    return 10; // Grandmaster
  }

  calculateNewRatings(
    ratingA: number,
    ratingB: number,
    winner: 'A' | 'B'
  ): { newRatingA: number; newRatingB: number; changeA: number; changeB: number } {
    const kA = this.getDynamicKFactor(ratingA);
    const kB = this.getDynamicKFactor(ratingB);

    const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

    const actualA = winner === 'A' ? 1 : 0;
    const actualB = winner === 'B' ? 1 : 0;

    const changeA = Math.round(kA * (actualA - expectedA));
    const changeB = Math.round(kB * (actualB - expectedB));

    return {
      newRatingA: Math.max(100, ratingA + changeA),
      newRatingB: Math.max(100, ratingB + changeB),
      changeA,
      changeB,
    };
  }

  getLeaderboard(limit = 50): SeasonalLeaderboardEntry[] {
    const defaultRoster: SeasonalLeaderboardEntry[] = [
      {
        rank: 1,
        userId: 'bot-shams',
        username: 'SHAMS_GRANDMASTER',
        rating: 2340,
        tier: 'Grandmaster',
        wins: 142,
        losses: 18,
        winRate: 88.7,
        seasonPoints: 3420,
      },
      {
        rank: 2,
        userId: 'user_cyrus_88',
        username: 'CYRUS_THE_GREAT',
        rating: 2180,
        tier: 'Grandmaster',
        wins: 118,
        losses: 24,
        winRate: 83.1,
        seasonPoints: 2890,
      },
      {
        rank: 3,
        userId: 'user_aria_pro',
        username: 'ARIA_BACKGAMMON',
        rating: 1960,
        tier: 'Gold',
        wins: 95,
        losses: 32,
        winRate: 74.8,
        seasonPoints: 2150,
      },
      {
        rank: 4,
        userId: 'user_soraya',
        username: 'SORAYA_PRIME',
        rating: 1840,
        tier: 'Gold',
        wins: 82,
        losses: 36,
        winRate: 69.5,
        seasonPoints: 1780,
      },
      {
        rank: 5,
        userId: 'user_dariush',
        username: 'DARIUSH_77',
        rating: 1690,
        tier: 'Silver',
        wins: 64,
        losses: 40,
        winRate: 61.5,
        seasonPoints: 1420,
      },
      {
        rank: 6,
        userId: 'user_rostam',
        username: 'ROSTAM_CHAMP',
        rating: 1580,
        tier: 'Silver',
        wins: 52,
        losses: 44,
        winRate: 54.2,
        seasonPoints: 1190,
      },
      {
        rank: 7,
        userId: 'user_novice_ali',
        username: 'ALI_CHESSMAN',
        rating: 1350,
        tier: 'Bronze',
        wins: 34,
        losses: 48,
        winRate: 41.5,
        seasonPoints: 820,
      },
    ];

    return defaultRoster.slice(0, limit);
  }
}

export const seasonalLeaderboard = new SeasonalLeaderboard();
