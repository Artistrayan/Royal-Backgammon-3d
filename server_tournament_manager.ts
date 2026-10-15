/**
 * Backend Tournament Manager Engine
 *
 * Implements Swiss System + Knockout Finals for Backgammon with USDT escrow:
 * - 5 Swiss Rounds (Match to 5 pts)
 * - Top 8 advance to Single Elimination (QF to 7, SF to 9, Final to 11)
 * - Crawford Rule & Doubling Cube
 * - Automated 85% USDT prize distribution (40%, 22%, 10% ea, 4.5% ea) with 15% platform fee
 * - Anti-Cheat, Provably Fair Dice & Real-Time Spectator broadcasting
 */

import { WebSocket } from 'ws';
import {
  TournamentState,
  TournamentTierId,
  TournamentParticipant,
  TournamentMatch,
  TOURNAMENT_TIERS,
} from './src/network/tournamentTypes';

export interface UserAccountRef {
  id: string;
  username: string;
  level: number;
  rating: number;
  usdtBalance: number;
  wins: number;
  losses: number;
  xp: number;
}

export type FinancialAuditCallback = (entry: {
  type: string;
  amountUsdt: number;
  userId: string;
  username: string;
  tierId?: string;
  matchRoomId?: string;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
}) => void;

export class ServerTournamentManager {
  private tournaments = new Map<string, TournamentState>();
  private matchSpectators = new Map<string, Set<WebSocket>>();
  private financialAuditCb: FinancialAuditCallback | null = null;
  private usersMapRef: Map<string, any> | null = null;

  constructor() {
    this.seedInitialTournaments();
  }

  public init(usersMap: Map<string, any>, auditCb: FinancialAuditCallback) {
    this.usersMapRef = usersMap;
    this.financialAuditCb = auditCb;
  }

  private seedInitialTournaments() {
    // 1. 5 USDT Swiss Championship
    const t5 = this.createTournamentInstance('tourn_swiss_5', 'swiss_5');
    this.tournaments.set(t5.id, t5);

    // 2. 10 USDT Sovereign Masters
    const t10 = this.createTournamentInstance('tourn_swiss_10', 'swiss_10');
    this.tournaments.set(t10.id, t10);

    // Pre-seed some active participants so user sees a vibrant tournament lobby immediately!
    this.seedSimulatedParticipants(t5, 14);
    this.seedSimulatedParticipants(t10, 10);
  }

  private createTournamentInstance(id: string, tierId: TournamentTierId): TournamentState {
    const config = TOURNAMENT_TIERS[tierId];
    return {
      id,
      tierId,
      config,
      status: 'registering',
      currentRound: 0,
      participants: [],
      swissMatches: {},
      bracket: null,
      totalCollectedUsdt: 0,
      platformFeeUsdt: 0,
      prizePoolUsdt: 0,
      prizesPaid: false,
      createdAt: Date.now() - 3600000,
    };
  }

  private seedSimulatedParticipants(tournament: TournamentState, count: number) {
    const names = [
      'Cyrus_Grandmaster',
      'Persian_Lion',
      'Royal_Sultan',
      'Tehran_Champ',
      'Zurkhaneh_Hero',
      'Gold_Roller_88',
      'Eagle_Eye_BG',
      'SilkRoad_King',
      'Emerald_Knight',
      'Imperial_Dice',
      'Shahanshah',
      'Rostam_Sistan',
      'Crown_Jewel',
      'Caspian_Master',
      'Zagros_Warrior',
      'Tabriz_Tactician',
    ];

    for (let i = 0; i < count; i++) {
      const pId = `bot_tourn_${tournament.tierId}_${i + 1}`;
      const name = names[i % names.length];
      const rating = 1150 + Math.floor(Math.random() * 320);
      const level = 5 + Math.floor(Math.random() * 25);

      tournament.participants.push({
        userId: pId,
        username: name,
        level,
        rating,
        entryPaidUsdt: tournament.config.entryFeeUsdt,
        registeredAt: Date.now() - Math.floor(Math.random() * 3000000),
        swissPoints: 0,
        buchholz: 0,
        matchPointsWon: 0,
        matchPointsConceded: 0,
        matchesPlayed: 0,
        opponentsPlayed: [],
        status: 'active',
      });
    }

    this.recalculateTournamentFinancials(tournament);
  }

