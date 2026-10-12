import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface OnlineUser {
  id: string;
  username: string;
  level: number;
  wins: number;
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
    wins: number;
  };
  targetUserId: string;
  createdAt: number;
}

interface MatchQueueItem {
  socket: WebSocket;
  userId: string;
  level: number;
  mode: 'online_match' | 'quick_seat';
  joinedAt: number;
}

interface ActiveGameRoom {
  roomId: string;
  mode: 'online_match' | 'friend_match' | 'quick_seat';
  playerLight: { socket: WebSocket; user: OnlineUser };
  playerDark: { socket: WebSocket; user: OnlineUser };
  createdAt: number;
}

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
        registeredUsers.set(u.id, { ...u, status: 'offline' });
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

function persistStore() {
  try {
    const usersArr = Array.from(registeredUsers.values());
    const friendsObj: Record<string, string[]> = {};
    for (const [uid, set] of friendships.entries()) {
      friendsObj[uid] = Array.from(set);
    }
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({ users: usersArr, friendships: friendsObj }, null, 2)
    );
  } catch (e) {
    console.error('[Store] Failed to write backend store file:', e);
  }
}

// Compute player level from wins (Level 1 to 50+)
function computePlayerLevel(wins: number, matches: number): number {
  return Math.max(1, Math.floor(wins / 2) + 1);
}

const app = express();
app.use(express.json());

// API health endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    onlineUsers: userSockets.size,
    totalRegistered: registeredUsers.size,
    activeRooms: activeRooms.size,
    queueSize: matchmakingQueue.length,
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

function sendMsg(ws: WebSocket, payload: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function getFriendsListPayload(userId: string) {
  const friendIds = friendships.get(userId) || new Set<string>();
  const friends: OnlineUser[] = [];
  for (const fId of friendIds) {
    const u = registeredUsers.get(fId);
    if (u) {
      const isOnline = userSockets.has(fId);
      friends.push({
        ...u,
        status: isOnline ? (u.status === 'in_game' ? 'in_game' : 'online') : 'offline',
      });
    }
  }

  const incomingRequests: FriendRequest[] = [];
  const outgoingRequests: FriendRequest[] = [];
  for (const req of friendRequests.values()) {
    if (req.toUserId === userId) {
      incomingRequests.push(req);
    } else if (req.fromUser.id === userId) {
      outgoingRequests.push(req);
    }
  }

  return { friends, incomingRequests, outgoingRequests };
}

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      handleClientMessage(ws, data);
    } catch (err) {
      console.warn('[WS] Invalid json from client', err);
    }
  });

  ws.on('close', () => {
    handleClientDisconnect(ws);
  });
});

