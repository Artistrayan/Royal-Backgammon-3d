import { BoardLocation, CheckerState3D } from '../libgdx/Gdx3DEngine';

export interface OnlineTier {
  id: 1 | 2 | 3 | 4 | 5;
  name: string;
  persianName: string;
  badge: string;
  entryFeeUsdt: number;
  prizePoolUsdt: number;
  rakePercent: number;
  rakeAmountUsdt: number;
  minLevel: number;
  maxLevel: number;
  color: string;
  bgGradient: string;
  description: string;
  matchFormat: string;
  targetWins: number;
  isLeague?: boolean;
}

export const ONLINE_TIERS: OnlineTier[] = [
  {
    id: 1,
    name: 'Bronze Novice Saloon',
    persianName: 'سالن نوآموزان برنز',
    badge: 'TIER I',
    entryFeeUsdt: 1,
    prizePoolUsdt: 1.7,
    rakePercent: 15,
    rakeAmountUsdt: 0.3,
    minLevel: 0,
    maxLevel: 10,
    color: '#cd7f32',
    bgGradient: 'from-[#2e1d10] to-[#120a05]',
    description: 'ورودی ۱ تتر • کارمزد ۱۵٪ • جایزه ۱.۷۰ تتر',
    matchFormat: 'فقط یک دست (تک مسابقه برای برد سریع)',
    targetWins: 1,
  },
  {
    id: 2,
    name: 'Silver Master Guild',
    persianName: 'محفل استادان نقره',
    badge: 'TIER II',
    entryFeeUsdt: 2,
    prizePoolUsdt: 3.4,
    rakePercent: 15,
    rakeAmountUsdt: 0.6,
    minLevel: 11,
    maxLevel: 25,
    color: '#c0c0c0',
    bgGradient: 'from-[#1c242b] to-[#0a0f14]',
    description: 'ورودی ۲ تتر • کارمزد ۱۵٪ • جایزه ۳.۴۰ تتر',
    matchFormat: '۲ دست بازی (در صورت تساوی ۱-۱ دست سوم اضافه)',
    targetWins: 2,
  },
  {
    id: 3,
    name: 'Gold Grandmaster Arena',
    persianName: 'میدان گرندمسترهای زرین',
    badge: 'TIER III',
    entryFeeUsdt: 5,
    prizePoolUsdt: 8.5,
    rakePercent: 15,
    rakeAmountUsdt: 1.5,
    minLevel: 26,
    maxLevel: 50,
    color: '#e5c158',
    bgGradient: 'from-[#2b220d] to-[#120d04]',
    description: 'ورودی ۵ تتر • کارمزد ۱۵٪ • جایزه ۸.۵۰ تتر',
    matchFormat: 'مسابقه در ۳ دست برد (۳ پیروزی برای برنده)',
    targetWins: 3,
  },
  {
    id: 4,
    name: 'Platinum High-Roller Court',
    persianName: 'دربار های‌رولر پلاتین',
    badge: 'TIER IV',
    entryFeeUsdt: 10,
    prizePoolUsdt: 17.0,
    rakePercent: 15,
    rakeAmountUsdt: 3.0,
    minLevel: 51,
    maxLevel: 80,
    color: '#9ae6b4',
    bgGradient: 'from-[#0b291d] to-[#04120c]',
    description: 'ورودی ۱۰ تتر • کارمزد ۱۵٪ • جایزه ۱۷.۰۰ تتر',
    matchFormat: 'مسابقه در ۳ دست بازی سنگین (۳ راند برد)',
    targetWins: 3,
  },
  {
    id: 5,
    name: 'Royal Sovereign Champions League',
    persianName: 'سوپر لیگ سلطنتی قهرمانان (۱۰ نفره)',
    badge: 'TIER V • LEAGUE',
    entryFeeUsdt: 25,
    prizePoolUsdt: 212.5,
    rakePercent: 15,
    rakeAmountUsdt: 37.5,
    minLevel: 81,
    maxLevel: 999,
    color: '#f6ad55',
    bgGradient: 'from-[#2f1838] to-[#130717]',
    description: 'ورودی ۲۵ تتر • کارمزد ۱۵٪ • مجموع جوایز ۲۱۲.۵۰ تتر',
    matchFormat: 'لیگ مسابقاتی با ۱۰ بازیکن • جدول رده‌بندی و جوایز ۳ نفر اول',
    targetWins: 5,
    isLeague: true,
  },
];

