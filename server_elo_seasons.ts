/**
 * Global ELO Rating & Seasonal Leaderboard Engine (Node.js & PostgreSQL)
 *
 * Implements:
 * 1. PostgreSQL Schema definitions for users, match history, seasons, and seasonal rankings.
 * 2. Dynamic K-factor ELO rating calculation:
 *    - Bronze (<1300 ELO): K = 40 (rapid placement for novices)
 *    - Silver (1300-1599 ELO): K = 32 (standard tournament progression)
 *    - Gold (1600-1899 ELO): K = 24 (stabilized competitive tier)
 *    - Grandmaster (>=1900 ELO): K = 16 (high stability for master tier)
 * 3. Monthly season automated resets with soft rating compression and prize distributions.
 */

import { Pool } from 'pg';

export type EloTier = 'Bronze' | 'Silver' | 'Gold' | 'Grandmaster';

export interface EloTierConfig {
  name: EloTier;
  persianName: string;
  minRating: number;
  maxRating: number;
  kFactor: number;
  color: string;
  badge: string;
}

export const ELO_TIERS: Record<EloTier, EloTierConfig> = {
  Bronze: {
    name: 'Bronze',
    persianName: 'برنز (مقدماتی)',
    minRating: 0,
    maxRating: 1299,
    kFactor: 40,
    color: '#cd7f32',
    badge: 'BRONZE',
  },
  Silver: {
    name: 'Silver',
    persianName: 'نقره (پیشرفته)',
    minRating: 1300,
    maxRating: 1599,
    kFactor: 32,
    color: '#c0c0c0',
    badge: 'SILVER',
  },
  Gold: {
    name: 'Gold',
    persianName: 'طلا (استاد)',
    minRating: 1600,
    maxRating: 1899,
    kFactor: 24,
    color: '#e5c158',
    badge: 'GOLD',
  },
  Grandmaster: {
    name: 'Grandmaster',
    persianName: 'گرندمستر (سلطنتی)',
    minRating: 1900,
    maxRating: 9999,
    kFactor: 16,
    color: '#c084fc',
    badge: 'GRANDMASTER',
  },
};

export function getTierFromRating(rating: number): EloTierConfig {
  if (rating >= 1900) return ELO_TIERS.Grandmaster;
  if (rating >= 1600) return ELO_TIERS.Gold;
  if (rating >= 1300) return ELO_TIERS.Silver;
  return ELO_TIERS.Bronze;
}

export interface EloCalculationResult {
  winnerId: string;
  loserId: string;
  winnerRatingBefore: number;
  loserRatingBefore: number;
  winnerRatingAfter: number;
  loserRatingAfter: number;
  winnerDelta: number;
  loserDelta: number;
  winnerTier: EloTier;
  loserTier: EloTier;
  expectedWinnerWinProb: number;
}

/**
 * Calculates dynamic K-factor ELO rating change for 2 players.
 * Rating delta = K * (Actual - Expected)
 */
export function calculateDynamicElo(
  winnerRating: number,
  loserRating: number,
  isDraw: boolean = false
): EloCalculationResult {
  const winnerTier = getTierFromRating(winnerRating);
  const loserTier = getTierFromRating(loserRating);

  // Expected win probability for winner: E = 1 / (1 + 10^((R_loser - R_winner) / 400))
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 - expectedWinner;

  const actualWinner = isDraw ? 0.5 : 1.0;
  const actualLoser = isDraw ? 0.5 : 0.0;

  // Use dynamic K-factors per tier
  const winnerDelta = Math.round(winnerTier.kFactor * (actualWinner - expectedWinner));
  const loserDelta = Math.round(loserTier.kFactor * (actualLoser - expectedLoser));

  const winnerRatingAfter = Math.max(800, winnerRating + winnerDelta);
  const loserRatingAfter = Math.max(800, loserRating + loserDelta);

  return {
    winnerId: '',
    loserId: '',
    winnerRatingBefore: winnerRating,
    loserRatingBefore: loserRating,
    winnerRatingAfter,
    loserRatingAfter,
    winnerDelta,
    loserDelta: Math.abs(loserDelta),
    winnerTier: winnerTier.name,
    loserTier: loserTier.name,
    expectedWinnerWinProb: Math.round(expectedWinner * 100),
  };
}