function handleClientDisconnect(ws: WebSocket) {
  const userId = socketToUserId.get(ws);
  if (!userId) return;

  socketToUserId.delete(ws);
  if (userSockets.get(userId) === ws) {
    userSockets.delete(userId);
  }

  // Remove from matchmaking queue
  const qIdx = matchmakingQueue.findIndex((item) => item.userId === userId);
  if (qIdx !== -1) {
    matchmakingQueue.splice(qIdx, 1);
  }

  // Update status in registry
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
      const { id, username, wins, matchesPlayed } = msg.user;
      const cleanName = (username || 'PLAYER').trim().slice(0, 18).toUpperCase();
      const level = computePlayerLevel(wins || 0, matchesPlayed || 0);

      const existing = registeredUsers.get(id);
      const onlineUser: OnlineUser = {
        id,
        username: cleanName,
        level,
        wins: wins || existing?.wins || 0,
        matchesPlayed: matchesPlayed || existing?.matchesPlayed || 0,
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

      // Check if already friends
      const userFriends = friendships.get(senderId);
      if (userFriends && userFriends.has(targetId)) return;

      // Check existing pending request
      const reqId = `freq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const req: FriendRequest = {
        id: reqId,
        fromUser: {
          id: sender.id,
          username: sender.username,
          level: sender.level,
          wins: sender.wins,
        },
        toUserId: targetId,
        createdAt: Date.now(),
      };
      friendRequests.set(reqId, req);

      // Notify target if online
      const targetWs = userSockets.get(targetId);
      if (targetWs) {
        sendMsg(targetWs, {
          type: 'friend:request_received',
          request: req,
        });
        sendMsg(targetWs, {
          type: 'friends:list',
          ...getFriendsListPayload(targetId),
        });
      }

      // Notify sender with updated list
      sendMsg(ws, {
        type: 'friends:list',
        ...getFriendsListPayload(senderId),
      });
      break;
    }

    case 'friend:request_accept': {
      const senderId = socketToUserId.get(ws);
      const req = friendRequests.get(msg.requestId);
      if (!senderId || !req || req.toUserId !== senderId) return;

      friendRequests.delete(msg.requestId);

      // Add bidirectional friendship
      if (!friendships.has(senderId)) friendships.set(senderId, new Set());
      friendships.get(senderId)!.add(req.fromUser.id);

      if (!friendships.has(req.fromUser.id)) friendships.set(req.fromUser.id, new Set());
      friendships.get(req.fromUser.id)!.add(senderId);

      persistStore();

      // Notify both parties
      sendMsg(ws, {
        type: 'friends:list',
        ...getFriendsListPayload(senderId),
      });

      const otherWs = userSockets.get(req.fromUser.id);
      if (otherWs) {
        sendMsg(otherWs, {
          type: 'friends:list',
          ...getFriendsListPayload(req.fromUser.id),
        });
      }
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

      // Start match between friends!
      launchTwoPlayerRoom(
        challengerWs,
        userChallenger,
        ws,
        userTarget,
        'friend_match'
      );
      break;
    }

    case 'matchmaking:join': {
      const senderId = socketToUserId.get(ws);
      if (!senderId) return;
      const sender = registeredUsers.get(senderId);
      if (!sender) return;

      // Remove from any previous queue entry
      const existingIdx = matchmakingQueue.findIndex((q) => q.userId === senderId);
      if (existingIdx !== -1) matchmakingQueue.splice(existingIdx, 1);

      // Search for suitable opponent in queue based on player level
      const playerLevel = sender.level;
      let matchedIdx = -1;
      let minLevelDiff = Infinity;

      for (let i = 0; i < matchmakingQueue.length; i++) {
        const item = matchmakingQueue[i];
        if (item.userId === senderId) continue;
        const diff = Math.abs(item.level - playerLevel);
        if (diff < minLevelDiff) {
          minLevelDiff = diff;
          matchedIdx = i;
        }
      }

      if (matchedIdx !== -1) {
        // Match found!
        const opponentItem = matchmakingQueue.splice(matchedIdx, 1)[0];
        const opponentUser = registeredUsers.get(opponentItem.userId)!;

        launchTwoPlayerRoom(
          ws,
          sender,
          opponentItem.socket,
          opponentUser,
          msg.mode || 'online_match'
        );
      } else {
        // Enqueue
        matchmakingQueue.push({
          socket: ws,
          userId: senderId,
          level: playerLevel,
          mode: msg.mode || 'online_match',
          joinedAt: Date.now(),
        });

        sendMsg(ws, {
          type: 'matchmaking:waiting',
          level: playerLevel,
          queueCount: matchmakingQueue.length,
          message: `Searching for Level ${playerLevel} real opponent...`,
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
        // Record win in stats
        const winnerUser = msg.winner === 'light' ? room.playerLight.user : room.playerDark.user;
        const loserUser = msg.winner === 'light' ? room.playerDark.user : room.playerLight.user;
        winnerUser.wins += 1;
        winnerUser.matchesPlayed += 1;
        loserUser.matchesPlayed += 1;
        winnerUser.level = computePlayerLevel(winnerUser.wins, winnerUser.matchesPlayed);
        loserUser.level = computePlayerLevel(loserUser.wins, loserUser.matchesPlayed);
        winnerUser.status = 'online';
        loserUser.status = 'online';
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
        take: msg.take,
        cubeValue: msg.take ? msg.proposedValue : 1,
        cubeOwner: responderColor,
        winner: !msg.take ? (responderColor === 'light' ? 'dark' : 'light') : null,
        victoryBanner: !msg.take ? `CUBE DROPPED • FORFEIT` : null,
      });
      sendMsg(room.playerDark.socket, {
        type: 'game:cube_responded',
        take: msg.take,
        cubeValue: msg.take ? msg.proposedValue : 1,
        cubeOwner: responderColor,
        winner: !msg.take ? (responderColor === 'light' ? 'dark' : 'light') : null,
        victoryBanner: !msg.take ? `CUBE DROPPED • FORFEIT` : null,
      });
      break;
    }

    case 'game:leave': {
      const room = activeRooms.get(msg.roomId);
      if (room) {
        const senderId = socketToUserId.get(ws);
        const recipientWs = room.playerLight.user.id === senderId ? room.playerDark.socket : room.playerLight.socket;
        sendMsg(recipientWs, {
          type: 'game:opponent_left',
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
  mode: 'online_match' | 'friend_match' | 'quick_seat'
) {
  const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

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
    mode,
    playerLight: { socket: socketLight, user: playerLightUser },
    playerDark: { socket: socketDark, user: playerDarkUser },
    createdAt: Date.now(),
  };

  activeRooms.set(roomId, room);

  // Send match found to Player Light
  sendMsg(socketLight, {
    type: 'game:match_found',
    room: {
      roomId,
      mode,
      playerLight: playerLightUser,
      playerDark: playerDarkUser,
      currentTurn: 'light',
      turnTimeLeft: 25,
      diceValues: [6, 6],
      remainingDice: [],
      hasRolled: false,
      doublingCubeValue: 1,
      doublingCubeOwner: 'center',
      pendingDoubleOffer: null,
      winner: null,
      victoryBanner: null,
    },
    assignedColor: 'light',
    opponent: playerDarkUser,
  });

  // Send match found to Player Dark
  sendMsg(socketDark, {
    type: 'game:match_found',
    room: {
      roomId,
      mode,
      playerLight: playerLightUser,
      playerDark: playerDarkUser,
      currentTurn: 'light',
      turnTimeLeft: 25,
      diceValues: [6, 6],
      remainingDice: [],
      hasRolled: false,
      doublingCubeValue: 1,
      doublingCubeOwner: 'center',
      pendingDoubleOffer: null,
      winner: null,
      victoryBanner: null,
    },
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

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Royal Backgammon Engine] Full-stack Server listening on http://0.0.0.0:${PORT}`);
});