export function getTierForLevel(level: number): OnlineTier {
  for (const t of ONLINE_TIERS) {
    if (level >= t.minLevel && level <= t.maxLevel) {
      return t;
    }
  }
  return ONLINE_TIERS[ONLINE_TIERS.length - 1];
}

export interface OnlineUser {
  id: string;
  username: string;
  level: number;
  xp: number;
  rating: number; // Global ELO (start at 1200)
  usdtBalance: number;
  wins: number;
  losses: number;
  winStreak: number;
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
    rating?: number;
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
    rating?: number;
    wins: number;
  };
  targetUserId: string;
  createdAt: number;
  amountUsdt?: number;
}

export interface OnlineGameRoomState {
  roomId: string;
  tierId: 1 | 2 | 3 | 4 | 5;
  entryFeeUsdt: number;
  prizePoolUsdt: number;
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
  | { type: 'auth:telegram'; initData: string }
  | {
      type: 'user:register';
      user: {
        id: string;
        username: string;
        level: number;
        xp: number;
        rating: number;
        usdtBalance: number;
        wins: number;
        losses: number;
        matchesPlayed: number;
      };
    }
  | { type: 'users:search'; query: string }
  | { type: 'friends:get' }
  | { type: 'friend:request_send'; targetUserId: string }
  | { type: 'friend:request_accept'; requestId: string }
  | { type: 'friend:request_reject'; requestId: string }
  | { type: 'friend:challenge_send'; targetUserId: string; amountUsdt: number }
  | { type: 'friend:challenge_respond'; challengeId: string; accept: boolean }
  | {
      type: 'matchmaking:join';
      tierId: 1 | 2 | 3 | 4 | 5;
      mode: 'online_match' | 'quick_seat';
    }
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
    }
  | {
      type: 'wallet:deposit';
      amountUsdt: number;
      txHash: string;
      network: 'TRC20' | 'TON';
    }
  | {
      type: 'wallet:withdraw';
      amountUsdt: number;
      destinationAddress: string;
      network: 'TRC20' | 'TON';
    }
  | { type: 'chat:global_send'; text: string }
  | { type: 'chat:global_history' }
  | { type: 'chat:private_send'; targetUserId: string; text: string };

export type ServerToClientMessage =
  | { type: 'auth:success'; telegramUserId: string }
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
      queueCount: number;
      tierId: 1 | 2 | 3 | 4 | 5;
    }
  | {
      type: 'game:match_found';
      room: OnlineGameRoomState;
      assignedColor: 'light' | 'dark';
      opponent: OnlineUser;
    }
  | {
      type: 'game:dice_rolled';
      roomId: string;
      byColor: 'light' | 'dark';
      dice: [number, number];
      remainingDice: number[];
      proofHash: string;
    }
  | {
      type: 'game:opponent_moved';
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
      type: 'game:cube_offered';
      roomId: string;
      offeredBy: 'light' | 'dark';
      proposedValue: number;
    }
  | {
      type: 'game:cube_responded';
      roomId: string;
      take: boolean;
      cubeValue: number;
      cubeOwner: 'light' | 'dark';
      winner: 'light' | 'dark' | null;
      victoryBanner: string | null;
    }
  | {
      type: 'game:opponent_left';
      roomId: string;
      message: string;
    }
  | {
      type: 'wallet:updated';
      newUsdtBalance: number;
      txId: string;
      actionType: 'deposit' | 'withdraw' | 'match_win' | 'match_entry';
      amount: number;
      description: string;
    }
  | {
      type: 'error';
      message: string;
    }
  | {
      type: 'chat:global_message';
      message: {
        id: string;
        senderId: string;
        senderName: string;
        level: number;
        text: string;
        timestamp: number;
      };
    }
  | {
      type: 'chat:global_history';
      messages: {
        id: string;
        senderId: string;
        senderName: string;
        level: number;
        text: string;
        timestamp: number;
      }[];
    }
  | {
      type: 'chat:private_message';
      message: {
        id: string;
        fromUserId: string;
        fromUsername: string;
        toUserId: string;
        text: string;
        timestamp: number;
      };
    };