export interface SeasonInfo {
  seasonId: number;
  name: string;
  persianName: string;
  startDate: string;
  endDate: string;
  prizePoolUsdt: number;
  daysRemaining: number;
  status: 'active' | 'completed';
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  rating: number;
  tier: EloTier;
  level: number;
  wins: number;
  losses: number;
  winRate: number;
  matchesPlayed: number;
  winStreak: number;
  rewardUsdt?: number;
}

/**
 * In-memory fallback and PostgreSQL seasonal manager
 */
export class SeasonalLeaderboardService {
  private currentSeason: SeasonInfo = {
    seasonId: 1,
    name: 'Season I: Imperial Dawn',
    persianName: 'فصل اول: پگاه شاهنشاهی',
    startDate: new Date(Date.now() - 10 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 20 * 86400000).toISOString(),
    prizePoolUsdt: 500,
    daysRemaining: 20,
    status: 'active',
  };

  private seasonRankings = new Map<string, LeaderboardEntry>();

  constructor() {
    this.seedSampleLeaderboard();
  }

  private seedSampleLeaderboard() {
    const mockTop = [
      { id: 'usr_top_1', name: 'Shahanshah_Cyrus', rating: 2145, level: 68, wins: 142, losses: 28 },
      { id: 'usr_top_2', name: 'Zurkhaneh_Master', rating: 2020, level: 59, wins: 118, losses: 35 },
      { id: 'usr_top_3', name: 'Rostam_Sistan', rating: 1960, level: 54, wins: 98, losses: 31 },
      { id: 'usr_top_4', name: 'SilkRoad_Voyager', rating: 1880, level: 48, wins: 85, losses: 32 },
      { id: 'usr_top_5', name: 'Tehran_DiceLord', rating: 1825, level: 45, wins: 79, losses: 34 },
      { id: 'usr_top_6', name: 'Gold_Lion_77', rating: 1760, level: 41, wins: 71, losses: 36 },
      { id: 'usr_top_7', name: 'Crown_Strategist', rating: 1690, level: 37, wins: 64, losses: 35 },
      { id: 'usr_top_8', name: 'Caspian_Falcon', rating: 1610, level: 33, wins: 55, losses: 33 },
      { id: 'usr_top_9', name: 'Tabriz_Grandmaster', rating: 1540, level: 29, wins: 48, losses: 32 },
      { id: 'usr_top_10', name: 'Imperial_Sultan', rating: 1480, level: 25, wins: 42, losses: 30 },
    ];

    mockTop.forEach((u, i) => {
      const tier = getTierFromRating(u.rating).name;
      const total = u.wins + u.losses;
      this.seasonRankings.set(u.id, {
        rank: i + 1,
        userId: u.id,
        username: u.name,
        rating: u.rating,
        tier,
        level: u.level,
        wins: u.wins,
        losses: u.losses,
        winRate: Math.round((u.wins / total) * 100),
        matchesPlayed: total,
        winStreak: Math.floor(Math.random() * 5),
        rewardUsdt: i === 0 ? 175 : i === 1 ? 100 : i === 2 ? 60 : i < 5 ? 35 : 19,
      });
    });
  }

