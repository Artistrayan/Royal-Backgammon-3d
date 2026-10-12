import {
  ClientToServerMessage,
  ServerToClientMessage,
  OnlineUser,
  FriendRequest,
  FriendChallenge,
  OnlineGameRoomState,
} from './multiplayerTypes';
import { BoardLocation, CheckerState3D } from '../libgdx/Gdx3DEngine';

type Listener<T> = (data: T) => void;

class RealMultiplayerClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private currentUser: {
    id: string;
    username: string;
    wins: number;
    matchesPlayed: number;
  } | null = null;
  private listeners: Map<string, Set<Listener<any>>> = new Map();
  private pendingQueue: ClientToServerMessage[] = [];

  public isConnected = false;

  public connect(user: {
    id: string;
    username: string;
    wins: number;
    matchesPlayed: number;
  }) {
    this.currentUser = user;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      // Re-register if already connected
      this.send({ type: 'user:register', user });
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.emit('connection_status', { connected: true });
        if (this.currentUser) {
          this.send({ type: 'user:register', user: this.currentUser });
        }
        // Flush queue
        while (this.pendingQueue.length > 0) {
          const msg = this.pendingQueue.shift();
          if (msg) this.send(msg);
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const msg: ServerToClientMessage = JSON.parse(event.data);
          this.emit(msg.type, msg);
        } catch (err) {
          console.warn('[WS Client] Failed to parse message', err);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.emit('connection_status', { connected: false });
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.isConnected = false;
      };
    } catch (err) {
      console.warn('[WS Client] Connection initialization error', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = window.setTimeout(() => {
      if (this.currentUser) {
        this.connect(this.currentUser);
      }
    }, 2800);
  }

  public send(msg: ClientToServerMessage) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    } else {
      this.pendingQueue.push(msg);
    }
  }

  public on<T = any>(event: string, listener: Listener<T>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  public off<T = any>(event: string, listener: Listener<T>) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
    }
  }

  private emit(event: string, data: any) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((fn) => {
        try {
          fn(data);
        } catch (e) {
          console.error(`Error in listener for ${event}`, e);
        }
      });
    }
  }

  // API Methods
  public searchUsers(query: string) {
    this.send({ type: 'users:search', query });
  }

  public fetchFriends() {
    this.send({ type: 'friends:get' });
  }

  public sendFriendRequest(targetUserId: string) {
    this.send({ type: 'friend:request_send', targetUserId });
  }

  public acceptFriendRequest(requestId: string) {
    this.send({ type: 'friend:request_accept', requestId });
  }

  public rejectFriendRequest(requestId: string) {
    this.send({ type: 'friend:request_reject', requestId });
  }

  public sendFriendChallenge(targetUserId: string) {
    this.send({ type: 'friend:challenge_send', targetUserId });
  }

  public respondFriendChallenge(challengeId: string, accept: boolean) {
    this.send({ type: 'friend:challenge_respond', challengeId, accept });
  }

  public joinMatchmaking(level: number, mode: 'online_match' | 'quick_seat') {
    this.send({ type: 'matchmaking:join', level, mode });
  }

  public cancelMatchmaking() {
    this.send({ type: 'matchmaking:cancel' });
  }

  public sendDiceRoll(
    roomId: string,
    dice: [number, number],
    proofHash: string
  ) {
    this.send({ type: 'game:dice_roll', roomId, dice, proofHash });
  }

  public sendMoveStep(
    roomId: string,
    fromLoc: BoardLocation,
    toLoc: BoardLocation,
    dieUsed: number,
    isCaptureHit: boolean,
    newCheckers: CheckerState3D[],
    nextRemainingDice: number[],
    nextTurn: 'light' | 'dark',
    winner: 'light' | 'dark' | null,
    victoryBanner: string | null
  ) {
    this.send({
      type: 'game:move_step',
      roomId,
      fromLoc,
      toLoc,
      dieUsed,
      isCaptureHit,
      newCheckers,
      nextRemainingDice,
      nextTurn,
      winner,
      victoryBanner,
    });
  }

  public sendCubeOffer(roomId: string, proposedValue: number) {
    this.send({ type: 'game:cube_offer', roomId, proposedValue });
  }

  public sendCubeRespond(roomId: string, take: boolean) {
    this.send({ type: 'game:cube_respond', roomId, take });
  }

  public leaveRoom(roomId: string) {
    this.send({ type: 'game:leave', roomId });
  }

  public disconnect() {
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
  }
}

export const multiplayerClient = new RealMultiplayerClient();
