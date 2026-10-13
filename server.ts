import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { createHmac, timingSafeEqual } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface VerifiedTelegramUser {
  id: string;
  username: string;
  firstName: string;
}

const verifiedTelegramUsers = new WeakMap<WebSocket, VerifiedTelegramUser>();

function verifyTelegramInitData(initData: unknown): VerifiedTelegramUser | null {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken || typeof initData !== 'string' || initData.length < 10 || initData.length > 8192) return null;
  try {
    const params = new URLSearchParams(initData);
    const receivedHash = params.get('hash');
    const authDate = Number(params.get('auth_date'));
    const userRaw = params.get('user');
    if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash) || !userRaw || !Number.isFinite(authDate)) return null;
    const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
    if (ageSeconds < -60 || ageSeconds > 86400) return null;
    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const expectedHash = createHmac('sha256', secretKey).update(dataCheckString).digest();
    const actualHash = Buffer.from(receivedHash, 'hex');
    if (actualHash.length !== expectedHash.length || !timingSafeEqual(actualHash, expectedHash)) return null;
    const tgUser = JSON.parse(userRaw);
    if (!tgUser || !Number.isSafeInteger(tgUser.id) || tgUser.id <= 0 || tgUser.is_bot) return null;
    const firstName = String(tgUser.first_name || 'PLAYER').trim().slice(0, 18);
    const username = String(tgUser.username || firstName || 'PLAYER').trim().slice(0, 18).toUpperCase();
    return { id: String(tgUser.id), username, firstName };
  } catch {
    return null;
  }
}

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
}

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
  amountUsdt: number;
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
    prize: 1.9,
    minLvl: 0,
    maxLvl: 10,
    name: 'Bronze Novice Saloon',
    targetWins: 1,
    matchFormat: 'Single Match (فقط ۱ دست)',
  },
  2: {
    entry: 2,
    prize: 3.8,
    minLvl: 11,
    maxLvl: 25,
    name: 'Silver Master Guild',
    targetWins: 2,
    matchFormat: '2 Rounds (در صورت تساوی دست سوم)',
  },
  3: {
    entry: 5,
    prize: 9.5,
    minLvl: 26,
    maxLvl: 50,
    name: 'Gold Grandmaster Arena',
    targetWins: 3,
    matchFormat: 'Race to 3 Wins (۳ دست بازی)',
  },
  4: {
    entry: 10,
    prize: 19.0,
    minLvl: 51,
    maxLvl: 80,
    name: 'Platinum High-Roller Court',
    targetWins: 3,
    matchFormat: 'Race to 3 Wins (۳ دست بازی سنگین)',
  },
  5: {
    entry: 25,
    prize: 235.0,
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

// In-memory persistent collections
const registeredUsers = new Map<string, OnlineUser>();
const friendships = new Map<string, Set<string>>(); // userId -> Set of friend userIds
const friendRequests = new Map<string, FriendRequest>();
const activeChallenges = new Map<string, FriendChallenge>();
const matchmakingQueue: MatchQueueItem[] = [];
const activeRooms = new Map<string, ActiveGameRoom>();
const userSockets = new Map<string, WebSocket>();
const socketToUserId = new Map<WebSocket, string>();

// Load persisted data if exists
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.users && Array.isArray(parsed.users)) {
      for (const u of parsed.users) {
        registeredUsers.set(u.id, {
          ...u,
          rating: u.rating ?? 1200,
          xp: u.xp ?? (u.level ? u.level * 100 : 0),
          usdtBalance: 0,
          losses: u.losses ?? 0,
          winStreak: u.winStreak ?? 0,
          status: 'offline',
        });
      }
    }
    if (parsed.friendships && typeof parsed.friendships === 'object') {
      for (const [uid, friendsArr] of Object.entries(parsed.friendships)) {
        friendships.set(uid, new Set(friendsArr as string[]));
      }
    }
  }
} catch (e) {
  console.warn('[Store] Could not load backend store file:', e);
}

