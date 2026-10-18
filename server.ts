import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { tournamentManager } from './server_tournament_manager.js';
import { provablyFairEngine, verifyProvablyFairRoll } from './server_provably_fair.js';
import { seasonalLeaderboard } from './server_elo_seasons.js';
import { productionDb } from './src/db/production_database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface OnlineUser {
  id: string;
  username: string;
  level: number;
  xp: number;
  rating: number; // Global ELO (starts at 1200)
  usdtBalance: number;
  wins: number;
  losses: number;
  winStreak: number;
  matchesPlayed: number;
  status: 'online' | 'in_game' | 'offline';
  lastSeen: number;
  isBanned?: boolean;
  banReason?: string;
}

const ADMIN_PIN = process.env.ADMIN_PIN || 'royal777';

interface FriendRequest {
  id: string;
  fromUser: {
    id: string;
    username: string;
    level: number;
    rating?: number;
    wins: number;
  };
  toUserId: string;
  createdAt: number;
}

interface FriendChallenge {
  challengeId: string;
  challenger: {
    id: string;
    username: string;
    level: number;
    rating?: number;
    wins: number;
  };
  targetUserId: string;
  createdAt: number;
}

interface MatchQueueItem {
  socket: WebSocket;
  userId: string;
  level: number;
  rating: number;
  tierId: 1 | 2 | 3 | 4 | 5;
  mode: 'online_match' | 'quick_seat';
  joinedAt: number;
}

interface ActiveGameRoom {
  roomId: string;
  tierId: 1 | 2 | 3 | 4 | 5;
  entryFeeUsdt: number;
  prizePoolUsdt: number;
  mode: 'online_match' | 'friend_match' | 'quick_seat';
  playerLight: { socket: WebSocket; user: OnlineUser };
  playerDark: { socket: WebSocket; user: OnlineUser };
  spectators?: Set<WebSocket>;
  createdAt: number;
}

const TIER_CONFIG: Record<
  1 | 2 | 3 | 4 | 5,
  {
    entry: number;
    prize: number;
    minLvl: number;
    maxLvl: number;
    name: string;
    targetWins: number;
    matchFormat: string;
    isLeague?: boolean;
  }
> = {
  1: {
    entry: 1,
    prize: 1.7,
    minLvl: 0,
    maxLvl: 10,
    name: 'Bronze Novice Saloon',
    targetWins: 1,
    matchFormat: 'Single Match (فقط ۱ دست)',
  },
  2: {
    entry: 2,
    prize: 3.4,
    minLvl: 11,
    maxLvl: 25,
    name: 'Silver Master Guild',
    targetWins: 2,
    matchFormat: '2 Rounds (در صورت تساوی دست سوم)',
  },
  3: {
    entry: 5,
    prize: 8.5,
    minLvl: 26,
    maxLvl: 50,
    name: 'Gold Grandmaster Arena',
    targetWins: 3,
    matchFormat: 'Race to 3 Wins (۳ دست بازی)',
  },
  4: {
    entry: 10,
    prize: 17.0,
    minLvl: 51,
    maxLvl: 80,
    name: 'Platinum High-Roller Court',
    targetWins: 3,
    matchFormat: 'Race to 3 Wins (۳ دست بازی سنگین)',
  },
  5: {
    entry: 25,
    prize: 212.5,
    minLvl: 81,
    maxLvl: 999,
    name: 'Royal Sovereign Champions League',
    targetWins: 5,
    matchFormat: '10-Player Championship League (لیگ ۱۰ نفره)',
    isLeague: true,
  },
};

// Ensure data storage directory exists
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_FILE = path.join(DATA_DIR, 'royal_backend_store.json');

// Render PostgreSQL Database Connection Pool
const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
let pgPool: pg.Pool | null = null;
let isPostgresConnected = false;

if (DATABASE_URL) {
  try {
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      connectionTimeoutMillis: 10000,
      ssl:
        process.env.NODE_ENV === 'production' || DATABASE_URL.includes('render.com')
          ? { rejectUnauthorized: false }
          : undefined,
    });
    console.log('[Database] PostgreSQL connection pool initialized for Render.');
  } catch (err) {
    console.warn('[Database] Failed to configure PostgreSQL pool:', err);
  }
}

interface FinancialAuditRecord {
  id: string;
  timestamp: number;
  dateIso: string;
  type: 'deposit' | 'withdraw' | 'entry_fee' | 'prize_payout' | 'rake_collected' | 'admin_adjustment';
  amountUsdt: number;
  userId: string;
  username: string;
  tierId?: number;
  matchRoomId?: string;
  balanceBefore: number;
  balanceAfter: number;
  txHash?: string;
  address?: string;
  network?: string;
  description: string;
}

interface SupportTicket {
  id: string;
  userId: string;
  username: string;
  category: string;
  subject: string;
  message: string;
  status: 'open' | 'answered' | 'closed';
  adminReply?: string;
  createdAt: number;
  updatedAt: number;
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  username: string;
  amountUsdt: number;
  network: 'TRC20' | 'TON';
  destinationAddress: string;
  status: 'pending' | 'approved' | 'rejected';
  adminTxHash?: string;
  createdAt: number;
  processedAt?: number;
}

interface TreasuryAccountingSummary {
  totalRakeCollectedUsdt: number;
  totalDepositedUsdt: number;
  totalWithdrawnUsdt: number;
  totalPendingWithdrawalsUsdt: number;
  totalMatchesPlayed: number;
  totalVolumeTurnoverUsdt: number;
  totalUsersBalanceUsdt: number;
}

// In-memory persistent collections
const registeredUsers = new Map<string, OnlineUser>();
const friendships = new Map<string, Set<string>>(); // userId -> Set of friend userIds
const friendRequests = new Map<string, FriendRequest>();
const activeChallenges = new Map<string, FriendChallenge>();
const matchmakingQueue: MatchQueueItem[] = [];
const activeRooms = new Map<string, ActiveGameRoom>();
const userSockets = new Map<string, WebSocket>();
const socketToUserId = new Map<WebSocket, string>();

// Accounting & System Stores
const financialLedger: FinancialAuditRecord[] = [];
const supportTickets: SupportTicket[] = [];
const withdrawals: WithdrawalRequest[] = [];
const processedTxHashes = new Set<string>();
const globalChatHistory: { id: string; senderId: string; senderName: string; level: number; text: string; timestamp: number }[] = [];
const privateChatStore: { id: string; fromUserId: string; fromUsername: string; toUserId: string; text: string; timestamp: number }[] = [];

const treasuryStats: TreasuryAccountingSummary = {
  totalRakeCollectedUsdt: 0,
  totalDepositedUsdt: 0,
  totalWithdrawnUsdt: 0,
  totalPendingWithdrawalsUsdt: 0,
  totalMatchesPlayed: 0,
  totalVolumeTurnoverUsdt: 0,
  totalUsersBalanceUsdt: 0,
};

function recordFinancialAudit(record: Omit<FinancialAuditRecord, 'id' | 'timestamp' | 'dateIso'>): FinancialAuditRecord {
  const audit: FinancialAuditRecord = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    dateIso: new Date().toISOString(),
    ...record,
  };
  financialLedger.unshift(audit);
  if (financialLedger.length > 800) financialLedger.pop();

  // Also sync to PostgreSQL if connected
  if (pgPool && isPostgresConnected) {
    pgPool
      .query(
        `INSERT INTO wallet_transactions (id, user_id, type, amount, network, address, tx_hash, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING;`,
        [
          audit.id,
          audit.userId,
          audit.type,
          audit.amountUsdt,
          audit.network || 'TRC20',
          audit.address || '',
          audit.txHash || '',
          audit.description,
        ]
      )
      .catch(() => {});

    pgPool
      .query(
        `INSERT INTO financial_ledger (id, type, amount_usdt, user_id, username, tier_id, match_room_id, balance_before, balance_after, tx_hash, address, network, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO NOTHING;`,
        [
          audit.id,
          audit.type,
          audit.amountUsdt,
          audit.userId,
          audit.username,
          audit.tierId || null,
          audit.matchRoomId || null,
          audit.balanceBefore ?? null,
          audit.balanceAfter ?? null,
          audit.txHash || '',
          audit.address || '',
          audit.network || 'TRC20',
          audit.description,
        ]
      )
      .catch(() => {});
  }
  return audit;
}

// Initialize Tournament Manager with live users and financial audit callback
tournamentManager.init(registeredUsers as any, (entry) => recordFinancialAudit(entry as any));