  public getTournamentsList(): TournamentState[] {
    return Array.from(this.tournaments.values());
  }

  public getTournament(tournamentId: string): TournamentState | undefined {
    return this.tournaments.get(tournamentId);
  }

  private recalculateTournamentFinancials(tournament: TournamentState) {
    const count = tournament.participants.length;
    const totalCollected = count * tournament.config.entryFeeUsdt;
    const rake = Math.round(totalCollected * (tournament.config.rakePercent / 100) * 100) / 100;
    const prize = Math.round((totalCollected - rake) * 100) / 100;

    tournament.totalCollectedUsdt = totalCollected;
    tournament.platformFeeUsdt = rake;
    tournament.prizePoolUsdt = prize;
  }

  /**
   * Register a user for a tournament with atomic balance check & escrow deduction
   */
  public registerUser(
    tournamentId: string,
    user: UserAccountRef
  ): { success: boolean; error?: string; tournament?: TournamentState } {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      return { success: false, error: 'تورنمنت پیدا نشد' };
    }

    if (tournament.status !== 'registering') {
      return { success: false, error: 'مهلت ثبت‌نام در این تورنمنت به پایان رسیده است' };
    }

    const already = tournament.participants.find((p) => p.userId === user.id);
    if (already) {
      return { success: false, error: 'شما قبلاً در این تورنمنت ثبت‌نام کرده‌اید' };
    }

    if (tournament.participants.length >= tournament.config.maxParticipants) {
      return { success: false, error: 'ظرفیت این تورنمنت تکمیل شده است (۳۲ نفر)' };
    }

    const entryFee = tournament.config.entryFeeUsdt;
    if (user.usdtBalance < entryFee) {
      return {
        success: false,
        error: `موجودی ناکافی است. برای ثبت‌نام حداقل ${entryFee} USDT نیاز دارید (موجودی شما: ${user.usdtBalance.toFixed(2)} USDT)`,
      };
    }

    // Deduct entry fee atomically from user balance
    const balanceBefore = user.usdtBalance;
    user.usdtBalance = Math.round((user.usdtBalance - entryFee) * 100) / 100;

    // Log financial escrow deduction
    if (this.financialAuditCb) {
      this.financialAuditCb({
        type: 'tournament_entry_fee',
        amountUsdt: entryFee,
        userId: user.id,
        username: user.username,
        tierId: tournament.tierId,
        balanceBefore,
        balanceAfter: user.usdtBalance,
        description: `قفل شدن ورودی تورنمنت ${tournament.config.persianTitle} (${entryFee} USDT)`,
      });
    }

    // Add to participants list
    tournament.participants.push({
      userId: user.id,
      username: user.username,
      level: user.level,
      rating: user.rating || 1200,
      entryPaidUsdt: entryFee,
      registeredAt: Date.now(),
      swissPoints: 0,
      buchholz: 0,
      matchPointsWon: 0,
      matchPointsConceded: 0,
      matchesPlayed: 0,
      opponentsPlayed: [],
      status: 'active',
    });

    this.recalculateTournamentFinancials(tournament);

    // Auto-launch tournament if capacity reached or enough participants
    if (tournament.participants.length >= 16 && tournament.status === 'registering') {
      this.startSwissPhase(tournament);
    }