let pgPool: Pool | null = null;
let postgresWriteQueue: Promise<void> = Promise.resolve();

function buildStoreSnapshot() {
  const usersArr = Array.from(registeredUsers.values());
  const friendsObj: Record<string, string[]> = {};
  for (const [uid, set] of friendships.entries()) {
    friendsObj[uid] = Array.from(set);
  }
  return { users: usersArr, friendships: friendsObj, savedAt: Date.now() };
}

function persistStore() {
  const snapshot = buildStoreSnapshot();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(snapshot, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Store] Failed to write JSON fallback store:', e);
  }

  // Serialize writes so concurrent WebSocket events cannot overwrite newer state.
  if (pgPool) {
    postgresWriteQueue = postgresWriteQueue
      .then(async () => {
        const pool = pgPool;
        if (!pool) return;
        await pool.query(
          `INSERT INTO royal_backend_state (id, payload, updated_at)
           VALUES (1, $1::jsonb, NOW())
           ON CONFLICT (id) DO UPDATE
           SET payload = EXCLUDED.payload, updated_at = NOW()`,
          [JSON.stringify(snapshot)]
        );
      })
      .catch((e) => {
        console.error('[Postgres] Store write failed; JSON fallback remains available:', e);
      });
  }
}

async function initializePostgres() {
  if (!process.env.DATABASE_URL) {
    console.log('[Postgres] DATABASE_URL not set; using JSON file storage.');
    return;
  }

  const candidate = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30000,
    max: 5,
  });

  try {
    await candidate.query('SELECT 1');

    // Financial ledger foundation. Real-money endpoints remain disabled until
    // on-chain verification, custody controls, and payout approval are implemented.
    await candidate.query(`
      CREATE TABLE IF NOT EXISTS financial_accounts (
        id BIGSERIAL PRIMARY KEY,
        account_code TEXT NOT NULL UNIQUE,
        account_type TEXT NOT NULL CHECK (account_type IN (
          'user_available', 'user_locked', 'deposit_pending', 'withdrawal_pending',
          'platform_fee', 'treasury', 'chain_fee', 'suspense'
        )),
        user_id TEXT,
        asset_code TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, asset_code, account_type, account_code)
      );

      CREATE TABLE IF NOT EXISTS financial_journal_transactions (
        id BIGSERIAL PRIMARY KEY,
        event_key TEXT NOT NULL UNIQUE,
        kind TEXT NOT NULL CHECK (kind IN (
          'deposit', 'withdrawal', 'match_stake', 'match_refund', 'match_payout',
          'platform_fee', 'network_fee', 'adjustment', 'reversal', 'reconciliation'
        )),
        status TEXT NOT NULL CHECK (status IN (
          'pending', 'confirmed', 'posted', 'failed', 'reversed', 'held'
        )),
        asset_code TEXT NOT NULL,
        network TEXT,
        external_ref TEXT,
        related_match_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finalized_at TIMESTAMPTZ
      );

      CREATE UNIQUE INDEX IF NOT EXISTS financial_journal_external_ref_unique
        ON financial_journal_transactions (network, external_ref)
        WHERE external_ref IS NOT NULL;

      CREATE TABLE IF NOT EXISTS financial_journal_entries (
        id BIGSERIAL PRIMARY KEY,
        transaction_id BIGINT NOT NULL REFERENCES financial_journal_transactions(id),
        account_id BIGINT NOT NULL REFERENCES financial_accounts(id),
        asset_code TEXT NOT NULL,
        amount_atomic NUMERIC(78, 0) NOT NULL CHECK (amount_atomic <> 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS financial_journal_entries_transaction_idx
        ON financial_journal_entries (transaction_id);
      CREATE INDEX IF NOT EXISTS financial_journal_entries_account_idx
        ON financial_journal_entries (account_id, created_at);

      CREATE TABLE IF NOT EXISTS chain_transfers (
        id BIGSERIAL PRIMARY KEY,
        network TEXT NOT NULL,
        asset_code TEXT NOT NULL,
        token_contract TEXT,
        tx_hash TEXT NOT NULL,
        event_index INTEGER NOT NULL DEFAULT 0,
        block_number NUMERIC(78, 0),
        sender_address TEXT,
        recipient_address TEXT NOT NULL,
        amount_atomic NUMERIC(78, 0) NOT NULL CHECK (amount_atomic > 0),
        network_fee_atomic NUMERIC(78, 0) NOT NULL DEFAULT 0 CHECK (network_fee_atomic >= 0),
        network_fee_asset TEXT,
        confirmations INTEGER NOT NULL DEFAULT 0 CHECK (confirmations >= 0),
        chain_status TEXT NOT NULL CHECK (chain_status IN (
          'detected', 'confirming', 'confirmed', 'failed', 'reorged', 'ignored'
        )),
        raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        confirmed_at TIMESTAMPTZ,
        UNIQUE (network, tx_hash, event_index)
      );
      CREATE INDEX IF NOT EXISTS chain_transfers_recipient_idx
        ON chain_transfers (network, recipient_address, detected_at);

      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id BIGSERIAL PRIMARY KEY,
        request_key TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        network TEXT NOT NULL,
        asset_code TEXT NOT NULL,
        destination_address TEXT NOT NULL,
        amount_atomic NUMERIC(78, 0) NOT NULL CHECK (amount_atomic > 0),
        quoted_network_fee_atomic NUMERIC(78, 0) NOT NULL DEFAULT 0 CHECK (quoted_network_fee_atomic >= 0),
        actual_network_fee_atomic NUMERIC(78, 0),
        fee_asset TEXT,
        status TEXT NOT NULL CHECK (status IN (
          'requested', 'held', 'approved', 'broadcast', 'confirmed', 'rejected', 'cancelled', 'failed'
        )),
        reviewed_by TEXT,
        review_reason TEXT,
        tx_hash TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        confirmed_at TIMESTAMPTZ
      );
      CREATE UNIQUE INDEX IF NOT EXISTS withdrawal_requests_tx_hash_unique
        ON withdrawal_requests (network, tx_hash)
        WHERE tx_hash IS NOT NULL;

      CREATE TABLE IF NOT EXISTS match_escrows (
        id BIGSERIAL PRIMARY KEY,
        match_id TEXT NOT NULL UNIQUE,
        player_one_id TEXT NOT NULL,
        player_two_id TEXT NOT NULL,
        asset_code TEXT NOT NULL,
        stake_each_atomic NUMERIC(78, 0) NOT NULL CHECK (stake_each_atomic >= 0),
        platform_fee_atomic NUMERIC(78, 0) NOT NULL DEFAULT 0 CHECK (platform_fee_atomic >= 0),
        prize_atomic NUMERIC(78, 0) NOT NULL DEFAULT 0 CHECK (prize_atomic >= 0),
        winner_user_id TEXT,
        status TEXT NOT NULL CHECK (status IN (
          'created', 'funded', 'in_progress', 'settling', 'settled', 'refunding', 'refunded', 'disputed', 'cancelled'
        )),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        settled_at TIMESTAMPTZ,
        CHECK (player_one_id <> player_two_id),
        CHECK (winner_user_id IS NULL OR winner_user_id IN (player_one_id, player_two_id))
      );

      CREATE TABLE IF NOT EXISTS financial_audit_events (
        id BIGSERIAL PRIMARY KEY,
        event_key TEXT NOT NULL UNIQUE,
        actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'user', 'admin', 'chain_watcher')),
        actor_id TEXT,
        action TEXT NOT NULL,
        object_type TEXT NOT NULL,
        object_id TEXT,
        request_id TEXT,
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        previous_hash TEXT,
        event_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS financial_audit_events_created_idx
        ON financial_audit_events (created_at);
      CREATE INDEX IF NOT EXISTS financial_audit_events_object_idx
        ON financial_audit_events (object_type, object_id);

      CREATE TABLE IF NOT EXISTS financial_reconciliation_runs (
        id BIGSERIAL PRIMARY KEY,
        network TEXT NOT NULL,
        asset_code TEXT NOT NULL,
        wallet_address TEXT NOT NULL,
        chain_balance_atomic NUMERIC(78, 0) NOT NULL,
        ledger_liability_atomic NUMERIC(78, 0) NOT NULL,
        variance_atomic NUMERIC(78, 0) NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('matched', 'variance', 'failed')),
        report JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE OR REPLACE FUNCTION prevent_financial_record_mutation()
      RETURNS TRIGGER AS 'BEGIN
        RAISE EXCEPTION ''Financial journal and audit records are append-only'';
      END;' LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS financial_journal_entries_append_only ON financial_journal_entries;
      CREATE TRIGGER financial_journal_entries_append_only
        BEFORE UPDATE OR DELETE ON financial_journal_entries
        FOR EACH ROW EXECUTE FUNCTION prevent_financial_record_mutation();

      DROP TRIGGER IF EXISTS financial_audit_events_append_only ON financial_audit_events;
      CREATE TRIGGER financial_audit_events_append_only
        BEFORE UPDATE OR DELETE ON financial_audit_events
        FOR EACH ROW EXECUTE FUNCTION prevent_financial_record_mutation();
    `);
    await candidate.query(`
      CREATE TABLE IF NOT EXISTS royal_backend_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const result = await candidate.query(
      'SELECT payload FROM royal_backend_state WHERE id = 1'
    );

    if (result.rows.length > 0) {
      const saved = result.rows[0].payload;
      if (saved && Array.isArray(saved.users)) {
        registeredUsers.clear();
        for (const u of saved.users) {
          if (!u || typeof u.id !== 'string') continue;
          registeredUsers.set(u.id, {
            ...u,
            rating: u.rating ?? 1200,
            xp: u.xp ?? (u.level ? u.level * 100 : 0),
            usdtBalance: 0,
            losses: u.losses ?? 0,
            winStreak: u.winStreak ?? 0,
            status: 'offline',
          });
        }
      }
      if (saved && saved.friendships && typeof saved.friendships === 'object') {
        friendships.clear();
        for (const [uid, friendsArr] of Object.entries(saved.friendships)) {
          friendships.set(uid, new Set(Array.isArray(friendsArr) ? friendsArr as string[] : []));
        }
      }
      console.log(`[Postgres] Loaded ${registeredUsers.size} users from PostgreSQL.`);
    } else {
      const initialSnapshot = buildStoreSnapshot();
      await candidate.query(
        'INSERT INTO royal_backend_state (id, payload, updated_at) VALUES (1, $1::jsonb, NOW()) ON CONFLICT (id) DO NOTHING',
        [JSON.stringify(initialSnapshot)]
      );
      console.log('[Postgres] Initialized PostgreSQL from existing JSON data.');
    }

    pgPool = candidate;
    // Ensure the selected startup state is reflected in the JSON fallback too.
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(buildStoreSnapshot(), null, 2), 'utf-8');
    } catch (e) {
      console.warn('[Store] Could not refresh JSON fallback from PostgreSQL:', e);
    }
    console.log('[Postgres] Connected and persistent storage enabled.');
  } catch (e) {
    console.error('[Postgres] Initialization failed; continuing with JSON file storage:', e);
    await candidate.end().catch(() => undefined);
    pgPool = null;
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
app.use(express.json({ limit: '256kb' }));

// Separate administrator API. Configure ADMIN_PASSWORD and ADMIN_SESSION_SECRET
// in Render before enabling access. No financial mutations are exposed here.
const adminLoginAttempts = new Map<string, { count: number; until: number }>();
function safeEqualText(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
function makeAdminToken(exp: number): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('ADMIN_SESSION_SECRET must be at least 32 characters');
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return payload + '.' + signature;
}
function verifyAdminToken(token: string): boolean {
  try {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret || secret.length < 32) return false;
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return false;
    const expected = createHmac('sha256', secret).update(payload).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded.role === 'admin' && Number.isFinite(decoded.exp) && decoded.exp > Date.now();
  } catch { return false; }
}
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !verifyAdminToken(token)) {
    res.status(401).json({ error: 'Administrator authentication required' });
    return;
  }
  next();
}
app.post('/api/admin/login', (req, res) => {
  const ip = String(req.ip || req.socket.remoteAddress || 'unknown');
  const now = Date.now();
  const attempts = adminLoginAttempts.get(ip);
  if (attempts && attempts.until > now && attempts.count >= 8) {
    res.status(429).json({ error: 'Too many login attempts. Try again later.' });
    return;
  }
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!configuredPassword || !sessionSecret || sessionSecret.length < 32) {
    res.status(503).json({ error: 'Admin login is not configured. Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET in Render.' });
    return;
  }
  const supplied = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!safeEqualText(supplied, configuredPassword)) {
    const next = attempts && attempts.until > now ? attempts : { count: 0, until: now + 15 * 60 * 1000 };
    next.count += 1;
    adminLoginAttempts.set(ip, next);
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  adminLoginAttempts.delete(ip);
  try {
    res.json({ token: makeAdminToken(now + 20 * 60 * 1000), expiresIn: 1200 });
  } catch {
    res.status(503).json({ error: 'Admin session signing is not configured' });
  }
});
app.get('/api/admin/overview', requireAdmin, async (_req, res) => {
  try {
    if (!pgPool) {
      res.status(503).json({ error: 'PostgreSQL is unavailable; financial dashboard is read-only and unavailable until DATABASE_URL is connected.' });
      return;
    }
    const [ledger, transfers, withdrawals, audit, matches] = await Promise.all([
      pgPool.query("SELECT COUNT(*)::text AS total, COUNT(*) FILTER (WHERE status='posted')::text AS posted, COUNT(*) FILTER (WHERE status IN ('pending','held'))::text AS pending FROM financial_journal_transactions"),
      pgPool.query("SELECT COUNT(*)::text AS total, COUNT(*) FILTER (WHERE chain_status='confirmed')::text AS confirmed, COUNT(*) FILTER (WHERE chain_status IN ('detected','confirming'))::text AS pending FROM chain_transfers"),
      pgPool.query("SELECT COUNT(*)::text AS total, COUNT(*) FILTER (WHERE status IN ('requested','held','approved','broadcast'))::text AS pending FROM withdrawal_requests"),
      pgPool.query("SELECT COUNT(*)::text AS total FROM financial_audit_events"),
      pgPool.query("SELECT COUNT(*)::text AS total, COUNT(*) FILTER (WHERE status='disputed')::text AS disputed FROM match_escrows")
    ]);
    res.json({
      generatedAt: new Date().toISOString(),
      system: { database: 'connected', onlineUsers: userSockets.size, activeRooms: activeRooms.size, registeredUsers: registeredUsers.size },
      ledger: ledger.rows[0], transfers: transfers.rows[0], withdrawals: withdrawals.rows[0],
      audit: audit.rows[0], matches: matches.rows[0],
      safety: { realMoneyEnabled: false, message: 'Financial operations remain disabled until chain verification and payout controls are implemented.' }
    });
  } catch (error) {
    console.error('[Admin] overview failed', error);
    res.status(500).json({ error: 'Could not load financial overview' });
  }
});
app.get('/api/admin/ledger', requireAdmin, async (req, res) => {
  try {
    if (!pgPool) { res.status(503).json({ error: 'PostgreSQL unavailable' }); return; }
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const result = await pgPool.query(
      `SELECT id, event_key, kind, status, asset_code, network, external_ref, related_match_id, metadata, created_at, finalized_at
       FROM financial_journal_transactions ORDER BY created_at DESC LIMIT $1`, [limit]);
    res.json({ items: result.rows });
  } catch (error) { console.error('[Admin] ledger failed', error); res.status(500).json({ error: 'Could not load ledger' }); }
});
app.get('/api/admin/transfers', requireAdmin, async (req, res) => {
  try {
    if (!pgPool) { res.status(503).json({ error: 'PostgreSQL unavailable' }); return; }
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const result = await pgPool.query(
      `SELECT id, network, asset_code, token_contract, tx_hash, event_index, block_number, sender_address, recipient_address, amount_atomic, network_fee_atomic, network_fee_asset, confirmations, chain_status, detected_at, confirmed_at
       FROM chain_transfers ORDER BY detected_at DESC LIMIT $1`, [limit]);
    res.json({ items: result.rows });
  } catch (error) { console.error('[Admin] transfers failed', error); res.status(500).json({ error: 'Could not load blockchain transfers' }); }
});
app.get('/api/admin/withdrawals', requireAdmin, async (req, res) => {
  try {
    if (!pgPool) { res.status(503).json({ error: 'PostgreSQL unavailable' }); return; }
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const result = await pgPool.query(
      `SELECT id, request_key, user_id, network, asset_code, destination_address, amount_atomic, quoted_network_fee_atomic, actual_network_fee_atomic, fee_asset, status, reviewed_by, review_reason, tx_hash, created_at, updated_at, confirmed_at
       FROM withdrawal_requests ORDER BY created_at DESC LIMIT $1`, [limit]);
    res.json({ items: result.rows });
  } catch (error) { console.error('[Admin] withdrawals failed', error); res.status(500).json({ error: 'Could not load withdrawals' }); }
});
app.get('/api/admin/audit', requireAdmin, async (req, res) => {
  try {
    if (!pgPool) { res.status(503).json({ error: 'PostgreSQL unavailable' }); return; }
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const result = await pgPool.query(
      `SELECT id, event_key, actor_type, actor_id, action, object_type, object_id, request_id, details, previous_hash, event_hash, created_at
       FROM financial_audit_events ORDER BY created_at DESC LIMIT $1`, [limit]);
    res.json({ items: result.rows });
  } catch (error) { console.error('[Admin] audit failed', error); res.status(500).json({ error: 'Could not load audit events' }); }
});
app.get('/admin', (_req, res) => res.redirect('/admin/'));

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
    case 'auth:telegram': {
      const identity = verifyTelegramInitData(msg.initData);
      if (!identity) {
        sendMsg(ws, { type: 'error', message: 'Telegram authentication failed. Open the game from the official Telegram bot and try again.' });
        ws.close(1008, 'Telegram authentication failed');
        return;
      }
      verifiedTelegramUsers.set(ws, identity);
      sendMsg(ws, { type: 'auth:success', telegramUserId: identity.id });
      break;
    }

    case 'user:register': {
      const identity = verifiedTelegramUsers.get(ws);
      if (!identity) {
        sendMsg(ws, { type: 'error', message: 'Telegram authentication is required.' });
        ws.close(1008, 'Authentication required');
        return;
      }
      const id = identity.id;
      const cleanName = identity.username;
      const existing = registeredUsers.get(id);
      const userXp = existing?.xp ?? 0;
      const computedLvl = calculateLevelFromXp(userXp);
      const userRating = existing?.rating ?? 1200;
      const userUsdt = existing?.usdtBalance ?? 0;

      const onlineUser: OnlineUser = {
        id,
        username: cleanName,
        level: computedLvl,
        xp: userXp,
        rating: userRating,
        usdtBalance: userUsdt,
        wins: existing?.wins ?? 0,
        losses: existing?.losses ?? 0,
        winStreak: existing?.winStreak ?? 0,
        matchesPlayed: existing?.matchesPlayed ?? 0,
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
      sendMsg(ws, { type: 'error', message: 'Deposits are disabled until on-chain payment verification is enabled.' });
      break;
    }

    case 'wallet:withdraw': {
      sendMsg(ws, { type: 'error', message: 'Withdrawals are disabled until secure payout processing is enabled.' });
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

      const requestedAmount = Number(msg.amountUsdt ?? 0);
      if (!Number.isFinite(requestedAmount) || requestedAmount < 0) {
        sendMsg(ws, { type: 'error', message: 'Match amount must be zero or greater.' });
        return;
      }
      const amountUsdt = Math.round(requestedAmount * 100) / 100;
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
        amountUsdt,
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

      const challengerWs = userSockets.get(challenge.challenger.id);
      if (!msg.accept) {
        activeChallenges.delete(msg.challengeId);
        if (challengerWs) sendMsg(challengerWs, {
          type: 'friend:challenge_declined',
          reason: 'Challenge was declined',
        });
        return;
      }

      if (challenge.amountUsdt > 0) {
        activeChallenges.delete(msg.challengeId);
        sendMsg(ws, { type: 'error', message: 'Paid matches are not active yet. No funds were taken. Send a 0 USDT challenge for a free match.' });
        if (challengerWs) sendMsg(challengerWs, {
          type: 'friend:challenge_declined',
          reason: 'Paid matches are not active yet. No funds were taken.',
        });
        return;
      }

      activeChallenges.delete(msg.challengeId);
      if (!challengerWs) {
        sendMsg(ws, { type: 'error', message: 'Challenger has gone offline' });
        return;
      }

      const userTarget = registeredUsers.get(senderId);
      const userChallenger = registeredUsers.get(challenge.challenger.id);
      if (!userTarget || !userChallenger) {
        sendMsg(ws, { type: 'error', message: 'One of the players is no longer registered.' });
        return;
      }

      launchTwoPlayerRoom(challengerWs, userChallenger, ws, userTarget, 'friend_match', 1);
      break;
    }

    case 'matchmaking:join': {
      sendMsg(ws, { type: 'error', message: 'Paid online matches are temporarily disabled while secure wallet and server-side game validation are completed.' });
      return;
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

        // Deduct entry fee from both
        sender.usdtBalance = Math.round((sender.usdtBalance - tierConfig.entry) * 100) / 100;
        opponentUser.usdtBalance = Math.round((opponentUser.usdtBalance - tierConfig.entry) * 100) / 100;

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

        winnerUser.wins += 1;
        winnerUser.matchesPlayed += 1;
        winnerUser.winStreak = (winnerUser.winStreak || 0) + 1;
        winnerUser.xp = (winnerUser.xp || 0) + 50;
        winnerUser.rating = (winnerUser.rating || 1200) + 24;
        winnerUser.level = calculateLevelFromXp(winnerUser.xp);
        winnerUser.usdtBalance = Math.round((winnerUser.usdtBalance + room.prizePoolUsdt) * 100) / 100;
        winnerUser.status = 'online';

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

        winnerUser.wins += 1;
        winnerUser.matchesPlayed += 1;
        winnerUser.xp = (winnerUser.xp || 0) + 40;
        winnerUser.rating = (winnerUser.rating || 1200) + 20;
        winnerUser.level = calculateLevelFromXp(winnerUser.xp);
        winnerUser.usdtBalance = Math.round((winnerUser.usdtBalance + room.prizePoolUsdt) * 100) / 100;
        winnerUser.status = 'online';

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
    entryFeeUsdt: mode === 'friend_match' ? 0 : tierConfig.entry,
    prizePoolUsdt: mode === 'friend_match' ? 0 : tierConfig.prize,
    mode,
    playerLight: { socket: socketLight, user: playerLightUser },
    playerDark: { socket: socketDark, user: playerDarkUser },
    createdAt: Date.now(),
  };

  activeRooms.set(roomId, room);

  const baseRoomState = {
    roomId,
    tierId,
    entryFeeUsdt: mode === 'friend_match' ? 0 : tierConfig.entry,
    prizePoolUsdt: mode === 'friend_match' ? 0 : tierConfig.prize,
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
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
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
const PORT = portArg || (process.env.NODE_ENV === 'production' && process.env.PORT ? Number(process.env.PORT) : 3000);
await initializePostgres();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Royal Backgammon Engine] Full-stack Server listening on http://0.0.0.0:${PORT}`);
});