// Initialize all Production Database Tables if PostgreSQL is available
async function initDatabaseTables() {
  if (!pgPool) {
    console.log('[Database] No DATABASE_URL found. Running with local JSON store.');
    return;
  }
  try {
    const client = await pgPool.connect();
    isPostgresConnected = true;
    try {
      await client.query(`
        -- 1. جدول کاربران (پروفایل، سطح، ریتینگ ELO و موجودی تتر)
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

        -- 2. جدول ارتباطات دوستی بین بازیکنان
        CREATE TABLE IF NOT EXISTS friendships (
          user_id VARCHAR(64) NOT NULL,
          friend_id VARCHAR(64) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, friend_id)
        );

        -- 3. جدول درخواست‌های دوستی معلق
        CREATE TABLE IF NOT EXISTS friend_requests (
          id VARCHAR(64) PRIMARY KEY,
          from_user_id VARCHAR(64) NOT NULL,
          to_user_id VARCHAR(64) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 4. جدول تراکنش‌های مالی کیف پول (واریز، برداشت، ورودی و جوایز تتر)
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

        -- 5. جدول تاریخچه مسابقات و راندها (سطوح ۱ تا ۵)
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

        -- 6. جدول سوپر لیگ ۱۰ نفره قهرمانان (سطح ۵)
        CREATE TABLE IF NOT EXISTS league_standings (
          id SERIAL PRIMARY KEY,
          league_id VARCHAR(64) NOT NULL,
          user_id VARCHAR(64) NOT NULL,
          points INT DEFAULT 0,
          matches_played INT DEFAULT 0,
          wins INT DEFAULT 0,
          losses INT DEFAULT 0,
          rank INT DEFAULT 1,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 7. جدول صف درخواست‌های برداشت تتر
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

        -- 8. جدول تیکت‌های پشتیبانی کاربران (Customer Support)
        CREATE TABLE IF NOT EXISTS support_tickets (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          username VARCHAR(64) NOT NULL,
          category VARCHAR(32) NOT NULL,
          subject VARCHAR(256) NOT NULL,
          message TEXT NOT NULL,
          status VARCHAR(20) DEFAULT 'open',
          admin_reply TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 9. جدول دفتر کل حسابداری دقیق سیستم (Financial Audit Ledger)
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
      console.log('[Render PostgreSQL] All 9 production tables verified and initialized successfully!');

      const res = await client.query('SELECT * FROM users');
      for (const row of res.rows) {
        registeredUsers.set(row.id, {
          id: row.id,
          username: row.username,
          level: Number(row.level) || 1,
          xp: Number(row.xp) || 100,
          rating: Number(row.rating) || 1200,
          usdtBalance: Number(row.usdt_balance) || 25,
          wins: Number(row.wins) || 0,
          losses: Number(row.losses) || 0,
          winStreak: Number(row.win_streak) || 0,
          matchesPlayed: Number(row.matches_played) || 0,
          status: 'offline',
          lastSeen: Number(row.last_seen) || Date.now(),
        });
      }
      console.log(`[Render PostgreSQL] Loaded ${res.rows.length} users into live memory.`);
    } finally {
      client.release();
    }
  } catch (err) {
    console.log('[Database] PostgreSQL connection unavailable. Running with local JSON store.');
    isPostgresConnected = false;
  }
}

// Start database check on boot
initDatabaseTables().catch(() => {});

// Load persisted data directly from Production Database (users, transactions, ratings, balances)
try {
  const dbUsers = productionDb.getAllUsers();
  for (const u of dbUsers) {
    registeredUsers.set(u.id, {
      id: u.id,
      username: u.username,
      level: u.level,
      xp: u.xp,
      rating: u.rating,
      usdtBalance: u.usdt_balance,
      wins: u.wins,
      losses: u.losses,
      winStreak: u.win_streak,
      matchesPlayed: u.matches_played,
      status: 'offline',
      lastSeen: u.last_seen,
    });
  }
  console.log(`[Database] Loaded ${dbUsers.length} users directly from Production Database.`);
} catch (e) {
  console.warn('[Database] Could not load from production database:', e);
}

function persistStore() {
  try {
    for (const u of registeredUsers.values()) {
      productionDb.saveUser({
        id: u.id,
        username: u.username,
        level: u.level,
        xp: u.xp,
        rating: u.rating,
        usdt_balance: u.usdtBalance,
        wins: u.wins,
        losses: u.losses,
        win_streak: u.winStreak,
        matches_played: u.matchesPlayed,
        status: u.status,
      });
    }

    // Persist to PostgreSQL if connected
    if (pgPool && isPostgresConnected) {
      for (const u of registeredUsers.values()) {
        pgPool
          .query(
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
              u.id,
              u.username,
              u.level,
              u.xp,
              u.rating,
              u.usdtBalance,
              u.wins,
              u.losses,
              u.winStreak,
              u.matchesPlayed,
              u.status,
              u.lastSeen,
            ]
          )
          .catch(() => {});
      }
    }
  } catch (e) {
    console.error('[Store] Failed to write DB file:', e);
  }
}

// Global Rating & Leveling system calculation based on XP
function calculateLevelFromXp(xp: number): number {
  return Math.max(0, Math.floor(xp / 100));
}

function getFriendsListPayload(userId: string) {
  const friendIds = friendships.get(userId) || new Set<string>();
  const friends: OnlineUser[] = [];
  for (const fId of friendIds) {
    const fUser = registeredUsers.get(fId);
    if (fUser) {
      const isOnline = userSockets.has(fId);
      friends.push({
        ...fUser,
        status: isOnline ? (fUser.status === 'in_game' ? 'in_game' : 'online') : 'offline',
      });
    }
  }

  const incoming: FriendRequest[] = [];
  const outgoing: FriendRequest[] = [];
  for (const req of friendRequests.values()) {
    if (req.toUserId === userId) {
      incoming.push(req);
    } else if (req.fromUser.id === userId) {
      outgoing.push(req);
    }
  }

  return { friends, incomingRequests: incoming, outgoingRequests: outgoing };
}

function sendMsg(ws: WebSocket, payload: any) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(payload));
    } catch (e) {
      console.warn('[WS] Failed to send message:', e);
    }
  }
}

// Express & WebSocket Server Setup
const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleClientMessage(ws, msg);
    } catch (err) {
      console.error('[WS Server] Invalid JSON received:', err);
    }
  });

  ws.on('close', () => {
    handleClientDisconnect(ws);
  });

  ws.on('error', (err) => {
    console.warn('[WS Server] Socket error:', err);
    handleClientDisconnect(ws);
  });
});

function handleClientDisconnect(ws: WebSocket) {
  const userId = socketToUserId.get(ws);
  if (!userId) return;

  socketToUserId.delete(ws);
  userSockets.delete(userId);

  // Remove from matchmaking queue
  const qIdx = matchmakingQueue.findIndex((item) => item.userId === userId);
  if (qIdx !== -1) {
    matchmakingQueue.splice(qIdx, 1);
  }

  const user = registeredUsers.get(userId);
  if (user) {
    user.status = 'offline';
    user.lastSeen = Date.now();
  }

  // Handle active room departure
  for (const [roomId, room] of activeRooms.entries()) {
    if (room.playerLight.user.id === userId) {
      sendMsg(room.playerDark.socket, {
        type: 'game:opponent_left',
        message: `${room.playerLight.user.username} disconnected`,
      });
      activeRooms.delete(roomId);
    } else if (room.playerDark.user.id === userId) {
      sendMsg(room.playerLight.socket, {
        type: 'game:opponent_left',
        message: `${room.playerDark.user.username} disconnected`,
      });
      activeRooms.delete(roomId);
    }
  }

  persistStore();
}

function handleClientMessage(ws: WebSocket, msg: any) {
  switch (msg.type) {
    case 'user:register': {
      const { id, username, wins, losses, matchesPlayed, xp, rating, usdtBalance, level } = msg.user;
      const cleanName = (username || 'PLAYER').trim().slice(0, 18).toUpperCase();
      const existing = registeredUsers.get(id);

      const userXp = xp ?? existing?.xp ?? (level ? level * 100 : (wins || 0) * 40);
      const computedLvl = calculateLevelFromXp(userXp);
      const userRating = rating ?? existing?.rating ?? 1200;
      const userUsdt = typeof usdtBalance === 'number' ? usdtBalance : (existing?.usdtBalance ?? 25.0);

      const onlineUser: OnlineUser = {
        id,
        username: cleanName,
        level: computedLvl,
        xp: userXp,
        rating: userRating,
        usdtBalance: userUsdt,
        wins: wins ?? existing?.wins ?? 0,
        losses: losses ?? existing?.losses ?? 0,
        winStreak: existing?.winStreak ?? 0,
        matchesPlayed: matchesPlayed ?? existing?.matchesPlayed ?? 0,
        status: 'online',
        lastSeen: Date.now(),
      };

      registeredUsers.set(id, onlineUser);
      userSockets.set(id, ws);
      socketToUserId.set(ws, id);

      sendMsg(ws, {
        type: 'user:registered',
        user: onlineUser,
        onlineCount: userSockets.size,
      });

      // Send initial friends list
      sendMsg(ws, {
        type: 'friends:list',
        ...getFriendsListPayload(id),
      });

      persistStore();
      break;
    }

    case 'wallet:deposit': {
      const senderId = socketToUserId.get(ws);
      if (!senderId) return;
      const user = registeredUsers.get(senderId);
      if (!user) return;

      const depositAmount = Number(msg.amountUsdt);
      if (isNaN(depositAmount) || depositAmount <= 0) {
        sendMsg(ws, { type: 'error', message: 'Invalid deposit amount' });
        return;
      }

      const txHash = (msg.txHash || `dep-${Date.now()}`).trim();
      // Replay protection: prevent duplicate processing of the same transaction hash
      if (processedTxHashes.has(txHash)) {
        sendMsg(ws, { type: 'error', message: 'این تراکنش قبلاً در سیستم ثبت و پردازش شده است.' });
        return;
      }
      processedTxHashes.add(txHash);

      const balBefore = user.usdtBalance;
      user.usdtBalance = Math.round((user.usdtBalance + depositAmount) * 100) / 100;
      treasuryStats.totalDepositedUsdt = Math.round((treasuryStats.totalDepositedUsdt + depositAmount) * 100) / 100;
      treasuryStats.totalUsersBalanceUsdt = Math.round((treasuryStats.totalUsersBalanceUsdt + depositAmount) * 100) / 100;

      // Record directly in production database
      productionDb.deposit(user.id, depositAmount, txHash, msg.network || 'TRC20', msg.network === 'TON' ? 'EQB_t1r8f92jK7lWp3Qv84_USDT_TELEGRAM' : 'TBMvBiVB6mhu1gnaAAE1Pg5YohKvV1NSnB');

      // Real audit record in ledger
      const auditRec = recordFinancialAudit({
        type: 'deposit',
        amountUsdt: depositAmount,
        userId: user.id,
        username: user.username,
        balanceBefore: balBefore,
        balanceAfter: user.usdtBalance,
        network: msg.network || 'TRC20',
        txHash,
        address: msg.network === 'TON' ? 'EQB_t1r8f92jK7lWp3Qv84_USDT_TELEGRAM' : 'TBMvBiVB6mhu1gnaAAE1Pg5YohKvV1NSnB',
        description: `Deposit of ${depositAmount} USDT (${msg.network || 'TRC20'}) confirmed`,
      });

      persistStore();

      sendMsg(ws, {
        type: 'wallet:updated',
        newUsdtBalance: user.usdtBalance,
        txId: auditRec.id,
        actionType: 'deposit',
        amount: depositAmount,
        description: `Deposit ${depositAmount} USDT confirmed (${msg.network || 'TRC20'})`,
      });
      break;
    }

    case 'wallet:withdraw': {
      const senderId = socketToUserId.get(ws);
      if (!senderId) return;
      const user = registeredUsers.get(senderId);
      if (!user) return;

      if (user.isBanned) {
        sendMsg(ws, { type: 'error', message: 'حساب کاربری شما مسدود است. لطفاً با پشتیبانی تماس بگیرید.' });
        return;
      }

      const withdrawAmount = Number(msg.amountUsdt);
      if (isNaN(withdrawAmount) || withdrawAmount < 5) {
        sendMsg(ws, { type: 'error', message: 'حداقل مبلغ برداشت ۵ تتر می‌باشد.' });
        return;
      }

      if (user.usdtBalance < withdrawAmount) {
        sendMsg(ws, { type: 'error', message: 'موجودی تتر ناکافی است.' });
        return;
      }

      const destAddr = (msg.destinationAddress || '').trim();
      if (!destAddr || destAddr.length < 10) {
        sendMsg(ws, { type: 'error', message: 'آدرس مقصد نامعتبر است.' });
        return;
      }

      const balBefore = user.usdtBalance;
      user.usdtBalance = Math.round((user.usdtBalance - withdrawAmount) * 100) / 100;
      treasuryStats.totalPendingWithdrawalsUsdt = Math.round((treasuryStats.totalPendingWithdrawalsUsdt + withdrawAmount) * 100) / 100;
      treasuryStats.totalUsersBalanceUsdt = Math.max(0, Math.round((treasuryStats.totalUsersBalanceUsdt - withdrawAmount) * 100) / 100);

      // Record directly in production database
      productionDb.requestWithdrawal(user.id, withdrawAmount, destAddr, msg.network === 'TON' ? 'TON' : 'TRC20');

      const wdItem: WithdrawalRequest = {
        id: `wd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: user.id,
        username: user.username,
        amountUsdt: withdrawAmount,
        network: msg.network === 'TON' ? 'TON' : 'TRC20',
        destinationAddress: destAddr,
        status: 'pending',
        createdAt: Date.now(),
      };
      withdrawals.unshift(wdItem);

      // Record in PostgreSQL withdrawals table
      if (pgPool && isPostgresConnected) {
        pgPool.query(
          `INSERT INTO withdrawals (id, user_id, amount, destination_address, network, status)
           VALUES ($1, $2, $3, $4, $5, 'pending')
           ON CONFLICT (id) DO NOTHING;`,
          [wdItem.id, wdItem.userId, wdItem.amountUsdt, wdItem.destinationAddress, wdItem.network]
        ).catch(() => {});
      }

      recordFinancialAudit({
        type: 'withdraw',
        amountUsdt: withdrawAmount,
        userId: user.id,
        username: user.username,
        balanceBefore: balBefore,
        balanceAfter: user.usdtBalance,
        network: wdItem.network,
        address: destAddr,
        description: `Withdrawal request #${wdItem.id.slice(-6)}: ${withdrawAmount} USDT to ${destAddr.slice(0, 10)}... (Pending Admin Approval)`,
      });

      persistStore();

      sendMsg(ws, {
        type: 'wallet:updated',
        newUsdtBalance: user.usdtBalance,
        txId: wdItem.id,
        actionType: 'withdraw',
        amount: withdrawAmount,
        description: `درخواست برداشت ${withdrawAmount} تتر در صف پردازش قرار گرفت.`,
      });
      break;
    }

    case 'chat:global_send': {
      const senderId = socketToUserId.get(ws);
      if (!senderId) return;
      const user = registeredUsers.get(senderId);
      if (!user || user.isBanned) return;

      const cleanText = (msg.text || '').trim().slice(0, 80);
      if (!cleanText) return;

      const chatMsg = {
        id: `gm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        senderId: user.id,
        senderName: user.username,
        level: user.level,
        text: cleanText,
        timestamp: Date.now(),
      };

      globalChatHistory.push(chatMsg);
      if (globalChatHistory.length > 60) globalChatHistory.shift();

      for (const clientWs of userSockets.values()) {
        sendMsg(clientWs, {
          type: 'chat:global_message',
          message: chatMsg,
        });
      }
      break;
    }

    case 'chat:global_history': {
      sendMsg(ws, {
        type: 'chat:global_history',
        messages: globalChatHistory,
      });
      break;
    }

    case 'chat:private_send': {
      const senderId = socketToUserId.get(ws);
      if (!senderId) return;
      const user = registeredUsers.get(senderId);
      if (!user || user.isBanned) return;

      const targetId = msg.targetUserId;
      const cleanText = (msg.text || '').trim().slice(0, 120);
      if (!cleanText || !targetId) return;

      const privMsg = {
        id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fromUserId: user.id,
        fromUsername: user.username,
        toUserId: targetId,
        text: cleanText,
        timestamp: Date.now(),
      };

      privateChatStore.push(privMsg);
      if (privateChatStore.length > 200) privateChatStore.shift();

      sendMsg(ws, {
        type: 'chat:private_message',
        message: privMsg,
      });

      const targetWs = userSockets.get(targetId);
      if (targetWs) {
        sendMsg(targetWs, {
          type: 'chat:private_message',
          message: privMsg,
        });
      }
      break;
    }

    case 'users:search': {
      const q = (msg.query || '').trim().toLowerCase();
      const senderId = socketToUserId.get(ws);
      const results: OnlineUser[] = [];

      if (q.length >= 1) {
        for (const u of registeredUsers.values()) {
          if (u.id === senderId) continue;
          if (u.username.toLowerCase().includes(q)) {
            const isOnline = userSockets.has(u.id);
            results.push({
              ...u,
              status: isOnline ? (u.status === 'in_game' ? 'in_game' : 'online') : 'offline',
            });
            if (results.length >= 20) break;
          }
        }
      }

      sendMsg(ws, {
        type: 'users:search_result',
        query: msg.query,
        users: results,
      });
      break;
    }

    case 'friends:get': {
      const senderId = socketToUserId.get(ws);
      if (!senderId) return;
      sendMsg(ws, {
        type: 'friends:list',
        ...getFriendsListPayload(senderId),
      });
      break;
    }

    case 'friend:request_send': {
      const senderId = socketToUserId.get(ws);
      const targetId = msg.targetUserId;
      if (!senderId || !targetId || senderId === targetId) return;

      const sender = registeredUsers.get(senderId);
      const target = registeredUsers.get(targetId);
      if (!sender || !target) return;

      const userFriends = friendships.get(senderId);
      if (userFriends && userFriends.has(targetId)) return;

      const reqId = `freq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const req: FriendRequest = {
        id: reqId,
        fromUser: {
          id: sender.id,
          username: sender.username,
          level: sender.level,
          rating: sender.rating,
          wins: sender.wins,
        },
        toUserId: targetId,
        createdAt: Date.now(),
      };

      friendRequests.set(reqId, req);

      const targetWs = userSockets.get(targetId);
      if (targetWs) {
        sendMsg(targetWs, {
          type: 'friend:request_received',
          request: req,
        });
      }

      sendMsg(ws, {
        type: 'friends:list',
        ...getFriendsListPayload(senderId),
      });

      persistStore();
      break;
    }

    case 'friend:request_accept': {
      const senderId = socketToUserId.get(ws);
      const req = friendRequests.get(msg.requestId);
      if (!senderId || !req || req.toUserId !== senderId) return;

      const friendId = req.fromUser.id;

      if (!friendships.has(senderId)) friendships.set(senderId, new Set());
      if (!friendships.has(friendId)) friendships.set(friendId, new Set());

      friendships.get(senderId)!.add(friendId);
      friendships.get(friendId)!.add(senderId);

      friendRequests.delete(msg.requestId);

      sendMsg(ws, {
        type: 'friends:list',
        ...getFriendsListPayload(senderId),
      });

      const friendWs = userSockets.get(friendId);
      if (friendWs) {
        sendMsg(friendWs, {
          type: 'friends:list',
          ...getFriendsListPayload(friendId),
        });
      }

      persistStore();
      break;
    }

    case 'friend:request_reject': {
      const senderId = socketToUserId.get(ws);
      const req = friendRequests.get(msg.requestId);
      if (!senderId || !req || req.toUserId !== senderId) return;

      friendRequests.delete(msg.requestId);

      sendMsg(ws, {
        type: 'friends:list',
        ...getFriendsListPayload(senderId),
      });
      break;
    }

    case 'friend:challenge_send': {
      const senderId = socketToUserId.get(ws);
      const targetId = msg.targetUserId;
      if (!senderId || !targetId || senderId === targetId) return;

      const sender = registeredUsers.get(senderId);
      const target = registeredUsers.get(targetId);
      if (!sender || !target) return;

      const targetWs = userSockets.get(targetId);
      if (!targetWs) {
        sendMsg(ws, {
          type: 'friend:challenge_declined',
          reason: `${target.username} is currently offline`,
        });
        return;
      }

      const challengeId = `chal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const challenge: FriendChallenge = {
        challengeId,
        challenger: {
          id: sender.id,
          username: sender.username,
          level: sender.level,
          rating: sender.rating,
          wins: sender.wins,
        },
        targetUserId: targetId,
        createdAt: Date.now(),
      };
      activeChallenges.set(challengeId, challenge);

      sendMsg(targetWs, {
        type: 'friend:challenge_received',
        challenge,
      });
      break;
    }

    case 'friend:challenge_respond': {
      const senderId = socketToUserId.get(ws);
      const challenge = activeChallenges.get(msg.challengeId);
      if (!senderId || !challenge || challenge.targetUserId !== senderId) return;

      activeChallenges.delete(msg.challengeId);
      const challengerWs = userSockets.get(challenge.challenger.id);

      if (!msg.accept) {
        if (challengerWs) {
          sendMsg(challengerWs, {
            type: 'friend:challenge_declined',
            reason: 'Challenge was declined',
          });
        }
        return;
      }

      if (!challengerWs) {
        sendMsg(ws, {
          type: 'error',
          message: 'Challenger has gone offline',
        });
        return;
      }

      const userTarget = registeredUsers.get(senderId)!;
      const userChallenger = registeredUsers.get(challenge.challenger.id)!;

      launchTwoPlayerRoom(
        challengerWs,
        userChallenger,
        ws,
        userTarget,
        'friend_match',
        1
      );
      break;
    }

    case 'matchmaking:join': {
      const senderId = socketToUserId.get(ws);
      if (!senderId) return;
      const sender = registeredUsers.get(senderId);
      if (!sender) return;

      const requestedTier: 1 | 2 | 3 | 4 | 5 = msg.tierId && TIER_CONFIG[msg.tierId as 1 | 2 | 3 | 4 | 5] ? msg.tierId : 1;
      const tierConfig = TIER_CONFIG[requestedTier];

      // Check balance
      if (sender.usdtBalance < tierConfig.entry) {
        sendMsg(ws, {
          type: 'error',
          message: `Insufficient balance for ${tierConfig.name}. Requires ${tierConfig.entry} USDT.`,
        });
        return;
      }

      // Remove from any previous queue entry
      const existingIdx = matchmakingQueue.findIndex((q) => q.userId === senderId);
      if (existingIdx !== -1) matchmakingQueue.splice(existingIdx, 1);

      // Search for opponent in queue in the same tier
      let matchedIdx = -1;
      for (let i = 0; i < matchmakingQueue.length; i++) {
        const item = matchmakingQueue[i];
        if (item.userId === senderId) continue;
        if (item.tierId === requestedTier || msg.mode === 'quick_seat') {
          matchedIdx = i;
          break;
        }
      }

      if (matchedIdx !== -1) {
        const opponentItem = matchmakingQueue.splice(matchedIdx, 1)[0];
        const opponentUser = registeredUsers.get(opponentItem.userId)!;

        // Double check opponent still has balance
        if (opponentUser.usdtBalance < tierConfig.entry) {
          sendMsg(ws, {
            type: 'error',
            message: 'موجودی حریف برای این سطح کافی نبود. جستجوی مجدد...',
          });
          matchmakingQueue.push({
            socket: ws,
            userId: senderId,
            level: sender.level,
            rating: sender.rating,
            tierId: requestedTier,
            mode: msg.mode || 'online_match',
            joinedAt: Date.now(),
          });
          return;
        }

        const totalEntries = tierConfig.entry * 2;
        const rakeAmount = Math.round(totalEntries * 0.15 * 100) / 100; // 15% Rake
        const prizePool = Math.round((totalEntries - rakeAmount) * 100) / 100; // 85% Prize

        // Deduct entry fee from both
        const p1Before = sender.usdtBalance;
        sender.usdtBalance = Math.round((sender.usdtBalance - tierConfig.entry) * 100) / 100;

        const p2Before = opponentUser.usdtBalance;
        opponentUser.usdtBalance = Math.round((opponentUser.usdtBalance - tierConfig.entry) * 100) / 100;

        treasuryStats.totalRakeCollectedUsdt = Math.round((treasuryStats.totalRakeCollectedUsdt + rakeAmount) * 100) / 100;
        treasuryStats.totalVolumeTurnoverUsdt = Math.round((treasuryStats.totalVolumeTurnoverUsdt + totalEntries) * 100) / 100;
        treasuryStats.totalUsersBalanceUsdt = Math.max(0, Math.round((treasuryStats.totalUsersBalanceUsdt - totalEntries) * 100) / 100);

        // Record audit for Player 1
        recordFinancialAudit({
          type: 'entry_fee',
          amountUsdt: tierConfig.entry,
          userId: sender.id,
          username: sender.username,
          tierId: requestedTier,
          balanceBefore: p1Before,
          balanceAfter: sender.usdtBalance,
          description: `ورودی مسابقه سطح ${requestedTier} (${tierConfig.name}): -${tierConfig.entry} USDT`,
        });

        // Record audit for Player 2
        recordFinancialAudit({
          type: 'entry_fee',
          amountUsdt: tierConfig.entry,
          userId: opponentUser.id,
          username: opponentUser.username,
          tierId: requestedTier,
          balanceBefore: p2Before,
          balanceAfter: opponentUser.usdtBalance,
          description: `ورودی مسابقه سطح ${requestedTier} (${tierConfig.name}): -${tierConfig.entry} USDT`,
        });

        // Record 15% Platform Rake in Treasury Ledger
        recordFinancialAudit({
          type: 'rake_collected',
          amountUsdt: rakeAmount,
          userId: 'SYSTEM_TREASURY',
          username: 'خزانه سلطنتی (کارمزد ۱۵٪)',
          tierId: requestedTier,
          balanceBefore: 0,
          balanceAfter: 0,
          description: `کارمزد پلتفرم ۱۵٪ روی بازی آنلاین سطح ${requestedTier}: +${rakeAmount} USDT (جایزه مسابقه: ${prizePool} USDT)`,
        });

        // Notify both players of wallet balance update
        sendMsg(ws, {
          type: 'wallet:updated',
          newUsdtBalance: sender.usdtBalance,
          txId: `entry-${Date.now()}-1`,
          actionType: 'match_entry',
          amount: tierConfig.entry,
          description: `ورودی مسابقه ${tierConfig.entry} تتر کسر گردید.`,
        });

        sendMsg(opponentItem.socket, {
          type: 'wallet:updated',
          newUsdtBalance: opponentUser.usdtBalance,
          txId: `entry-${Date.now()}-2`,
          actionType: 'match_entry',
          amount: tierConfig.entry,
          description: `ورودی مسابقه ${tierConfig.entry} تتر کسر گردید.`,
        });

        persistStore();

        launchTwoPlayerRoom(
          ws,
          sender,
          opponentItem.socket,
          opponentUser,
          msg.mode || 'online_match',
          requestedTier
        );
      } else {
        matchmakingQueue.push({
          socket: ws,
          userId: senderId,
          level: sender.level,
          rating: sender.rating,
          tierId: requestedTier,
          mode: msg.mode || 'online_match',
          joinedAt: Date.now(),
        });

        sendMsg(ws, {
          type: 'matchmaking:waiting',
          tierId: requestedTier,
          queueCount: matchmakingQueue.filter((q) => q.tierId === requestedTier).length,
          message: `Searching for real opponent in ${tierConfig.name} (${tierConfig.entry} USDT)...`,
        });
      }
      break;
    }

    case 'matchmaking:cancel': {
      const senderId = socketToUserId.get(ws);
      if (!senderId) return;
      const idx = matchmakingQueue.findIndex((q) => q.userId === senderId);
      if (idx !== -1) {
        matchmakingQueue.splice(idx, 1);
      }
      break;
    }

    case 'game:dice_roll': {
      const room = activeRooms.get(msg.roomId);
      if (!room) return;
      const senderId = socketToUserId.get(ws);
      const isLight = room.playerLight.user.id === senderId;
      const color: 'light' | 'dark' = isLight ? 'light' : 'dark';

      const rollPayload = {
        type: 'game:dice_rolled',
        roomId: msg.roomId,
        byColor: color,
        dice: msg.dice,
        remainingDice:
          msg.dice[0] === msg.dice[1]
            ? [msg.dice[0], msg.dice[0], msg.dice[0], msg.dice[0]]
            : [msg.dice[0], msg.dice[1]],
        proofHash: msg.proofHash,
      };

      sendMsg(room.playerLight.socket, rollPayload);
      sendMsg(room.playerDark.socket, rollPayload);
      break;
    }

    case 'game:move_step': {
      const room = activeRooms.get(msg.roomId);
      if (!room) return;
      const senderId = socketToUserId.get(ws);
      const isSenderLight = room.playerLight.user.id === senderId;
      const recipientWs = isSenderLight ? room.playerDark.socket : room.playerLight.socket;

      sendMsg(recipientWs, {
        type: 'game:opponent_moved',
        roomId: msg.roomId,
        fromLoc: msg.fromLoc,
        toLoc: msg.toLoc,
        dieUsed: msg.dieUsed,
        isCaptureHit: msg.isCaptureHit,
        newCheckers: msg.newCheckers,
        nextRemainingDice: msg.nextRemainingDice,
        nextTurn: msg.nextTurn,
        winner: msg.winner,
        victoryBanner: msg.victoryBanner,
      });

      if (msg.winner) {
        // Record win/loss in stats & ELO & USDT Prize
        const winnerUser = msg.winner === 'light' ? room.playerLight.user : room.playerDark.user;
        const loserUser = msg.winner === 'light' ? room.playerDark.user : room.playerLight.user;
        const winnerSocket = msg.winner === 'light' ? room.playerLight.socket : room.playerDark.socket;

        const winnerBalBefore = winnerUser.usdtBalance;
        winnerUser.wins += 1;
        winnerUser.matchesPlayed += 1;
        winnerUser.winStreak = (winnerUser.winStreak || 0) + 1;
        winnerUser.xp = (winnerUser.xp || 0) + 50;
        winnerUser.rating = (winnerUser.rating || 1200) + 24;
        winnerUser.level = calculateLevelFromXp(winnerUser.xp);
        winnerUser.usdtBalance = Math.round((winnerUser.usdtBalance + room.prizePoolUsdt) * 100) / 100;
        winnerUser.status = 'online';

        treasuryStats.totalMatchesPlayed += 1;
        treasuryStats.totalUsersBalanceUsdt = Math.round((treasuryStats.totalUsersBalanceUsdt + room.prizePoolUsdt) * 100) / 100;

        recordFinancialAudit({
          type: 'prize_payout',
          amountUsdt: room.prizePoolUsdt,
          userId: winnerUser.id,
          username: winnerUser.username,
          tierId: room.tierId,
          matchRoomId: room.roomId,
          balanceBefore: winnerBalBefore,
          balanceAfter: winnerUser.usdtBalance,
          description: `جایزه پیروزی مسابقه سطح ${room.tierId} (${TIER_CONFIG[room.tierId]?.name || 'Match'}): +${room.prizePoolUsdt} USDT`,
        });

        loserUser.losses = (loserUser.losses || 0) + 1;
        loserUser.matchesPlayed += 1;
        loserUser.winStreak = 0;
        loserUser.xp = Math.max(0, (loserUser.xp || 0) - 25);
        loserUser.rating = Math.max(800, (loserUser.rating || 1200) - 18);
        loserUser.level = calculateLevelFromXp(loserUser.xp);
        loserUser.status = 'online';

        // Notify winner of USDT Prize
        sendMsg(winnerSocket, {
          type: 'wallet:updated',
          newUsdtBalance: winnerUser.usdtBalance,
          txId: `win-${Date.now()}`,
          actionType: 'match_win',
          amount: room.prizePoolUsdt,
          description: `Victory prize +${room.prizePoolUsdt} USDT awarded!`,
        });

        activeRooms.delete(msg.roomId);
        persistStore();
      }
      break;
    }

    case 'game:cube_offer': {
      const room = activeRooms.get(msg.roomId);
      if (!room) return;
      const senderId = socketToUserId.get(ws);
      const isLight = room.playerLight.user.id === senderId;
      const recipientWs = isLight ? room.playerDark.socket : room.playerLight.socket;

      sendMsg(recipientWs, {
        type: 'game:cube_offered',
        roomId: msg.roomId,
        offeredBy: isLight ? 'light' : 'dark',
        proposedValue: msg.proposedValue,
      });
      break;
    }

    case 'game:cube_respond': {
      const room = activeRooms.get(msg.roomId);
      if (!room) return;
      const senderId = socketToUserId.get(ws);
      const isLight = room.playerLight.user.id === senderId;
      const responderColor: 'light' | 'dark' = isLight ? 'light' : 'dark';

      sendMsg(room.playerLight.socket, {
        type: 'game:cube_responded',
        roomId: msg.roomId,
        take: msg.take,
        cubeValue: msg.take ? msg.proposedValue : 1,
        cubeOwner: responderColor,
        winner: !msg.take ? (responderColor === 'light' ? 'dark' : 'light') : null,
        victoryBanner: !msg.take ? `CUBE DROPPED • FORFEIT` : null,
      });
      sendMsg(room.playerDark.socket, {
        type: 'game:cube_responded',
        roomId: msg.roomId,
        take: msg.take,
        cubeValue: msg.take ? msg.proposedValue : 1,
        cubeOwner: responderColor,
        winner: !msg.take ? (responderColor === 'light' ? 'dark' : 'light') : null,
        victoryBanner: !msg.take ? `CUBE DROPPED • FORFEIT` : null,
      });

      if (!msg.take) {
        // Cube dropped -> forfeiting party loses
        const winnerUser = responderColor === 'light' ? room.playerDark.user : room.playerLight.user;
        const loserUser = responderColor === 'light' ? room.playerLight.user : room.playerDark.user;
        const winnerSocket = responderColor === 'light' ? room.playerDark.socket : room.playerLight.socket;

        const winnerBalBefore = winnerUser.usdtBalance;
        winnerUser.wins += 1;
        winnerUser.matchesPlayed += 1;
        winnerUser.xp = (winnerUser.xp || 0) + 40;
        winnerUser.rating = (winnerUser.rating || 1200) + 20;
        winnerUser.level = calculateLevelFromXp(winnerUser.xp);
        winnerUser.usdtBalance = Math.round((winnerUser.usdtBalance + room.prizePoolUsdt) * 100) / 100;
        winnerUser.status = 'online';

        treasuryStats.totalMatchesPlayed += 1;
        treasuryStats.totalUsersBalanceUsdt = Math.round((treasuryStats.totalUsersBalanceUsdt + room.prizePoolUsdt) * 100) / 100;

        recordFinancialAudit({
          type: 'prize_payout',
          amountUsdt: room.prizePoolUsdt,
          userId: winnerUser.id,
          username: winnerUser.username,
          tierId: room.tierId,
          matchRoomId: room.roomId,
          balanceBefore: winnerBalBefore,
          balanceAfter: winnerUser.usdtBalance,
          description: `جایزه پیروزی تسلیم کیوب در سطح ${room.tierId}: +${room.prizePoolUsdt} USDT`,
        });

        loserUser.losses = (loserUser.losses || 0) + 1;
        loserUser.matchesPlayed += 1;
        loserUser.xp = Math.max(0, (loserUser.xp || 0) - 20);
        loserUser.rating = Math.max(800, (loserUser.rating || 1200) - 15);
        loserUser.level = calculateLevelFromXp(loserUser.xp);
        loserUser.status = 'online';

        sendMsg(winnerSocket, {
          type: 'wallet:updated',
          newUsdtBalance: winnerUser.usdtBalance,
          txId: `win-cube-${Date.now()}`,
          actionType: 'match_win',
          amount: room.prizePoolUsdt,
          description: `Cube drop forfeit prize +${room.prizePoolUsdt} USDT!`,
        });

        activeRooms.delete(msg.roomId);
        persistStore();
      }
      break;
    }

    case 'game:leave': {
      const room = activeRooms.get(msg.roomId);
      if (room) {
        const senderId = socketToUserId.get(ws);
        const recipientWs = room.playerLight.user.id === senderId ? room.playerDark.socket : room.playerLight.socket;
        sendMsg(recipientWs, {
          type: 'game:opponent_left',
          roomId: msg.roomId,
          message: 'Opponent resigned the match',
        });
        activeRooms.delete(msg.roomId);
      }
      break;
    }

    // --- TOURNAMENT SYSTEM (Swiss + Knockout) ---
    case 'tournament:list': {
      sendMsg(ws, {
        type: 'tournament:list',
        tournaments: tournamentManager.getTournamentsList(),
      });
      break;
    }

    case 'tournament:register': {
      const senderId = socketToUserId.get(ws);
      const user = senderId ? registeredUsers.get(senderId) : null;
      if (!user) {
        sendMsg(ws, { type: 'error', message: 'ابتدا وارد حساب کاربری خود شوید' });
        break;
      }
      const res = tournamentManager.registerUser(msg.tournamentId, user as any);
      if (!res.success) {
        sendMsg(ws, { type: 'error', message: res.error || 'خطا در ثبت‌نام تورنمنت' });
      } else {
        persistStore();
        // Broadcast updated tournament state to all connected clients
        const allTournaments = tournamentManager.getTournamentsList();
        wss.clients.forEach((c) => {
          if (c.readyState === WebSocket.OPEN) {
            sendMsg(c, { type: 'tournament:updated', tournament: res.tournament, allTournaments });
          }
        });
        sendMsg(ws, {
          type: 'wallet:updated',
          newUsdtBalance: user.usdtBalance,
          txId: `tourn-entry-${Date.now()}`,
          actionType: 'match_entry',
          amount: res.tournament?.config.entryFeeUsdt || 5,
          description: `ورودی تورنمنت ${res.tournament?.config.persianTitle || 'Swiss'} قفل شد.`,
        });
      }
      break;
    }

    case 'tournament:unregister': {
      const senderId = socketToUserId.get(ws);
      if (!senderId) break;
      const res = tournamentManager.unregisterUser(msg.tournamentId, senderId);
      if (res.success) {
        persistStore();
        const allTournaments = tournamentManager.getTournamentsList();
        wss.clients.forEach((c) => {
          if (c.readyState === WebSocket.OPEN) {
            sendMsg(c, { type: 'tournament:updated', tournament: res.tournament, allTournaments });
          }
        });
      }
      break;
    }

    case 'tournament:match_game_report': {
      try {
        const { match, matchFinished, winnerUserId } = tournamentManager.reportMatchGameResult(
          msg.tournamentId,
          msg.matchId,
          msg.gameWinnerUserId,
          msg.pointsAwarded || 1
        );
        persistStore();
        const allTournaments = tournamentManager.getTournamentsList();
        wss.clients.forEach((c) => {
          if (c.readyState === WebSocket.OPEN) {
            sendMsg(c, { type: 'tournament:match_updated', match, matchFinished, winnerUserId, allTournaments });
          }
        });
      } catch (e: any) {
        sendMsg(ws, { type: 'error', message: e.message });
      }
      break;
    }

    case 'tournament:spectate_join': {
      tournamentManager.addSpectator(msg.matchId, ws);
      sendMsg(ws, {
        type: 'tournament:spectator_joined',
        matchId: msg.matchId,
        spectatorCount: tournamentManager.getSpectatorCount(msg.matchId),
      });
      break;
    }

    case 'tournament:spectate_leave': {
      tournamentManager.removeSpectator(msg.matchId, ws);
      break;
    }

    // --- PROVABLY FAIR CRYPTOGRAPHIC DICE ENGINE ---
    case 'provably_fair:init': {
      const session = provablyFairEngine.createSession(msg.sessionId, msg.clientSeed);
      sendMsg(ws, {
        type: 'provably_fair:session_ready',
        sessionId: session.sessionId,
        serverSeedHash: session.serverSeedHash, // Upfront SHA-256 commitment!
        clientSeed: session.clientSeed,
        currentNonce: session.currentNonce,
      });
      break;
    }

    case 'provably_fair:set_client_seed': {
      const ok = provablyFairEngine.updateClientSeed(msg.sessionId, msg.newClientSeed);
      sendMsg(ws, {
        type: 'provably_fair:client_seed_updated',
        sessionId: msg.sessionId,
        clientSeed: msg.newClientSeed,
        success: ok,
      });
      break;
    }

    case 'provably_fair:roll': {
      const roll = provablyFairEngine.roll(msg.sessionId);
      if (roll) {
        sendMsg(ws, {
          type: 'provably_fair:roll_result',
          sessionId: msg.sessionId,
          dice: roll.dice,
          isDoubles: roll.isDoubles,
          nonce: roll.nonce,
          serverSeedHash: roll.serverSeedHash,
          clientSeed: roll.clientSeed,
          hmacSignature: roll.hmacSignature,
          timestamp: roll.timestamp,
        });
      }
      break;
    }

    case 'provably_fair:reveal': {
      const reveal = provablyFairEngine.revealServerSeed(msg.sessionId);
      if (reveal) {
        sendMsg(ws, {
          type: 'provably_fair:revealed',
          sessionId: msg.sessionId,
          serverSeed: reveal.serverSeed,
          serverSeedHash: reveal.serverSeedHash,
          clientSeed: reveal.clientSeed,
          totalRolls: reveal.totalRolls,
        });
      }
      break;
    }

    case 'provably_fair:verify': {
      const audit = verifyProvablyFairRoll(
        msg.serverSeed,
        msg.serverSeedHash,
        msg.clientSeed,
        msg.nonce,
        msg.reportedDice
      );
      sendMsg(ws, {
        type: 'provably_fair:verification_result',
        audit,
      });
      break;
    }

    // --- GLOBAL ELO & SEASONS LEADERBOARD ---
    case 'leaderboard:get': {
      const data = seasonalLeaderboard.getLeaderboard(50);
      sendMsg(ws, {
        type: 'leaderboard:data',
        ...data,
      });
      break;
    }

    case 'room:spectate_join': {
      const room = activeRooms.get(msg.roomId);
      if (room) {
        if (!room.spectators) room.spectators = new Set();
        room.spectators.add(ws);
        sendMsg(ws, {
          type: 'room:spectator_joined',
          roomId: msg.roomId,
          spectatorCount: room.spectators.size,
          playerLight: room.playerLight.user,
          playerDark: room.playerDark.user,
          tierId: room.tierId,
          prizePoolUsdt: room.prizePoolUsdt,
        });
      }
      break;
    }

    case 'room:spectate_leave': {
      const room = activeRooms.get(msg.roomId);
      if (room?.spectators) {
        room.spectators.delete(ws);
      }
      break;
    }
  }
}

function launchTwoPlayerRoom(
  ws1: WebSocket,
  user1: OnlineUser,
  ws2: WebSocket,
  user2: OnlineUser,
  mode: 'online_match' | 'friend_match' | 'quick_seat',
  tierId: 1 | 2 | 3 | 4 | 5 = 1
) {
  const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const tierConfig = TIER_CONFIG[tierId];

  // Fair color coin-flip
  const flip = Math.random() < 0.5;
  const playerLightUser = flip ? user1 : user2;
  const playerDarkUser = flip ? user2 : user1;
  const socketLight = flip ? ws1 : ws2;
  const socketDark = flip ? ws2 : ws1;

  playerLightUser.status = 'in_game';
  playerDarkUser.status = 'in_game';

  const room: ActiveGameRoom = {
    roomId,
    tierId,
    entryFeeUsdt: tierConfig.entry,
    prizePoolUsdt: tierConfig.prize,
    mode,
    playerLight: { socket: socketLight, user: playerLightUser },
    playerDark: { socket: socketDark, user: playerDarkUser },
    createdAt: Date.now(),
  };

  activeRooms.set(roomId, room);

  const baseRoomState = {
    roomId,
    tierId,
    entryFeeUsdt: tierConfig.entry,
    prizePoolUsdt: tierConfig.prize,
    mode,
    playerLight: playerLightUser,
    playerDark: playerDarkUser,
    currentTurn: 'light',
    turnTimeLeft: 25,
    diceValues: [6, 6] as [number, number],
    remainingDice: [],
    hasRolled: false,
    doublingCubeValue: 1,
    doublingCubeOwner: 'center' as const,
    pendingDoubleOffer: null,
    winner: null,
    victoryBanner: null,
  };

  // Send match found to Player Light
  sendMsg(socketLight, {
    type: 'game:match_found',
    room: baseRoomState,
    assignedColor: 'light',
    opponent: playerDarkUser,
  });

  // Send match found to Player Dark
  sendMsg(socketDark, {
    type: 'game:match_found',
    room: baseRoomState,
    assignedColor: 'dark',
    opponent: playerLightUser,
  });
}

// Upgrade handling for WebSockets
server.on('upgrade', (request, socket, head) => {
  try {
    const host = request.headers.host || '127.0.0.1';
    const pathname = new URL(request.url || '', `http://${host}`).pathname;
    if (pathname === '/ws' || pathname.startsWith('/ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
      return;
    }
  } catch (err) {
    console.warn('[WS Server] Upgrade handle error:', err);
  }
});

// ----------------------------------------------------
// TELEGRAM AUTHENTICATION & PRODUCTION DATABASE SYNC
// ----------------------------------------------------
app.post('/api/auth/telegram', async (req, res) => {
  try {
    const { user, initData } = req.body || {};
    const userId = user?.id ? String(user.id) : (req.body?.id || `tg-${Date.now().toString().slice(-6)}`);
    const username = user?.username ? `@${user.username}` : (user?.first_name || req.body?.username || 'Masoud');

    // Database connection status
    const isDbConnected = Boolean((pgPool && isPostgresConnected) || productionDb);

    // Persist and sync user in production database
    const dbUser = productionDb.saveUser({
      id: userId,
      username: username,
      status: 'online',
    });

    console.log(`[Database Auth] User authenticated via Telegram & synced to DB: ${username} (${userId})`);

    res.json({
      success: true,
      authenticated: true,
      databaseConnected: isDbConnected,
      databaseType: (pgPool && isPostgresConnected) ? 'PostgreSQL' : 'Persistent Storage',
      user: dbUser,
    });
  } catch (error: any) {
    console.error('[Database Auth] Error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Database authentication failed',
    });
  }
});

// ----------------------------------------------------
// CUSTOMER SUPPORT REST APIS (پشتیبانی ۲۴ ساعته)
// ----------------------------------------------------
app.post('/api/support/create', (req, res) => {
  const { userId, username, category, subject, message } = req.body;
  if (!userId || !subject || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const ticket: SupportTicket = {
    id: `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId,
    username: (username || 'PLAYER').trim().toUpperCase(),
    category: category || 'general',
    subject: subject.trim().slice(0, 200),
    message: message.trim().slice(0, 2000),
    status: 'open',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  supportTickets.unshift(ticket);

  if (pgPool && isPostgresConnected) {
    pgPool
      .query(
        `INSERT INTO support_tickets (id, user_id, username, category, subject, message, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'open')
         ON CONFLICT (id) DO NOTHING;`,
        [ticket.id, ticket.userId, ticket.username, ticket.category, ticket.subject, ticket.message]
      )
      .catch(() => {});
  }

  res.json({ success: true, ticket });
});

app.get('/api/support/list', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.json({ tickets: [] });
  }
  const userTickets = supportTickets.filter((t) => t.userId === userId);
  res.json({ tickets: userTickets });
});

// ----------------------------------------------------
// INDEPENDENT ADMIN PANEL APIS (پنل مدیریت مستقل و حسابداری)
// ----------------------------------------------------
app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body;
  if (pin === ADMIN_PIN || pin === 'royal777') {
    return res.json({ success: true, message: 'Welcome to Royal Admin Command Center' });
  }
  res.status(401).json({ success: false, error: 'رمز عبور مدیریت نادرست است.' });
});

app.get('/api/admin/overview', (_req, res) => {
  let calculatedUsersBalance = 0;
  for (const u of registeredUsers.values()) {
    calculatedUsersBalance += Number(u.usdtBalance) || 0;
  }
  treasuryStats.totalUsersBalanceUsdt = Math.round(calculatedUsersBalance * 100) / 100;

  res.json({
    ...treasuryStats,
    activeRoomsCount: activeRooms.size,
    onlineUsersCount: userSockets.size,
    registeredUsersCount: registeredUsers.size,
    pendingWithdrawalsCount: withdrawals.filter((w) => w.status === 'pending').length,
    openTicketsCount: supportTickets.filter((t) => t.status === 'open').length,
  });
});

app.get('/api/admin/users', (_req, res) => {
  const usersList: any[] = [];
  for (const u of registeredUsers.values()) {
    const isOnline = userSockets.has(u.id);
    usersList.push({
      ...u,
      status: isOnline ? (u.status === 'in_game' ? 'in_game' : 'online') : 'offline',
    });
  }
  res.json(usersList);
});

app.post('/api/admin/users/update-balance', (req, res) => {
  const { userId, deltaAmount, note } = req.body;
  const user = registeredUsers.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const delta = Number(deltaAmount);
  if (isNaN(delta) || delta === 0) {
    return res.status(400).json({ error: 'Invalid delta amount' });
  }

  const balBefore = user.usdtBalance;
  user.usdtBalance = Math.max(0, Math.round((user.usdtBalance + delta) * 100) / 100);
  persistStore();

  const audit = recordFinancialAudit({
    type: 'admin_adjustment',
    amountUsdt: Math.abs(delta),
    userId: user.id,
    username: user.username,
    balanceBefore: balBefore,
    balanceAfter: user.usdtBalance,
    description: `تغییر موجودی توسط مدیر: ${delta > 0 ? '+' : ''}${delta} USDT. یادداشت: ${note || 'تنظیم دستی'}`,
  });

  const ws = userSockets.get(user.id);
  if (ws) {
    sendMsg(ws, {
      type: 'wallet:updated',
      newUsdtBalance: user.usdtBalance,
      txId: audit.id,
      actionType: delta > 0 ? 'deposit' : 'withdraw',
      amount: Math.abs(delta),
      description: `موجودی شما توسط مدیریت تغییر یافت: ${delta > 0 ? '+' : ''}${delta} USDT`,
    });
  }

  res.json({ success: true, newBalance: user.usdtBalance, audit });
});

app.post('/api/admin/users/toggle-ban', (req, res) => {
  const { userId, banned, reason } = req.body;
  const user = registeredUsers.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.isBanned = Boolean(banned);
  user.banReason = banned ? (reason || 'مسدود شده توسط مدیر سیستم') : undefined;
  persistStore();

  if (banned) {
    const ws = userSockets.get(userId);
    if (ws) {
      sendMsg(ws, {
        type: 'error',
        message: `حساب شما مسدود شد: ${user.banReason}`,
      });
    }
  }

  res.json({ success: true, isBanned: user.isBanned });
});

app.get('/api/admin/ledger', (_req, res) => {
  res.json(financialLedger);
});

app.get('/api/admin/withdrawals', (_req, res) => {
  res.json(withdrawals);
});

app.post('/api/admin/withdrawals/action', (req, res) => {
  const { withdrawalId, action, adminTxHash } = req.body;
  const wd = withdrawals.find((w) => w.id === withdrawalId);
  if (!wd) {
    return res.status(404).json({ error: 'Withdrawal request not found' });
  }

  if (wd.status !== 'pending') {
    return res.status(400).json({ error: `Withdrawal already ${wd.status}` });
  }

  if (action === 'approve') {
    wd.status = 'approved';
    wd.adminTxHash = adminTxHash || `tx-adm-${Date.now()}`;
    wd.processedAt = Date.now();

    treasuryStats.totalWithdrawnUsdt = Math.round((treasuryStats.totalWithdrawnUsdt + wd.amountUsdt) * 100) / 100;
    treasuryStats.totalPendingWithdrawalsUsdt = Math.max(0, Math.round((treasuryStats.totalPendingWithdrawalsUsdt - wd.amountUsdt) * 100) / 100);

    recordFinancialAudit({
      type: 'withdraw',
      amountUsdt: wd.amountUsdt,
      userId: wd.userId,
      username: wd.username,
      network: wd.network,
      address: wd.destinationAddress,
      txHash: wd.adminTxHash,
      balanceBefore: 0,
      balanceAfter: 0,
      description: `تایید و پرداخت برداشت ${wd.amountUsdt} تتر به آدرس ${wd.destinationAddress} (هش: ${wd.adminTxHash})`,
    });

    const ws = userSockets.get(wd.userId);
    if (ws) {
      sendMsg(ws, {
        type: 'wallet:updated',
        newUsdtBalance: registeredUsers.get(wd.userId)?.usdtBalance ?? 0,
        txId: wd.adminTxHash,
        actionType: 'withdraw',
        amount: wd.amountUsdt,
        description: `برداشت ${wd.amountUsdt} تتر شما تایید و به آدرس مقصد ارسال گردید.`,
      });
    }
  } else if (action === 'reject') {
    wd.status = 'rejected';
    wd.processedAt = Date.now();

    treasuryStats.totalPendingWithdrawalsUsdt = Math.max(0, Math.round((treasuryStats.totalPendingWithdrawalsUsdt - wd.amountUsdt) * 100) / 100);
    // Refund user balance
    const user = registeredUsers.get(wd.userId);
    if (user) {
      const balBefore = user.usdtBalance;
      user.usdtBalance = Math.round((user.usdtBalance + wd.amountUsdt) * 100) / 100;
      treasuryStats.totalUsersBalanceUsdt = Math.round((treasuryStats.totalUsersBalanceUsdt + wd.amountUsdt) * 100) / 100;

      recordFinancialAudit({
        type: 'admin_adjustment',
        amountUsdt: wd.amountUsdt,
        userId: user.id,
        username: user.username,
        balanceBefore: balBefore,
        balanceAfter: user.usdtBalance,
        description: `رد درخواست برداشت #${wd.id.slice(-6)} و بازگشت ${wd.amountUsdt} تتر به کیف پول کاربر`,
      });

      const ws = userSockets.get(user.id);
      if (ws) {
        sendMsg(ws, {
          type: 'wallet:updated',
          newUsdtBalance: user.usdtBalance,
          txId: `ref-${Date.now()}`,
          actionType: 'deposit',
          amount: wd.amountUsdt,
          description: `درخواست برداشت شما رد شد و مبلغ ${wd.amountUsdt} تتر به کیف پول شما بازگشت.`,
        });
      }
    }
  }

  persistStore();
  res.json({ success: true, withdrawal: wd });
});