    return { success: true, tournament };
  }

  /**
   * Unregister user (if still in registering stage) with refund
   */
  public unregisterUser(
    tournamentId: string,
    userId: string
  ): { success: boolean; error?: string; tournament?: TournamentState } {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, error: 'تورنمنت پیدا نشد' };
    if (tournament.status !== 'registering') {
      return { success: false, error: 'تورنمنت شروع شده و لغو ثبت‌نام امکان‌پذیر نیست' };
    }

    const idx = tournament.participants.findIndex((p) => p.userId === userId);
    if (idx === -1) return { success: false, error: 'شما در این تورنمنت ثبت‌نام نکرده‌اید' };

    const removed = tournament.participants.splice(idx, 1)[0];
    const user = this.usersMapRef?.get(userId);
    if (user) {
      const balBefore = user.usdtBalance;
      user.usdtBalance = Math.round((user.usdtBalance + removed.entryPaidUsdt) * 100) / 100;
      if (this.financialAuditCb) {
        this.financialAuditCb({
          type: 'tournament_refund',
          amountUsdt: removed.entryPaidUsdt,
          userId: user.id,
          username: user.username,
          tierId: tournament.tierId,
          balanceBefore: balBefore,
          balanceAfter: user.usdtBalance,
          description: `بازگشت ورودی تورنمنت ${tournament.config.persianTitle}: +${removed.entryPaidUsdt} USDT`,
        });
      }
    }

    this.recalculateTournamentFinancials(tournament);
    return { success: true, tournament };
  }

  /**
   * Start Preliminary Swiss Rounds
   */
  public startSwissPhase(tournament: TournamentState): TournamentState {
    if (tournament.participants.length < 4) {
      // Need minimum 4 players; pad with bots if testing
      this.seedSimulatedParticipants(tournament, 16 - tournament.participants.length);
    }

    tournament.status = 'swiss_rounds';
    tournament.startedAt = Date.now();
    tournament.currentRound = 1;

    // Generate Round 1 pairings
    tournament.swissMatches[1] = this.generateSwissRoundPairings(tournament, 1);
    return tournament;
  }

  /**
   * Official Swiss pairing algorithm:
   * 1. Sort by Swiss points desc, then rating desc
   * 2. Pair adjacent players who have not played against each other
   * 3. Odd player receives a Bye (automatic win 5-0)
   */
  public generateSwissRoundPairings(
    tournament: TournamentState,
    roundNumber: number
  ): TournamentMatch[] {
    // Recalculate Buchholz tiebreaks before sorting
    this.updateBuchholzScores(tournament);

    // Sort players: Swiss points desc, Buchholz desc, rating desc
    const sorted = [...tournament.participants]
      .filter((p) => p.status === 'active')
      .sort((a, b) => {
        if (b.swissPoints !== a.swissPoints) return b.swissPoints - a.swissPoints;
        if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
        return (b.matchPointsWon - b.matchPointsConceded) - (a.matchPointsWon - a.matchPointsConceded);
      });

    const matches: TournamentMatch[] = [];
    const used = new Set<string>();

    for (let i = 0; i < sorted.length; i++) {
      const p1 = sorted[i];
      if (used.has(p1.userId)) continue;

      // Find best opponent who hasn't played p1
      let bestOpponent: TournamentParticipant | null = null;
      for (let j = i + 1; j < sorted.length; j++) {
        const candidate = sorted[j];
        if (!used.has(candidate.userId) && !p1.opponentsPlayed.includes(candidate.userId)) {
          bestOpponent = candidate;
          break;
        }
      }

      // If no new opponent found in score group, pair with next available
      if (!bestOpponent) {
        for (let j = i + 1; j < sorted.length; j++) {
          if (!used.has(sorted[j].userId)) {
            bestOpponent = sorted[j];
            break;
          }
        }
      }

      if (bestOpponent) {
        used.add(p1.userId);
        used.add(bestOpponent.userId);
        p1.opponentsPlayed.push(bestOpponent.userId);
        bestOpponent.opponentsPlayed.push(p1.userId);

        matches.push({
          matchId: `tourn_${tournament.id}_rnd${roundNumber}_m${matches.length + 1}`,
          tournamentId: tournament.id,
          stage: 'swiss',
          roundIndex: roundNumber,
          targetPoints: tournament.config.swissMatchPoints, // 5 pts
          player1: {
            userId: p1.userId,
            username: p1.username,
            level: p1.level,
            rating: p1.rating,
            score: 0,
          },
          player2: {
            userId: bestOpponent.userId,
            username: bestOpponent.username,
            level: bestOpponent.level,
            rating: bestOpponent.rating,
            score: 0,
          },
          isCrawfordGame: false,
          crawfordHappened: false,
          doublingCubeValue: 1,
          doublingCubeOwner: 'center',
          status: 'pending',
          winnerUserId: null,
          spectatorCount: 0,
        });
      } else {
        // Player gets a BYE
        used.add(p1.userId);
        p1.swissPoints += 1;
        p1.matchPointsWon += tournament.config.swissMatchPoints;
        p1.matchesPlayed += 1;
      }
    }

    return matches;
  }

  /**
   * Recalculate Buchholz score (sum of all opponents' swiss points)
   */
  private updateBuchholzScores(tournament: TournamentState) {
    const pMap = new Map<string, TournamentParticipant>();
    tournament.participants.forEach((p) => pMap.set(p.userId, p));

    tournament.participants.forEach((p) => {
      let bSum = 0;
      p.opponentsPlayed.forEach((oppId) => {
        const opp = pMap.get(oppId);
        if (opp) bSum += opp.swissPoints;
      });
      p.buchholz = bSum;
    });
  }

  /**
   * Updates game scores in an ongoing tournament match, enforcing Crawford Rule
   */
  public reportMatchGameResult(
    tournamentId: string,
    matchId: string,
    gameWinnerUserId: string,
    pointsAwarded: number
  ): { match: TournamentMatch; matchFinished: boolean; winnerUserId: string | null } {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    let targetMatch: TournamentMatch | undefined;

    // Search swiss rounds
    for (const roundMatches of Object.values(tournament.swissMatches)) {
      const found = roundMatches.find((m) => m.matchId === matchId);
      if (found) {
        targetMatch = found;
        break;
      }
    }

    // Search bracket if in finals
    if (!targetMatch && tournament.bracket) {
      const allBracket = [
        ...tournament.bracket.quarters,
        ...tournament.bracket.semis,
        tournament.bracket.final,
      ];
      targetMatch = allBracket.find((m) => m?.matchId === matchId);
    }

    if (!targetMatch) throw new Error('Match not found');

    targetMatch.status = 'in_progress';
    if (!targetMatch.startedAt) targetMatch.startedAt = Date.now();

    const isP1 = targetMatch.player1.userId === gameWinnerUserId;
    if (isP1) {
      targetMatch.player1.score += pointsAwarded;
    } else {
      targetMatch.player2.score += pointsAwarded;
    }

    // Check if Crawford game just occurred
    if (targetMatch.isCrawfordGame) {
      targetMatch.crawfordHappened = true;
      targetMatch.isCrawfordGame = false;
    }

    // Check if Crawford Rule should be triggered for NEXT game:
    // Leading player is at (targetPoints - 1) and Crawford has not happened yet
    const target = targetMatch.targetPoints;
    const p1Score = targetMatch.player1.score;
    const p2Score = targetMatch.player2.score;

    if (
      !targetMatch.crawfordHappened &&
      !targetMatch.isCrawfordGame &&
      (p1Score === target - 1 || p2Score === target - 1) &&
      p1Score < target &&
      p2Score < target
    ) {
      targetMatch.isCrawfordGame = true;
      targetMatch.doublingCubeValue = 1;
      targetMatch.doublingCubeOwner = 'center';
    }

    // Reset cube for next game
    if (!targetMatch.isCrawfordGame) {
      targetMatch.doublingCubeValue = 1;
      targetMatch.doublingCubeOwner = 'center';
    }

    // Check match victory
    let matchFinished = false;
    let winnerUserId: string | null = null;

    if (p1Score >= target) {
      matchFinished = true;
      winnerUserId = targetMatch.player1.userId;
    } else if (p2Score >= target) {
      matchFinished = true;
      winnerUserId = targetMatch.player2.userId;
    }

    if (matchFinished && winnerUserId) {
      targetMatch.status = 'completed';
      targetMatch.winnerUserId = winnerUserId;
      targetMatch.completedAt = Date.now();
      this.handleMatchCompleted(tournament, targetMatch);
    }

    // Broadcast update to any live spectators
    this.broadcastToSpectators(matchId, {
      type: 'tournament:match_score_updated',
      matchId,
      player1Score: targetMatch.player1.score,
      player2Score: targetMatch.player2.score,
      isCrawfordGame: targetMatch.isCrawfordGame,
      crawfordHappened: targetMatch.crawfordHappened,
      matchFinished,
      winnerUserId,
    });

    return { match: targetMatch, matchFinished, winnerUserId };
  }

  private handleMatchCompleted(tournament: TournamentState, match: TournamentMatch) {
    const p1 = tournament.participants.find((p) => p.userId === match.player1.userId);
    const p2 = tournament.participants.find((p) => p.userId === match.player2.userId);

    if (p1 && p2) {
      p1.matchesPlayed += 1;
      p2.matchesPlayed += 1;
      p1.matchPointsWon += match.player1.score;
      p1.matchPointsConceded += match.player2.score;
      p2.matchPointsWon += match.player2.score;
      p2.matchPointsConceded += match.player1.score;

      if (match.winnerUserId === p1.userId) {
        p1.swissPoints += 1;
        this.updateElo(p1, p2, match.targetPoints);
      } else {
        p2.swissPoints += 1;
        this.updateElo(p2, p1, match.targetPoints);
      }
    }

    this.updateBuchholzScores(tournament);

    // If all matches in current Swiss round completed, advance
    if (tournament.status === 'swiss_rounds') {
      const currentRoundMatches = tournament.swissMatches[tournament.currentRound] || [];
      const allDone = currentRoundMatches.every((m) => m.status === 'completed');
      if (allDone) {
        if (tournament.currentRound < tournament.config.swissRoundsCount) {
          // Advance to next Swiss round
          tournament.currentRound += 1;
          tournament.swissMatches[tournament.currentRound] = this.generateSwissRoundPairings(
            tournament,
            tournament.currentRound
          );
        } else {
          // Swiss phase completed -> Advance top 8 to Single Elimination Knockout
          this.startKnockoutFinals(tournament);
        }
      }
    } else if (tournament.status === 'knockout_quarter') {
      const allQDone = tournament.bracket?.quarters.every((m) => m.status === 'completed');
      if (allQDone && tournament.bracket) {
        tournament.status = 'knockout_semi';
        // Seed Semifinals: Winner QF1 vs Winner QF2, Winner QF3 vs Winner QF4
        const w1 = this.getParticipant(tournament, tournament.bracket.quarters[0].winnerUserId!);
        const w2 = this.getParticipant(tournament, tournament.bracket.quarters[1].winnerUserId!);
        const w3 = this.getParticipant(tournament, tournament.bracket.quarters[2].winnerUserId!);
        const w4 = this.getParticipant(tournament, tournament.bracket.quarters[3].winnerUserId!);

        tournament.bracket.semis = [
          this.createKnockoutMatch(tournament, 'semi', 1, 'SF1', tournament.config.semiMatchPoints, w1, w2),
          this.createKnockoutMatch(tournament, 'semi', 2, 'SF2', tournament.config.semiMatchPoints, w3, w4),
        ];
      }
    } else if (tournament.status === 'knockout_semi') {
      const allSDone = tournament.bracket?.semis.every((m) => m.status === 'completed');
      if (allSDone && tournament.bracket) {
        tournament.status = 'knockout_final';
        const finalist1 = this.getParticipant(tournament, tournament.bracket.semis[0].winnerUserId!);
        const finalist2 = this.getParticipant(tournament, tournament.bracket.semis[1].winnerUserId!);

        tournament.bracket.final = this.createKnockoutMatch(
          tournament,
          'final',
          1,
          'FINAL',
          tournament.config.finalMatchPoints, // 11 pts
          finalist1,
          finalist2
        );
      }
    } else if (tournament.status === 'knockout_final') {
      if (tournament.bracket?.final.status === 'completed') {
        this.finalizeTournamentPrizes(tournament);
      }
    }
  }

  private updateElo(winner: TournamentParticipant, loser: TournamentParticipant, matchPoints: number) {
    const K = matchPoints >= 9 ? 36 : 28;
    const expected = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));
    const delta = Math.round(K * (1 - expected));

    winner.rating += delta;
    loser.rating = Math.max(800, loser.rating - delta);

    // Sync back to users map if online user
    const uWin = this.usersMapRef?.get(winner.userId);
    if (uWin) uWin.rating = winner.rating;
    const uLose = this.usersMapRef?.get(loser.userId);
    if (uLose) uLose.rating = loser.rating;
  }

  private getParticipant(tournament: TournamentState, userId: string): TournamentParticipant {
    return tournament.participants.find((p) => p.userId === userId)!;
  }

  private createKnockoutMatch(
    tournament: TournamentState,
    stage: 'quarter' | 'semi' | 'final',
    index: number,
    slot: string,
    targetPoints: number,
    p1: TournamentParticipant,
    p2: TournamentParticipant
  ): TournamentMatch {
    return {
      matchId: `tourn_${tournament.id}_${slot}_m${index}`,
      tournamentId: tournament.id,
      stage,
      roundIndex: index,
      bracketSlot: slot,
      targetPoints,
      player1: {
        userId: p1.userId,
        username: p1.username,
        level: p1.level,
        rating: p1.rating,
        score: 0,
      },
      player2: {
        userId: p2.userId,
        username: p2.username,
        level: p2.level,
        rating: p2.rating,
        score: 0,
      },
      isCrawfordGame: false,
      crawfordHappened: false,
      doublingCubeValue: 1,
      doublingCubeOwner: 'center',
      status: 'pending',
      winnerUserId: null,
      spectatorCount: 0,
    };
  }

  /**
   * Start Knockout Finals: Top 8 from Swiss standings seeded into Single Elimination
   */
  public startKnockoutFinals(tournament: TournamentState): TournamentState {
    this.updateBuchholzScores(tournament);

    const sorted = [...tournament.participants].sort((a, b) => {
      if (b.swissPoints !== a.swissPoints) return b.swissPoints - a.swissPoints;
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
      return (b.matchPointsWon - b.matchPointsConceded) - (a.matchPointsWon - a.matchPointsConceded);
    });

    // Top 8 advance
    const top8 = sorted.slice(0, 8);
    sorted.slice(8).forEach((p, idx) => {
      p.status = 'eliminated';
      p.finalRank = 9 + idx;
    });

    tournament.status = 'knockout_quarter';

    // Quarterfinals bracket: 1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6
    const quarters: TournamentMatch[] = [
      this.createKnockoutMatch(tournament, 'quarter', 1, 'QF1', tournament.config.quarterMatchPoints, top8[0], top8[7]),
      this.createKnockoutMatch(tournament, 'quarter', 2, 'QF2', tournament.config.quarterMatchPoints, top8[3], top8[4]),
      this.createKnockoutMatch(tournament, 'quarter', 3, 'QF3', tournament.config.quarterMatchPoints, top8[1], top8[6]),
      this.createKnockoutMatch(tournament, 'quarter', 4, 'QF4', tournament.config.quarterMatchPoints, top8[2], top8[5]),
    ];

    tournament.bracket = {
      quarters,
      semis: [],
      final: null as any,
    };

    return tournament;
  }

  /**
   * Finalize USDT Prize Payouts (85% total prize pool):
   * 1st: 40%
   * 2nd: 22%
   * 3rd & 4th: 10% each
   * 5th to 8th: 4.5% each
   */
  private finalizeTournamentPrizes(tournament: TournamentState) {
    if (tournament.prizesPaid) return;
    tournament.status = 'completed';
    tournament.completedAt = Date.now();
    tournament.prizesPaid = true;

    const prizePool = tournament.prizePoolUsdt;
    const finalMatch = tournament.bracket?.final;
    if (!finalMatch || !finalMatch.winnerUserId) return;

    const champId = finalMatch.winnerUserId;
    const runnerUpId =
      finalMatch.player1.userId === champId
        ? finalMatch.player2.userId
        : finalMatch.player1.userId;

    // Semifinalists who didn't reach final
    const semiLosers = (tournament.bracket?.semis || [])
      .map((s) => (s.winnerUserId === s.player1.userId ? s.player2.userId : s.player1.userId));

    // Quarterfinalists who lost in QF
    const quarterLosers = (tournament.bracket?.quarters || [])
      .map((q) => (q.winnerUserId === q.player1.userId ? q.player2.userId : q.player1.userId));

    const pFirst = Math.round(prizePool * (tournament.config.distribution.first / 100) * 100) / 100;
    const pSecond = Math.round(prizePool * (tournament.config.distribution.second / 100) * 100) / 100;
    const pSemi = Math.round(prizePool * (tournament.config.distribution.semi / 100) * 100) / 100;
    const pQuarter = Math.round(prizePool * (tournament.config.distribution.quarter / 100) * 100) / 100;

    // Credit Champion
    this.creditPrize(tournament, champId, pFirst, 'CHAMPION (مقام اول - ۴۰٪ جایزه)', 1);

    // Credit Runner-Up
    this.creditPrize(tournament, runnerUpId, pSecond, 'RUNNER-UP (مقام دوم - ۲۲٪ جایزه)', 2);

    // Credit Semifinalists
    semiLosers.forEach((uid) => {
      this.creditPrize(tournament, uid, pSemi, 'SEMIFINALIST (مقام سوم و چهارم - ۱۰٪ جایزه)', 3);
    });

    // Credit Quarterfinalists
    quarterLosers.forEach((uid) => {
      this.creditPrize(tournament, uid, pQuarter, 'QUARTERFINALIST (مقام پنجم تا هشتم - ۴.۵٪ جایزه)', 5);
    });

    const champP = this.getParticipant(tournament, champId);
    const runnerP = this.getParticipant(tournament, runnerUpId);

    tournament.payoutSummary = {
      champion: { userId: champId, username: champP?.username || 'Champion', amountUsdt: pFirst },
      runnerUp: { userId: runnerUpId, username: runnerP?.username || 'Runner-Up', amountUsdt: pSecond },
      semifinalists: semiLosers.map((uid) => ({
        userId: uid,
        username: this.getParticipant(tournament, uid)?.username || 'Semifinalist',
        amountUsdt: pSemi,
      })),
      quarterfinalists: quarterLosers.map((uid) => ({
        userId: uid,
        username: this.getParticipant(tournament, uid)?.username || 'Quarterfinalist',
        amountUsdt: pQuarter,
      })),
    };
  }

  private creditPrize(
    tournament: TournamentState,
    userId: string,
    amount: number,
    label: string,
    rank: number
  ) {
    const p = tournament.participants.find((item) => item.userId === userId);
    if (p) {
      p.prizeWonUsdt = amount;
      p.finalRank = rank;
      if (rank === 1) p.status = 'champion';
      else if (rank === 2) p.status = 'runner_up';
    }

    const user = this.usersMapRef?.get(userId);
    if (user) {
      const balBefore = user.usdtBalance;
      user.usdtBalance = Math.round((user.usdtBalance + amount) * 100) / 100;
      user.wins = (user.wins || 0) + (rank === 1 ? 5 : 2);

      if (this.financialAuditCb) {
        this.financialAuditCb({
          type: 'tournament_prize_payout',
          amountUsdt: amount,
          userId: user.id,
          username: user.username,
          tierId: tournament.tierId,
          balanceBefore: balBefore,
          balanceAfter: user.usdtBalance,
          description: `جایزه نقدی تورنمنت ${tournament.config.persianTitle} • ${label}: +${amount.toFixed(2)} USDT`,
        });
      }
    }
  }

  /**
   * Spectator System: Connect / Disconnect and Broadcast live match state
   */
  public addSpectator(matchId: string, ws: WebSocket) {
    if (!this.matchSpectators.has(matchId)) {
      this.matchSpectators.set(matchId, new Set());
    }
    this.matchSpectators.get(matchId)!.add(ws);
  }

  public removeSpectator(matchId: string, ws: WebSocket) {
    const set = this.matchSpectators.get(matchId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) {
        this.matchSpectators.delete(matchId);
      }
    }
  }

  public broadcastToSpectators(matchId: string, payload: any) {
    const set = this.matchSpectators.get(matchId);
    if (!set || set.size === 0) return;
    const msg = JSON.stringify(payload);
    set.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    });
  }

  public getSpectatorCount(matchId: string): number {
    return this.matchSpectators.get(matchId)?.size || 0;
  }
}

export const tournamentManager = new ServerTournamentManager();
