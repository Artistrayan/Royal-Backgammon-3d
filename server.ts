import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

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
          usdtBalance: typeof u.usdtBalance === 'number' ? u.usdtBalance : 25,
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
            usdtBalance: typeof u.usdtBalance === 'number' ? u.usdtBalance : 25,
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

      user.usdtBalance = Math.round((user.usdtBalance + depositAmount) * 100) / 100;
      persistStore();

      sendMsg(ws, {
        type: 'wallet:updated',
        newUsdtBalance: user.usdtBalance,
        txId: msg.txHash || `dep-${Date.now()}`,
        actionType: 'deposit',
        amount: depositAmount,
        description: `Deposit ${depositAmount} USDT (${msg.network || 'TRC20'}) confirmed`,
      });
      break;
    }

    case 'wallet:withdraw': {
      const senderId = socketToUserId.get(ws);
      if (!senderId) return;
      const user = registeredUsers.get(senderId);
      if (!user) return;

      const withdrawAmount = Number(msg.amountUsdt);
      if (isNaN(withdrawAmount) || withdrawAmount < 5) {
        sendMsg(ws, { type: 'error', message: 'Minimum withdrawal is 5 USDT' });
        return;
      }

      if (user.usdtBalance < withdrawAmount) {
        sendMsg(ws, { type: 'error', message: 'Insufficient USDT balance' });
        return;
      }

      user.usdtBalance = Math.round((user.usdtBalance - withdrawAmount) * 100) / 100;
      persistStore();

      sendMsg(ws, {
        type: 'wallet:updated',
        newUsdtBalance: user.usdtBalance,
        txId: `wd-${Date.now()}`,
        actionType: 'withdraw',
        amount: withdrawAmount,
        description: `Withdrawal of ${withdrawAmount} USDT to ${msg.destinationAddress?.slice(0, 8)}... queued`,
      });
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