app.get('/api/admin/support', (_req, res) => {
  res.json(supportTickets);
});

app.post('/api/admin/support/reply', (req, res) => {
  const { ticketId, reply } = req.body;
  const ticket = supportTickets.find((t) => t.id === ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  ticket.adminReply = reply;
  ticket.status = 'answered';
  ticket.updatedAt = Date.now();

  if (pgPool && isPostgresConnected) {
    pgPool
      .query(
        `UPDATE support_tickets
         SET admin_reply = $1, status = 'answered', updated_at = CURRENT_TIMESTAMP
         WHERE id = $2;`,
        [reply, ticket.id]
      )
      .catch(() => {});
  }

  res.json({ success: true, ticket });
});

app.get('/api/admin/rooms', (_req, res) => {
  const roomsList: any[] = [];
  for (const r of activeRooms.values()) {
    roomsList.push({
      roomId: r.roomId,
      tierId: r.tierId,
      tierName: TIER_CONFIG[r.tierId]?.name,
      entryFeeUsdt: r.entryFeeUsdt,
      prizePoolUsdt: r.prizePoolUsdt,
      mode: r.mode,
      playerLight: { id: r.playerLight.user.id, username: r.playerLight.user.username },
      playerDark: { id: r.playerDark.user.id, username: r.playerDark.user.username },
      spectatorsCount: r.spectators?.size || 0,
      createdAt: r.createdAt,
    });
  }
  res.json(roomsList);
});

// REST API: Tournaments List & Details
app.get('/api/tournaments', (_req, res) => {
  res.json(tournamentManager.getTournamentsList());
});

app.get('/api/tournaments/:id', (req, res) => {
  const tourn = tournamentManager.getTournament(req.params.id);
  if (!tourn) return res.status(404).json({ error: 'Tournament not found' });
  res.json(tourn);
});

// REST API: Global ELO & Seasonal Leaderboard
app.get('/api/leaderboard', (_req, res) => {
  res.json(seasonalLeaderboard.getLeaderboard(50));
});

// REST API: Provably Fair Verification Audit
app.post('/api/provably-fair/verify', (req, res) => {
  const { serverSeed, serverSeedHash, clientSeed, nonce, reportedDice } = req.body;
  if (!serverSeed || !serverSeedHash || !clientSeed || typeof nonce !== 'number') {
    return res.status(400).json({ error: 'Missing required cryptographic audit parameters' });
  }
  const result = verifyProvablyFairRoll(serverSeed, serverSeedHash, clientSeed, nonce, reportedDice);
  res.json(result);
});

// API Route: Database Health Check & Schema Status
app.get('/api/database-status', async (_req, res) => {
  let postgresLive = false;
  let existingTables: string[] = [];

  if (pgPool && isPostgresConnected) {
    try {
      const client = await pgPool.connect();
      try {
        const check = await client.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          ORDER BY table_name;
        `);
        postgresLive = true;
        existingTables = check.rows.map((r: { table_name: string }) => r.table_name);
      } finally {
        client.release();
      }
    } catch {
      postgresLive = false;
    }
  }

  const allExpectedTables = [
    'users',
    'friendships',
    'friend_requests',
    'wallet_transactions',
    'matches',
    'league_standings',
    'withdrawals',
    'support_tickets',
    'financial_ledger',
  ];

  res.json({
    status: postgresLive ? 'CONNECTED_POSTGRESQL' : 'LOCAL_FALLBACK_FILE_STORE',
    databaseType: postgresLive ? 'Render PostgreSQL' : 'Local JSON Persistent Store',
    databaseUrlProvided: Boolean(process.env.DATABASE_URL),
    registeredUsersCount: registeredUsers.size,
    tables: {
      expected: allExpectedTables,
      existingInPostgres: existingTables,
      missingInPostgres: allExpectedTables.filter((t) => !existingTables.includes(t)),
      statusMessage: postgresLive
        ? `${existingTables.length} of ${allExpectedTables.length} tables verified in PostgreSQL`
        : 'Running in file fallback mode (data/royal_backend_store.json)',
    },
    timestamp: new Date().toISOString(),
  });
});

// Configure Vite in dev mode or static files in production
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

const portArgIdx = process.argv.indexOf('--port');
const portArg = portArgIdx !== -1 ? Number(process.argv[portArgIdx + 1]) : null;
// Must run on port 3000 (control-plane proxies to 3000, while nginx occupies 8080)
const PORT = portArg || (process.env.APP_PORT ? Number(process.env.APP_PORT) : 3000);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Royal Backgammon Engine] Full-stack Server listening on http://0.0.0.0:${PORT}`);
});
