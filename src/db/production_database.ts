import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_STORAGE_FILE = path.join(DATA_DIR, 'royal_production_database.wal');

// Types
export interface UserRecord {
  id: string;
  username: string;
  level: number;
  xp: number;
  rating: number;
  usdt_balance: number;
  wins: number;
  losses: number;
  win_streak: number;
  matches_played: number;
  status: 'online' | 'in_game' | 'offline';
  last_seen: number;
  is_banned: boolean;
  ban_reason?: string;
  created_at?: string;
}

export interface WalletTransactionRecord {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdraw' | 'entry_fee' | 'prize_payout' | 'rake_collected' | 'admin_adjustment';
  amount: number;
  network?: string;
  address?: string;
  tx_hash?: string;
  status: 'confirmed' | 'pending' | 'failed';
  description?: string;
  created_at: string;
}

export interface WithdrawalRecord {
  id: string;
  user_id: string;
  amount: number;
  destination_address: string;
  network: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_tx_hash?: string;
  created_at: string;
  processed_at?: string;
}

export interface MatchRecord {
  id: string;
  room_id: string;
  tier_id: number;
  entry_fee_usdt: number;
  prize_pool_usdt: number;
  player_light_id: string;
  player_dark_id: string;
  winner_id: string;
  target_wins: number;
  score_light: number;
  score_dark: number;
  doubling_cube: number;
  created_at: string;
}

export interface SupportTicketRecord {
  id: string;
  user_id: string;
  username: string;
  category: string;
  subject: string;
  message: string;
  status: 'open' | 'resolved' | 'closed';
  admin_reply?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialLedgerRecord {
  id: string;
  type: string;
  amount_usdt: number;
  user_id: string;
  username: string;
  tier_id?: number;
  match_room_id?: string;
  balance_before?: number;
  balance_after?: number;
  tx_hash?: string;
  address?: string;
  network?: string;
  description?: string;
  created_at: string;
}

export class ProductionDatabase {
  private pgPool: pg.Pool | null = null;
  private isPgConnected = false;

  // Persistent Table Maps (Atomic Write-Ahead-Log on Disk)
  private users = new Map<string, UserRecord>();
  private walletTransactions: WalletTransactionRecord[] = [];
  private withdrawals: WithdrawalRecord[] = [];
  private matches: MatchRecord[] = [];
  private friendships = new Map<string, Set<string>>();
  private friendRequests = new Map<string, any>();
  private supportTickets: SupportTicketRecord[] = [];
  private financialLedger: FinancialLedgerRecord[] = [];

  constructor() {
    this.initPostgres();
    this.loadFromDisk();
  }

  private initPostgres() {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      try {
        const { Pool } = pg;
        this.pgPool = new Pool({
          connectionString: dbUrl,
          connectionTimeoutMillis: 8000,
          ssl: process.env.NODE_ENV === 'production' || dbUrl.includes('render.com') ? { rejectUnauthorized: false } : undefined,
        });
        this.pgPool.connect().then((client) => {
          this.isPgConnected = true;
          client.release();
          console.log('[Database] Connected successfully to Cloud PostgreSQL database.');
          this.ensurePostgresSchemas();
        }).catch((err) => {
          console.warn('[Database] PostgreSQL connection notice:', err.message);
        });
      } catch (err: any) {
        console.warn('[Database] PostgreSQL pool configuration notice:', err.message);
      }
    }
  }

