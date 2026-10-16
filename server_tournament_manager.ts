import { WebSocket } from 'ws';
import {
  TournamentState,
  TournamentMatch,
  TournamentParticipant,
  TournamentTierId,
  TOURNAMENT_TIERS,
} from './src/network/tournamentTypes.js';

class TournamentManager {
  private tournaments: Map<string, TournamentState> = new Map();
  private spectators: Map<string, Set<WebSocket>> = new Map();
  private usersMap: Map<string, any> = new Map();
  private auditCallback: ((entry: any) => void) | null = null;

  constructor() {
    this.seedDefaultTournaments();
  }

  init(users: Map<string, any>, auditCb: (entry: any) => void) {
    this.usersMap = users;
    this.auditCallback = auditCb;
  }

  private seedDefaultTournaments() {
    const t1: TournamentState = {
      id: 'tourn_swiss_5',
      tierId: 'swiss_5',
      config: TOURNAMENT_TIERS.swiss_5,
      status: 'registering',
      currentRound: 1,
      participants: [
        { userId: 'bot_shams', username: 'SHAMS_GM', rating: 2340, swissPoints: 0, buchholz: 0, matchesPlayed: 0, matchPointsWon: 0, matchPointsConceded: 0 },
        { userId: 'bot_cyrus', username: 'CYRUS_77', rating: 2180, swissPoints: 0, buchholz: 0, matchesPlayed: 0, matchPointsWon: 0, matchPointsConceded: 0 },
        { userId: 'bot_aria', username: 'ARIA_PRO', rating: 1960, swissPoints: 0, buchholz: 0, matchesPlayed: 0, matchPointsWon: 0, matchPointsConceded: 0 },
        { userId: 'bot_soraya', username: 'SORAYA_P', rating: 1840, swissPoints: 0, buchholz: 0, matchesPlayed: 0, matchPointsWon: 0, matchPointsConceded: 0 },
        { userId: 'bot_dariush', username: 'DARIUSH', rating: 1690, swissPoints: 0, buchholz: 0, matchesPlayed: 0, matchPointsWon: 0, matchPointsConceded: 0 },
        { userId: 'bot_rostam', username: 'ROSTAM', rating: 1580, swissPoints: 0, buchholz: 0, matchesPlayed: 0, matchPointsWon: 0, matchPointsConceded: 0 },
      ],
      swissMatches: {},
      bracket: null,
      totalCollectedUsdt: 30,
      platformFeeUsdt: 4.5,
      prizePoolUsdt: 25.5,
      prizesPaid: false,
      createdAt: Date.now(),
    };

    const t2: TournamentState = {
      id: 'tourn_swiss_10',
      tierId: 'swiss_10',
      config: TOURNAMENT_TIERS.swiss_10,
      status: 'registering',
      currentRound: 1,
      participants: [
        { userId: 'bot_shams', username: 'SHAMS_GM', rating: 2340, swissPoints: 0, buchholz: 0, matchesPlayed: 0, matchPointsWon: 0, matchPointsConceded: 0 },
        { userId: 'bot_cyrus', username: 'CYRUS_77', rating: 2180, swissPoints: 0, buchholz: 0, matchesPlayed: 0, matchPointsWon: 0, matchPointsConceded: 0 },
        { userId: 'bot_aria', username: 'ARIA_PRO', rating: 1960, swissPoints: 0, buchholz: 0, matchesPlayed: 0, matchPointsWon: 0, matchPointsConceded: 0 },
      ],
      swissMatches: {},
      bracket: null,
      totalCollectedUsdt: 30,
      platformFeeUsdt: 4.5,
      prizePoolUsdt: 25.5,
      prizesPaid: false,
      createdAt: Date.now(),
    };

    this.tournaments.set(t1.id, t1);
    this.tournaments.set(t2.id, t2);
  }

  getTournamentsList(): TournamentState[] {
    return Array.from(this.tournaments.values());
  }

  getTournament(id: string): TournamentState | undefined {
    return this.tournaments.get(id);
  }