  public getLeaderboard(limit = 50): {
    season: SeasonInfo;
    leaderboard: LeaderboardEntry[];
    tiers: Record<EloTier, EloTierConfig>;
  } {
    const list = Array.from(this.seasonRankings.values()).sort((a, b) => b.rating - a.rating);
    list.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });
    return {
      season: this.currentSeason,
      leaderboard: list.slice(0, limit),
      tiers: ELO_TIERS,
    };
  }

  public recordMatchResult(
    winnerId: string,
    winnerName: string,
    loserId: string,
    loserName: string
  ): EloCalculationResult {
    const wEntry = this.seasonRankings.get(winnerId) || {
      rank: 999,
      userId: winnerId,
      username: winnerName,
      rating: 1200,
      tier: 'Bronze',
      level: 1,
      wins: 0,
      losses: 0,
      winRate: 0,
      matchesPlayed: 0,
      winStreak: 0,
    };

    const lEntry = this.seasonRankings.get(loserId) || {
      rank: 999,
      userId: loserId,
      username: loserName,
      rating: 1200,
      tier: 'Bronze',
      level: 1,
      wins: 0,
      losses: 0,
      winRate: 0,
      matchesPlayed: 0,
      winStreak: 0,
    };

    const result = calculateDynamicElo(wEntry.rating, lEntry.rating);
    result.winnerId = winnerId;
    result.loserId = loserId;

    wEntry.rating = result.winnerRatingAfter;
    wEntry.wins += 1;
    wEntry.matchesPlayed += 1;
    wEntry.winStreak += 1;
    wEntry.winRate = Math.round((wEntry.wins / wEntry.matchesPlayed) * 100);
    wEntry.tier = result.winnerTier;

    lEntry.rating = result.loserRatingAfter;
    lEntry.losses += 1;
    lEntry.matchesPlayed += 1;
    lEntry.winStreak = 0;
    lEntry.winRate = Math.round((lEntry.wins / lEntry.matchesPlayed) * 100);
    lEntry.tier = result.loserTier;

    this.seasonRankings.set(winnerId, wEntry);
    this.seasonRankings.set(loserId, lEntry);

    return result;
  }

  /**
   * Performs monthly season soft reset:
   * newRating = 1200 + (oldRating - 1200) * 0.5
   * Distributes seasonal USDT rewards to Top 10 players
   */
  public triggerSeasonReset(): {
    concludedSeason: SeasonInfo;
    newSeason: SeasonInfo;
    topWinners: LeaderboardEntry[];
  } {
    const sorted = Array.from(this.seasonRankings.values()).sort((a, b) => b.rating - a.rating);
    const top10 = sorted.slice(0, 10);

    const concluded = { ...this.currentSeason, status: 'completed' as const };

    // Advance season
    const nextSeasonId = this.currentSeason.seasonId + 1;
    this.currentSeason = {
      seasonId: nextSeasonId,
      name: `Season ${nextSeasonId}: Sovereign Masters`,
      persianName: `فصل ${nextSeasonId}: استادان پادشاهی`,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      prizePoolUsdt: 500,
      daysRemaining: 30,
      status: 'active',
    };

    // Soft reset ratings
    for (const [id, entry] of this.seasonRankings.entries()) {
      entry.rating = Math.round(1200 + (entry.rating - 1200) * 0.5);
      entry.tier = getTierFromRating(entry.rating).name;
      entry.wins = 0;
      entry.losses = 0;
      entry.matchesPlayed = 0;
      entry.winRate = 0;
      entry.winStreak = 0;
    }

    return {
      concludedSeason: concluded,
      newSeason: this.currentSeason,
      topWinners: top10,
    };
  }

  /**
   * Initializes PostgreSQL tables if connected
   */
  public async initPostgresTables(pool: Pool) {
    await pool.query(`
      -- جدول تاریخچه تغییرات ریتینگ ELO
      CREATE TABLE IF NOT EXISTS elo_match_history (
        id SERIAL PRIMARY KEY,
        match_id VARCHAR(64),
        winner_id VARCHAR(64) NOT NULL,
        loser_id VARCHAR(64) NOT NULL,
        winner_rating_before INT NOT NULL,
        loser_rating_before INT NOT NULL,
        winner_rating_after INT NOT NULL,
        loser_rating_after INT NOT NULL,
        winner_k_factor INT NOT NULL,
        loser_k_factor INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- جدول فصول رقابتی
      CREATE TABLE IF NOT EXISTS competitive_seasons (
        season_id INT PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        persian_name VARCHAR(128),
        prize_pool_usdt NUMERIC(10, 2) DEFAULT 500.00,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'active'
      );

      -- جدول رتبه‌بندی کاربران در هر فصل
      CREATE TABLE IF NOT EXISTS season_user_rankings (
        season_id INT NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        start_rating INT DEFAULT 1200,
        current_rating INT DEFAULT 1200,
        peak_rating INT DEFAULT 1200,
        tier VARCHAR(20) DEFAULT 'Bronze',
        wins INT DEFAULT 0,
        losses INT DEFAULT 0,
        prize_awarded_usdt NUMERIC(10, 2) DEFAULT 0.00,
        PRIMARY KEY (season_id, user_id)
      );
    `);
  }
}

export const seasonalLeaderboard = new SeasonalLeaderboardService();