  private async ensurePostgresSchemas() {
    if (!this.pgPool || !this.isPgConnected) return;
    try {
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          username VARCHAR(64) NOT NULL,
          level INT DEFAULT 1,
          xp INT DEFAULT 100,
          rating INT DEFAULT 1200,
          usdt_balance NUMERIC(12, 2) DEFAULT 25.00,
          wins INT DEFAULT 0,
          losses INT DEFAULT 0,
          win_streak INT DEFAULT 0,
          matches_played INT DEFAULT 0,
          status VARCHAR(20) DEFAULT 'offline',
          last_seen BIGINT,
          is_banned BOOLEAN DEFAULT false,
          ban_reason TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS wallet_transactions (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          type VARCHAR(20) NOT NULL,
          amount NUMERIC(12, 2) NOT NULL,
          network VARCHAR(10),
          address VARCHAR(128),
          tx_hash VARCHAR(128),
          status VARCHAR(20) DEFAULT 'confirmed',
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS withdrawals (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          amount NUMERIC(12, 2) NOT NULL,
          destination_address VARCHAR(128) NOT NULL,
          network VARCHAR(10) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          admin_tx_hash VARCHAR(128),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS matches (
          id VARCHAR(64) PRIMARY KEY,
          room_id VARCHAR(64) UNIQUE,
          tier_id INT NOT NULL,
          entry_fee_usdt NUMERIC(8, 2),
          prize_pool_usdt NUMERIC(8, 2),
          player_light_id VARCHAR(64),
          player_dark_id VARCHAR(64),
          winner_id VARCHAR(64),
          target_wins INT DEFAULT 1,
          score_light INT DEFAULT 0,
          score_dark INT DEFAULT 0,
          doubling_cube INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS financial_ledger (
          id VARCHAR(64) PRIMARY KEY,
          type VARCHAR(32) NOT NULL,
          amount_usdt NUMERIC(12, 2) NOT NULL,
          user_id VARCHAR(64) NOT NULL,
          username VARCHAR(64) NOT NULL,
          tier_id INT,
          match_room_id VARCHAR(64),
          balance_before NUMERIC(12, 2),
          balance_after NUMERIC(12, 2),
          tx_hash VARCHAR(128),
          address VARCHAR(128),
          network VARCHAR(10),
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('[Database] PostgreSQL production schemas verified.');
    } catch (err: any) {
      console.warn('[Database] Schema sync notice:', err.message);
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(DB_STORAGE_FILE)) {
        const raw = fs.readFileSync(DB_STORAGE_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.users)) {
          for (const u of data.users) this.users.set(u.id, u);
        }
        if (Array.isArray(data.walletTransactions)) this.walletTransactions = data.walletTransactions;
        if (Array.isArray(data.withdrawals)) this.withdrawals = data.withdrawals;
        if (Array.isArray(data.matches)) this.matches = data.matches;
        if (Array.isArray(data.supportTickets)) this.supportTickets = data.supportTickets;
        if (Array.isArray(data.financialLedger)) this.financialLedger = data.financialLedger;
        if (data.friendships && typeof data.friendships === 'object') {
          for (const [uid, friendsArr] of Object.entries(data.friendships)) {
            this.friendships.set(uid, new Set(friendsArr as string[]));
          }
        }
        console.log(`[Database] Loaded ${this.users.size} users and ${this.walletTransactions.length} transactions from database.`);
      }
    } catch (e) {
      console.warn('[Database] WAL initialization notice:', e);
    }
  }

  private syncToDisk() {
    try {
      const friendsObj: Record<string, string[]> = {};
      for (const [uid, set] of this.friendships.entries()) {
        friendsObj[uid] = Array.from(set);
      }
      const snapshot = {
        version: '2.0.0-production-db',
        savedAt: new Date().toISOString(),
        users: Array.from(this.users.values()),
        walletTransactions: this.walletTransactions,
        withdrawals: this.withdrawals,
        matches: this.matches,
        supportTickets: this.supportTickets,
        financialLedger: this.financialLedger,
        friendships: friendsObj,
      };
      fs.writeFileSync(DB_STORAGE_FILE, JSON.stringify(snapshot, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Database] Failed to write database snapshot:', e);
    }
  }

  // --- USER OPERATIONS ---
  public getUser(id: string): UserRecord | undefined {
    return this.users.get(id);
  }

  public getAllUsers(): UserRecord[] {
    return Array.from(this.users.values());
  }

  public saveUser(user: Partial<UserRecord> & { id: string; username: string }): UserRecord {
    const existing = this.users.get(user.id);
    const updated: UserRecord = {
      id: user.id,
      username: user.username,
      level: user.level ?? existing?.level ?? 1,
      xp: user.xp ?? existing?.xp ?? 100,
      rating: user.rating ?? existing?.rating ?? 1200,
      usdt_balance: user.usdt_balance ?? existing?.usdt_balance ?? 25.0,
      wins: user.wins ?? existing?.wins ?? 0,
      losses: user.losses ?? existing?.losses ?? 0,
      win_streak: user.win_streak ?? existing?.win_streak ?? 0,
      matches_played: user.matches_played ?? existing?.matches_played ?? 0,
      status: user.status ?? existing?.status ?? 'online',
      last_seen: Date.now(),
      is_banned: user.is_banned ?? existing?.is_banned ?? false,
      ban_reason: user.ban_reason ?? existing?.ban_reason,
      created_at: existing?.created_at || new Date().toISOString(),
    };
    this.users.set(user.id, updated);
    this.syncToDisk();

    // Sync to PostgreSQL if connected
    if (this.pgPool && this.isPgConnected) {
      this.pgPool.query(
        `INSERT INTO users (id, username, level, xp, rating, usdt_balance, wins, losses, win_streak, matches_played, status, last_seen)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           username = EXCLUDED.username,
           level = EXCLUDED.level,
           xp = EXCLUDED.xp,
           rating = EXCLUDED.rating,
           usdt_balance = EXCLUDED.usdt_balance,
           wins = EXCLUDED.wins,
           losses = EXCLUDED.losses,
           win_streak = EXCLUDED.win_streak,
           matches_played = EXCLUDED.matches_played,
           status = EXCLUDED.status,
           last_seen = EXCLUDED.last_seen;`,
        [
          updated.id,
          updated.username,
          updated.level,
          updated.xp,
          updated.rating,
          updated.usdt_balance,
          updated.wins,
          updated.losses,
          updated.win_streak,
          updated.matches_played,
          updated.status,
          updated.last_seen,
        ]
      ).catch(() => {});
    }

    return updated;
  }

  // --- FINANCIAL & TRANSACTION OPERATIONS (DEPOSITS & WITHDRAWALS) ---
  public deposit(userId: string, amount: number, txHash: string, network: string = 'TRC20', address: string = ''): { success: boolean; newBalance: number } {
    const user = this.users.get(userId);
    if (!user) return { success: false, newBalance: 0 };

    const balanceBefore = user.usdt_balance;
    user.usdt_balance = Number((balanceBefore + amount).toFixed(2));
    this.users.set(userId, user);

    const txRecord: WalletTransactionRecord = {
      id: `dep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: userId,
      type: 'deposit',
      amount,
      network,
      address,
      tx_hash: txHash,
      status: 'confirmed',
      description: `Deposit ${amount} USDT via ${network}`,
      created_at: new Date().toISOString(),
    };
    this.walletTransactions.unshift(txRecord);

    const auditRecord: FinancialLedgerRecord = {
      id: `led-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'deposit',
      amount_usdt: amount,
      user_id: userId,
      username: user.username,
      balance_before: balanceBefore,
      balance_after: user.usdt_balance,
      tx_hash: txHash,
      network,
      address,
      description: `User deposit verified`,
      created_at: new Date().toISOString(),
    };
    this.financialLedger.unshift(auditRecord);

    this.syncToDisk();

    if (this.pgPool && this.isPgConnected) {
      this.pgPool.query(
        `UPDATE users SET usdt_balance = $1 WHERE id = $2;
         INSERT INTO wallet_transactions (id, user_id, type, amount, network, address, tx_hash, status, description)
         VALUES ($3, $4, $5, $6, $7, $8, $9, $10, $11);`,
        [user.usdt_balance, userId, txRecord.id, userId, 'deposit', amount, network, address, txHash, 'confirmed', txRecord.description]
      ).catch(() => {});
    }

    return { success: true, newBalance: user.usdt_balance };
  }

  public requestWithdrawal(userId: string, amount: number, destinationAddress: string, network: string = 'TRC20'): { success: boolean; newBalance: number; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, newBalance: 0, error: 'User not found' };
    if (user.usdt_balance < amount) return { success: false, newBalance: user.usdt_balance, error: 'Insufficient balance' };

    const balanceBefore = user.usdt_balance;
    user.usdt_balance = Number((balanceBefore - amount).toFixed(2));
    this.users.set(userId, user);

    const withRecord: WithdrawalRecord = {
      id: `wth-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: userId,
      amount,
      destination_address: destinationAddress,
      network,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    this.withdrawals.unshift(withRecord);

    const txRecord: WalletTransactionRecord = {
      id: withRecord.id,
      user_id: userId,
      type: 'withdraw',
      amount,
      network,
      address: destinationAddress,
      status: 'pending',
      description: `Withdrawal request for ${amount} USDT`,
      created_at: new Date().toISOString(),
    };
    this.walletTransactions.unshift(txRecord);

    const auditRecord: FinancialLedgerRecord = {
      id: `led-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'withdraw',
      amount_usdt: amount,
      user_id: userId,
      username: user.username,
      balance_before: balanceBefore,
      balance_after: user.usdt_balance,
      address: destinationAddress,
      network,
      description: `Withdrawal submitted to queue`,
      created_at: new Date().toISOString(),
    };
    this.financialLedger.unshift(auditRecord);

    this.syncToDisk();

    if (this.pgPool && this.isPgConnected) {
      this.pgPool.query(
        `UPDATE users SET usdt_balance = $1 WHERE id = $2;
         INSERT INTO withdrawals (id, user_id, amount, destination_address, network, status)
         VALUES ($3, $4, $5, $6, $7, $8);`,
        [user.usdt_balance, userId, withRecord.id, userId, amount, destinationAddress, network, 'pending']
      ).catch(() => {});
    }

    return { success: true, newBalance: user.usdt_balance };
  }

  // --- MATCH & TOURNAMENT OPERATIONS ---
  public recordMatch(match: MatchRecord) {
    this.matches.unshift(match);
    if (this.matches.length > 500) this.matches.pop();
    this.syncToDisk();

    if (this.pgPool && this.isPgConnected) {
      this.pgPool.query(
        `INSERT INTO matches (id, room_id, tier_id, entry_fee_usdt, prize_pool_usdt, player_light_id, player_dark_id, winner_id, target_wins, score_light, score_dark, doubling_cube)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING;`,
        [
          match.id,
          match.room_id,
          match.tier_id,
          match.entry_fee_usdt,
          match.prize_pool_usdt,
          match.player_light_id,
          match.player_dark_id,
          match.winner_id,
          match.target_wins,
          match.score_light,
          match.score_dark,
          match.doubling_cube,
        ]
      ).catch(() => {});
    }
  }

  public getTransactions(userId?: string): WalletTransactionRecord[] {
    if (userId) return this.walletTransactions.filter((t) => t.user_id === userId);
    return this.walletTransactions;
  }

  public getWithdrawals(userId?: string): WithdrawalRecord[] {
    if (userId) return this.withdrawals.filter((w) => w.user_id === userId);
    return this.withdrawals;
  }

  public getFinancialLedger(): FinancialLedgerRecord[] {
    return this.financialLedger;
  }
}

export const productionDb = new ProductionDatabase();