  registerUser(
    tournamentId: string,
    user: { id: string; username: string; rating?: number; usdtBalance: number }
  ): { success: boolean; error?: string; message: string; tournament?: TournamentState } {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, error: 'تورنمنت یافت نشد', message: 'Tournament not found' };
    if (tournament.status !== 'registering') {
      return { success: false, error: 'ثبت‌نام این مسابقه به پایان رسیده است', message: 'Registration is closed' };
    }
    if (tournament.participants.some((u) => u.userId === user.id)) {
      return { success: false, error: 'شما قبلاً در این تورنمنت ثبت‌نام کرده‌اید', message: 'Already registered' };
    }
    const fee = tournament.config.entryFeeUsdt;
    if (user.usdtBalance < fee) {
      return { success: false, error: 'موجودی تتر برای ورودی کافی نیست', message: 'Insufficient USDT balance' };
    }

    user.usdtBalance -= fee;
    tournament.totalCollectedUsdt += fee;
    tournament.platformFeeUsdt += fee * 0.15;
    tournament.prizePoolUsdt += fee * 0.85;

    tournament.participants.push({
      userId: user.id,
      username: user.username,
      rating: user.rating || 1200,
      swissPoints: 0,
      buchholz: 0,
      matchesPlayed: 0,
      matchPointsWon: 0,
      matchPointsConceded: 0,
    });

    if (this.auditCallback) {
      this.auditCallback({
        type: 'tournament_fee',
        userId: user.id,
        amount: -fee,
        meta: { tournamentId },
      });
    }

    return { success: true, message: 'Successfully registered', tournament };
  }

  unregisterUser(
    tournamentId: string,
    userId: string
  ): { success: boolean; error?: string; message: string; tournament?: TournamentState } {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { success: false, error: 'Tournament not found', message: 'Tournament not found' };
    if (tournament.status !== 'registering') {
      return { success: false, error: 'Cannot unregister after tournament starts', message: 'Cannot unregister' };
    }

    const idx = tournament.participants.findIndex((u) => u.userId === userId);
    if (idx === -1) return { success: false, error: 'User not registered', message: 'User not registered' };

    tournament.participants.splice(idx, 1);
    const fee = tournament.config.entryFeeUsdt;
    tournament.totalCollectedUsdt = Math.max(0, tournament.totalCollectedUsdt - fee);
    tournament.platformFeeUsdt = Math.max(0, tournament.platformFeeUsdt - fee * 0.15);
    tournament.prizePoolUsdt = Math.max(0, tournament.prizePoolUsdt - fee * 0.85);

    const user = this.usersMap.get(userId);
    if (user) {
      user.usdtBalance += fee;
    }

    return { success: true, message: 'Unregistered and entry fee refunded', tournament };
  }

  reportMatchGameResult(
    tournamentId: string,
    matchId: string,
    winnerId: string,
    pointsWon: number
  ): { match: TournamentMatch | null; matchFinished: boolean; winnerUserId: string | null } {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return { match: null, matchFinished: false, winnerUserId: null };

    let foundMatch: TournamentMatch | null = null;
    for (const roundKey of Object.keys(tournament.swissMatches)) {
      const match = tournament.swissMatches[Number(roundKey)]?.find((m) => m.matchId === matchId);
      if (match) {
        foundMatch = match;
        break;
      }
    }

    if (!foundMatch) return { match: null, matchFinished: false, winnerUserId: null };

    if (foundMatch.player1.userId === winnerId) {
      foundMatch.scoreP1 += pointsWon;
    } else {
      foundMatch.scoreP2 += pointsWon;
    }

    const matchFinished =
      foundMatch.scoreP1 >= foundMatch.targetPoints || foundMatch.scoreP2 >= foundMatch.targetPoints;

    if (matchFinished) {
      foundMatch.isCompleted = true;
      foundMatch.winnerId = foundMatch.scoreP1 >= foundMatch.targetPoints ? foundMatch.player1.userId : foundMatch.player2.userId;
    }

    return { match: foundMatch, matchFinished, winnerUserId: foundMatch.winnerId || null };
  }

  addSpectator(matchId: string, ws: WebSocket) {
    if (!this.spectators.has(matchId)) {
      this.spectators.set(matchId, new Set());
    }
    this.spectators.get(matchId)!.add(ws);
  }

  removeSpectator(matchId: string, ws: WebSocket) {
    const set = this.spectators.get(matchId);
    if (set) {
      set.delete(ws);
    }
  }

  getSpectatorCount(matchId: string): number {
    return this.spectators.get(matchId)?.size || 0;
  }
}

export const tournamentManager = new TournamentManager();
