import { BoardLocation, CheckerState3D } from '../libgdx/Gdx3DEngine';

export interface OnlineUser {
  id: string;
  username: string;
  level: number;
  wins: number;
  matchesPlayed: number;
  status: 'online' | 'in_game' | 'offline';
  lastSeen: number;
}

export interface FriendRequest {
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

export interface FriendChallenge {
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

export interface OnlineGameRoomState {
  roomId: string;
  mode: 'online_match' | 'friend_match' | 'quick_seat';
  playerLight: OnlineUser;
  playerDark: OnlineUser;
  currentTurn: 'light' | 'dark';
  turnTimeLeft: number;
  checkers: CheckerState3D[];
  diceValues: [number, number];
  remainingDice: number[];
  hasRolled: boolean;
  doublingCubeValue: number;
  doublingCubeOwner: 'center' | 'light' | 'dark';
  pendingDoubleOffer: {
    offeredBy: 'light' | 'dark';
    proposedValue: number;
  } | null;
  winner: 'light' | 'dark' | null;
  victoryBanner: string | null;
}

export type ClientToServerMessage =
  | {
      type: 'user:register';
      user: {
        id: string;
        username: string;
        wins: number;
        matchesPlayed: number;
      };
    }
  | { type: 'users:search'; query: string }
  | { type: 'friends:get' }
  | { type: 'friend:request_send'; targetUserId: string }
  | { type: 'friend:request_accept'; requestId: string }
  | { type: 'friend:request_reject'; requestId: string }
  | { type: 'friend:challenge_send'; targetUserId: string }
  | { type: 'friend:challenge_respond'; challengeId: string; accept: boolean }
  | { type: 'matchmaking:join'; level: number; mode: 'online_match' | 'quick_seat' }
  | { type: 'matchmaking:cancel' }
  | {
      type: 'game:dice_roll';
      roomId: string;
      dice: [number, number];
      proofHash: string;
    }
  | {
      type: 'game:move_step';
      roomId: string;
      fromLoc: BoardLocation;
      toLoc: BoardLocation;
      dieUsed: number;
      isCaptureHit: boolean;
      newCheckers: CheckerState3D[];
      nextRemainingDice: number[];
      nextTurn: 'light' | 'dark';
      winner: 'light' | 'dark' | null;
      victoryBanner: string | null;
    }
  | {
      type: 'game:cube_offer';
      roomId: string;
      proposedValue: number;
    }
  | {
      type: 'game:cube_respond';
      roomId: string;
      take: boolean;
    }
  | {
      type: 'game:leave';
      roomId: string;
    };

export type ServerToClientMessage =
  | {
      type: 'user:registered';
      user: OnlineUser;
      onlineCount: number;
    }
  | {
      type: 'users:search_result';
      query: string;
      users: OnlineUser[];
    }
  | {
      type: 'friends:list';
      friends: OnlineUser[];
      incomingRequests: FriendRequest[];
      outgoingRequests: FriendRequest[];
    }
  | {
      type: 'friend:request_received';
      request: FriendRequest;
    }
  | {
      type: 'friend:challenge_received';
      challenge: FriendChallenge;
    }
  | {
      type: 'friend:challenge_declined';
      reason: string;
    }
  | {
      type: 'matchmaking:waiting';
      level: number;
      queueCount: number;
      message: string;
    }
  | {
      type: 'game:match_found';
      room: OnlineGameRoomState;
      assignedColor: 'light' | 'dark';
      opponent: OnlineUser;
    }
  | {
      type: 'game:dice_rolled';
      byColor: 'light' | 'dark';
      dice: [number, number];
      remainingDice: number[];
      proofHash: string;
    }
  | {
      type: 'game:opponent_moved';
      fromLoc: BoardLocation;
      toLoc: BoardLocation;
      dieUsed: number;
      isCaptureHit: boolean;
      newCheckers: CheckerState3D[];
      nextRemainingDice: number[];
      nextTurn: 'light' | 'dark';
      winner: 'light' | 'dark' | null;
      victoryBanner: string | null;
    }
  | {
      type: 'game:cube_offered';
      offeredBy: 'light' | 'dark';
      proposedValue: number;
    }
  | {
      type: 'game:cube_responded';
      take: boolean;
      cubeValue: number;
      cubeOwner: 'light' | 'dark';
      winner: 'light' | 'dark' | null;
      victoryBanner: string | null;
    }
  | {
      type: 'game:opponent_left';
      message: string;
    }
  | {
      type: 'error';
      message: string;
    };
