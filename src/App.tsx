/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import parlorBg from './assets/images/royal_backgammon_parlor_bg_1791743862025.jpg';
import parlorOverheadBg from './assets/images/parlor_overhead_table_bg_1791747201573.jpg';
import boardCrestImg from './assets/images/board_center_lion_sun_crest_1791747231807.jpg';
import {
  Gdx3DEngine,
  BoardLocation,
  BoardZoomLevel,
  CheckerState3D,
  royalSound,
} from './libgdx/Gdx3DEngine';
import {
  STANDARD_STARTING_CHECKERS,
  getStandardPoint3DPosition,
} from './libgdx/BackgammonGLBBuilder';
import {
  RoyalCrownIcon,
  WalletIcon,
  GearSettingsIcon,
  GlobeMatchIcon,
  SinglePlayerIcon,
  GroupPlayersIcon,
  HomeIcon,
  CollectionIcon,
  ChevronRightIcon,
  DiceStoreIcon,
} from './components/RoyalIcons';
import {
  CollectionStoreView,
  ProfileView,
  WalletView,
  SettingsView,
  StoreCategory,
  StoreItem,
  RealPlayerStats,
  WalletTransaction,
  UsdtTransaction,
} from './components/RoyalScreens';
import {
  initTelegramMiniApp,
  syncTelegramBackButton,
  saveStateToTelegramCloud,
  loadStateFromTelegramCloud,
  triggerTelegramHaptic,
  shareGameOnTelegram,
  downloadTelegramPublishBundle,
  downloadTelegramBotScript,
} from './telegram/telegramMiniApp';
import {
  rollProvablyFairDice,
  createInitialDiceFairnessStats,
} from './engine/provablyFairDice';
import {
  calculatePipCount,
  isPlayerInBearingOffPhase,
  getSelectableMovesForLocation,
  hasAnyLegalMoveOnBoard,
  evaluateMatchVictoryOutcome,
} from './engine/backgammonRuleEngine';
import {
  chooseBestGrandmasterMoveStep,
  shouldAITakePlayerDouble,
} from './engine/grandmasterAI';
import { multiplayerClient } from './network/realMultiplayerClient';
import {
  OnlineUser,
  FriendRequest,
  FriendChallenge,
  OnlineTier,
  ONLINE_TIERS,
} from './network/multiplayerTypes';
import { OnlineMatchmakingModal } from './components/OnlineMatchmakingModal';
import { OnlineTiersModal } from './components/OnlineTiersModal';
import { FriendsModal } from './components/FriendsModal';
import { IncomingChallengeModal } from './components/IncomingChallengeModal';

export type ActiveScreen =
  | 'home'
  | 'game'
  | 'collection'
  | 'profile'
  | 'wallet'
  | 'settings';

export type GameModeType = 'online' | 'practice' | 'friend' | 'private';

const STORAGE_KEY = 'royal_backgammon_real_state_v1';
const TURN_TIME_LIMIT_SEC = 25;

interface PersistedRealState {
  playerName: string;
  joinedDate: string;
  coins: number;
  usdtBalance?: number;
  rating?: number;
  xp?: number;
  lastTributeDate: string | null;
  ownedIds: string[];
  equipped: Record<StoreCategory, string>;
  realStats: RealPlayerStats;
  transactions: WalletTransaction[];
  usdtTransactions?: UsdtTransaction[];
  sfxEnabled: boolean;
  boardZoom: BoardZoomLevel;
  autoRoll: boolean;
  autoBearOff: boolean;
}

export function getTierForPlayerLevel(level: number): 1 | 2 | 3 | 4 | 5 {
  if (level <= 10) return 1;
  if (level <= 25) return 2;
  if (level <= 50) return 3;
  if (level <= 80) return 4;
  return 5;
}

interface MoveHistoryStep {
  prevCheckers: CheckerState3D[];
  prevTurn: 'light' | 'dark';
  prevRemainingDice: number[];
  prevHasRolled: boolean;
  movedCheckerId: number;
  fromLoc: BoardLocation;
  fromStackIndex: number;
  restoredBlot?: {
    checkerId: number;
    loc: BoardLocation;
    stackIndex: number;
  };
}

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getFormattedToday(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getOrCreatePlayerId(): string {
  try {
    const saved = window.localStorage.getItem('royal_player_id');
    if (saved) return saved;
    const generated =
      'user_' +
      Date.now().toString(36) +
      '_' +
      Math.random().toString(36).slice(2, 7);
    window.localStorage.setItem('royal_player_id', generated);
    return generated;
  } catch {
    return 'user_' + Math.random().toString(36).slice(2, 9);
  }
}

function parsePersistedState(raw: string): PersistedRealState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedRealState>;
    if (parsed && typeof parsed.coins === 'number' && parsed.realStats) {
      const faceCounts =
        Array.isArray(parsed.realStats.diceFaceCounts) &&
        parsed.realStats.diceFaceCounts.length === 6
          ? (parsed.realStats.diceFaceCounts as [
              number,
              number,
              number,
              number,
              number,
              number,
            ])
          : ([0, 0, 0, 0, 0, 0] as [
              number,
              number,
              number,
              number,
              number,
              number,
            ]);
      return {
        playerName: parsed.playerName || 'PLAYER 1',
        joinedDate: parsed.joinedDate || getFormattedToday(),
        coins: parsed.coins,
        lastTributeDate: parsed.lastTributeDate || null,
        ownedIds: parsed.ownedIds || [
          'board-imperial-walnut',
          'checkers-gold-silver',
          'dice-royal-ivory',
        ],
        equipped: parsed.equipped || {
          boards: 'board-imperial-walnut',
          checkers: 'checkers-gold-silver',
          dice: 'dice-royal-ivory',
        },
        realStats: {
          matchesPlayed: parsed.realStats.matchesPlayed ?? 0,
          wins: parsed.realStats.wins ?? 0,
          losses: parsed.realStats.losses ?? 0,
          gammonsWon: parsed.realStats.gammonsWon ?? 0,
          backgammonsWon: parsed.realStats.backgammonsWon ?? 0,
          highestCubePlayed: parsed.realStats.highestCubePlayed ?? 1,
          totalDiceRolls: parsed.realStats.totalDiceRolls ?? 0,
          doublesRolled: parsed.realStats.doublesRolled ?? 0,
          diceFaceCounts: faceCounts,
          lastRollProofHash:
            parsed.realStats.lastRollProofHash ?? 'AWAITING FIRST ROLL',
          tableSessionsOpened: parsed.realStats.tableSessionsOpened ?? 0,
          totalTableTimeSeconds:
            parsed.realStats.totalTableTimeSeconds ?? 0,
          boardFoldCount: parsed.realStats.boardFoldCount ?? 0,
        },
        transactions: Array.isArray(parsed.transactions)
          ? parsed.transactions
          : [],
        usdtBalance: 0,
        rating: typeof parsed.rating === 'number' ? parsed.rating : 1200,
        xp: typeof parsed.xp === 'number' ? parsed.xp : 0,
        usdtTransactions: Array.isArray(parsed.usdtTransactions) ? parsed.usdtTransactions : [],
        sfxEnabled: parsed.sfxEnabled ?? true,
        boardZoom: parsed.boardZoom === 'max' ? 'max' : 'xl',
        autoRoll: parsed.autoRoll ?? false,
        autoBearOff: parsed.autoBearOff ?? true,
      };
    }
  } catch {
    // Ignore corrupt JSON
  }
  return null;
}

function getInitialRealState(): PersistedRealState {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = parsePersistedState(raw);
        if (parsed) return { ...parsed, boardZoom: 'xl' };
      }
    } catch {
      // Ignore storage access errors
    }
  }

  return {
    playerName: 'PLAYER 1',
    joinedDate: getFormattedToday(),
    coins: 0,
    usdtBalance: 0,
    rating: 1200,
    xp: 0,
    lastTributeDate: null,
    ownedIds: [
      'board-imperial-walnut',
      'checkers-gold-silver',
      'dice-royal-ivory',
    ],
    equipped: {
      boards: 'board-imperial-walnut',
      checkers: 'checkers-gold-silver',
      dice: 'dice-royal-ivory',
    },
    realStats: {
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      gammonsWon: 0,
      backgammonsWon: 0,
      highestCubePlayed: 1,
      totalDiceRolls: 0,
      doublesRolled: 0,
      diceFaceCounts: [0, 0, 0, 0, 0, 0],
      lastRollProofHash: 'AWAITING FIRST ROLL',
      tableSessionsOpened: 0,
      totalTableTimeSeconds: 0,
      boardFoldCount: 0,
    },
    transactions: [],
    usdtTransactions: [],
    sfxEnabled: true,
    boardZoom: 'xl',
    autoRoll: false,
    autoBearOff: true,
  };
}

function createInitialCheckersState(): CheckerState3D[] {
  return STANDARD_STARTING_CHECKERS.map((c) => ({
    id: c.id,
    isLight: c.isLight,
    location: c.point,
    stackIndex: c.stackIndex,
  }));
}

const ANDROID_LANDSCAPE_W = 680;
const ANDROID_LANDSCAPE_H = 320;

type LineKey =
  | 'brand'
  | 'coins'
  | 'hero1'
  | 'hero2'
  | 'opt1Title'
  | 'opt1Sub'
  | 'opt2Title'
  | 'opt2Sub'
  | 'opt3Title'
  | 'opt3Sub'
  | 'cta'
  | 'navHome'
  | 'navCollection'
  | 'navProfile'
  | 'navWallet'
  | 'motto';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Gdx3DEngine | null>(null);

  const [realState, setRealState] = useState<PersistedRealState>(() =>
    getInitialRealState()
  );

  const [fitScale, setFitScale] = useState(1);
  const [boardState, setBoardState] = useState<'closed' | 'opening' | 'open'>(
    'closed'
  );
  const [isBoardHovered, setIsBoardHovered] = useState(false);
  const [glbReady, setGlbReady] = useState(false);

  // Navigation & Game Mode State
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('home');
  const [gameMode, setGameMode] = useState<GameModeType>('practice');
  const [storeCategory, setStoreCategory] = useState<StoreCategory>('boards');

  // Real Backgammon Match State (30 Standard Checkers + Pair of 3D Dice on Right + 3D Doubling Cube)
  const [checkers, setCheckers] = useState<CheckerState3D[]>(() =>
    createInitialCheckersState()
  );
  const [turn, setTurn] = useState<'light' | 'dark'>('light');
  const [diceValues, setDiceValues] = useState<[number, number]>([6, 6]);
  const [remainingDice, setRemainingDice] = useState<number[]>([]);
  const [hasRolledThisTurn, setHasRolledThisTurn] = useState<boolean>(false);
  const [selectedLocation, setSelectedLocation] =
    useState<BoardLocation | null>(null);
  const [winner, setWinner] = useState<'light' | 'dark' | null>(null);
  const [victoryBanner, setVictoryBanner] = useState<string | null>(null);

  // 3D Doubling Cube State (1, 2, 4, 8, 16, 32, 64)
  const [doublingCubeValue, setDoublingCubeValue] = useState<number>(1);
  const [doublingCubeOwner, setDoublingCubeOwner] = useState<
    'center' | 'light' | 'dark'
  >('center');
  const [pendingDoubleOffer, setPendingDoubleOffer] = useState<{
    offeredBy: 'light' | 'dark';
    proposedValue: number;
  } | null>(null);

  // Undo Move History Stack & Player Turn Countdown Timer (25s per turn)
  const [moveHistory, setMoveHistory] = useState<MoveHistoryStep[]>([]);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(TURN_TIME_LIMIT_SEC);
  const [diceScreenPos, setDiceScreenPos] = useState<{
    xPercent: number;
    yPercent: number;
  }>({ xPercent: 72, yPercent: 49 });

  // Real Multiplayer Networking State
  const [playerId] = useState<string>(() => getOrCreatePlayerId());
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [queueCount, setQueueCount] = useState<number>(0);
  const [isMatchmakingOpen, setIsMatchmakingOpen] = useState(false);
  const [matchmakingMode, setMatchmakingMode] = useState<
    'online_match' | 'quick_seat'
  >('online_match');
  const [matchedOpponent, setMatchedOpponent] = useState<OnlineUser | null>(
    null
  );
  const [onlineOpponent, setOnlineOpponent] = useState<OnlineUser | null>(null);
  const [assignedMultiplayerColor, setAssignedMultiplayerColor] = useState<
    'light' | 'dark'
  >('light');
  const [activeOnlineRoomId, setActiveOnlineRoomId] = useState<string | null>(
    null
  );
  const activeOnlineRoomIdRef = useRef<string | null>(null);
  activeOnlineRoomIdRef.current = activeOnlineRoomId;
  const assignedMultiplayerColorRef = useRef<'light' | 'dark'>('light');
  assignedMultiplayerColorRef.current = assignedMultiplayerColor;

  // Real Friends & Challenges State
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [friends, setFriends] = useState<OnlineUser[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<OnlineUser[]>([]);
  const [incomingChallenge, setIncomingChallenge] =
    useState<FriendChallenge | null>(null);

  // 5 Online Tournament Tiers & USDT Crypto Vault State
  const [usdtBalance, setUsdtBalance] = useState<number>(
    () => realState.usdtBalance ?? 25
  );
  const [playerRating, setPlayerRating] = useState<number>(
    () => realState.rating ?? 1200
  );
  const [usdtTransactions, setUsdtTransactions] = useState<UsdtTransaction[]>(
    () => realState.usdtTransactions ?? []
  );
  const [isTiersModalOpen, setIsTiersModalOpen] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight > window.innerWidth;
    }
    return false;
  });
  const [isRotatedView, setIsRotatedView] = useState<boolean>(false);

  // Refs for latest match state inside 3D raycast callbacks
  const checkersRef = useRef(checkers);
  checkersRef.current = checkers;
  const turnRef = useRef(turn);
  turnRef.current = turn;
  const remainingDiceRef = useRef(remainingDice);
  remainingDiceRef.current = remainingDice;
  const hasRolledRef = useRef(hasRolledThisTurn);
  hasRolledRef.current = hasRolledThisTurn;
  const selectedLocRef = useRef(selectedLocation);
  selectedLocRef.current = selectedLocation;
  const winnerRef = useRef(winner);
  winnerRef.current = winner;
  const gameModeRef = useRef(gameMode);
  gameModeRef.current = gameMode;
  const boardStateRef = useRef(boardState);
  boardStateRef.current = boardState;
  const doublingCubeValueRef = useRef(doublingCubeValue);
  doublingCubeValueRef.current = doublingCubeValue;
  const doublingCubeOwnerRef = useRef(doublingCubeOwner);
  doublingCubeOwnerRef.current = doublingCubeOwner;

  // Initialize Telegram Mini App (Telegram.WebApp) SDK on launch
  useEffect(() => {
    const tgInfo = initTelegramMiniApp();

    if (tgInfo.user) {
      const tgDisplayName = (
        tgInfo.user.first_name ||
        tgInfo.user.username ||
        ''
      )
        .trim()
        .toUpperCase()
        .slice(0, 18);

      if (tgDisplayName) {
        setRealState((prev) =>
          prev.playerName === 'PLAYER 1'
            ? { ...prev, playerName: tgDisplayName }
            : prev
        );
      }
    }

    loadStateFromTelegramCloud(STORAGE_KEY, (cloudJson) => {
      const cloudParsed = parsePersistedState(cloudJson);
      if (cloudParsed) {
        setRealState((prev) =>
          cloudParsed.realStats.totalTableTimeSeconds >
            prev.realStats.totalTableTimeSeconds ||
          cloudParsed.coins > prev.coins
            ? cloudParsed
            : prev
        );
      }
    });
  }, []);

  // Bind Telegram Native BackButton when away from Home screen
  useEffect(() => {
    syncTelegramBackButton(activeScreen !== 'home', () => {
      royalSound.playOptionClickSound();
      setActiveScreen('home');
    });
  }, [activeScreen]);

  // Sync sound engine mute state
  useEffect(() => {
    royalSound.muted = !realState.sfxEnabled;
  }, [realState.sfxEnabled]);

  // Persist real state to localStorage + Telegram CloudStorage
  useEffect(() => {
    const serialized = JSON.stringify(realState);
    try {
      window.localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      // Ignore storage quota errors
    }
    saveStateToTelegramCloud(STORAGE_KEY, serialized);
  }, [realState]);

  // Sync Store Equipped Checkers & Dice cosmetics to the 3D GLB model
  useEffect(() => {
    if (glbReady && engineRef.current) {
      engineRef.current.applyEquippedCosmetics(
        realState.equipped.checkers,
        realState.equipped.dice
      );
    }
  }, [glbReady, realState.equipped.checkers, realState.equipped.dice]);

  // Sync 3D Board Zoom Level ('max' | 'xl')
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setBoardZoomLevel(realState.boardZoom);
      setDiceScreenPos(engineRef.current.getDiceScreenPosition());
    }
  }, [realState.boardZoom]);

  // Switch 3D camera between Lobby framing and Game Stage framing
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setGameStageMode(activeScreen === 'game');
      const raf = requestAnimationFrame(() => {
        if (engineRef.current) {
          engineRef.current.forceResize();
          setDiceScreenPos(engineRef.current.getDiceScreenPosition());
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [activeScreen]);

  const playerLevel = Math.max(
    1,
    Math.floor((realState.realStats.wins || 0) / 2) + 1
  );

  // Highlight the 3D Dice on the right side when waiting for the player to touch the dice to roll
  const isHumanTurn =
    gameMode === 'practice'
      ? turn === 'light'
      : gameMode === 'private'
      ? true
      : turn === assignedMultiplayerColor;

  const isWaitingForPlayerDiceRoll =
    activeScreen === 'game' &&
    boardState === 'open' &&
    !winner &&
    !hasRolledThisTurn &&
    !pendingDoubleOffer &&
    isHumanTurn;

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setDiceReadyToRoll(isWaitingForPlayerDiceRoll);
      if (isWaitingForPlayerDiceRoll) {
        setDiceScreenPos(engineRef.current.getDiceScreenPosition());
      }
    }
  }, [isWaitingForPlayerDiceRoll, realState.boardZoom]);

  const handleStartOnlineMatch = useCallback(
    (mode: 'online_match' | 'quick_seat', tierId?: 1 | 2 | 3 | 4 | 5) => {
      royalSound.playOptionClickSound();
      triggerTelegramHaptic('medium');
      const resolvedTier = tierId || getTierForPlayerLevel(playerLevel);
      setSelectedTierId(resolvedTier);
      setMatchmakingMode(mode);
      setMatchedOpponent(null);
      setIsMatchmakingOpen(true);
      multiplayerClient.joinMatchmaking(resolvedTier, mode);
    },
    [playerLevel]
  );

  // Reset Turn Timer (25s) whenever the active turn changes or a new match starts
  useEffect(() => {
    setTurnTimeLeft(TURN_TIME_LIMIT_SEC);
  }, [turn, winner]);

  // Track real elapsed seconds while on the Game Page
  useEffect(() => {
    if (activeScreen !== 'game') return;
    const interval = window.setInterval(() => {
      setRealState((prev) => ({
        ...prev,
        realStats: {
          ...prev.realStats,
          totalTableTimeSeconds: prev.realStats.totalTableTimeSeconds + 1,
        },
      }));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activeScreen]);

  // Line-by-line typewriter state
  const [typedMap, setTypedMap] = useState<Record<LineKey, string>>({
    brand: '',
    coins: '',
    hero1: '',
    hero2: '',
    opt1Title: '',
    opt1Sub: '',
    opt2Title: '',
    opt2Sub: '',
    opt3Title: '',
    opt3Sub: '',
    cta: '',
    navHome: '',
    navCollection: '',
    navProfile: '',
    navWallet: '',
    motto: '',
  });
  const [activeLineKey, setActiveLineKey] = useState<LineKey | null>(null);

  const [comingSoonModal, setComingSoonModal] = useState<{
    id: string;
    title: string;
    subtitle: string;
    timestamp: number;
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Scale the app shell with balanced margins, adaptive to portrait & landscape
  useEffect(() => {
    const updateScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const portrait = vh > vw;
      setIsPortrait(portrait);

      if (portrait && isRotatedView) {
        // Rotated 90 degrees on mobile: height becomes available width and width becomes available height
        const availW = Math.max(280, vh - 20);
        const availH = Math.max(200, vw - 20);
        const scale = Math.min(
          1.35,
          availW / ANDROID_LANDSCAPE_W,
          availH / ANDROID_LANDSCAPE_H
        );
        setFitScale(scale);
      } else {
        const availW = Math.max(280, vw - (portrait ? 8 : 28));
        const availH = Math.max(200, vh - (portrait ? 8 : 24));
        const scale = Math.min(
          portrait ? 1.05 : 1.24,
          availW / ANDROID_LANDSCAPE_W,
          availH / ANDROID_LANDSCAPE_H
        );
        setFitScale(scale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [isRotatedView]);

  const handleDepositUsdt = useCallback(
    (_amount: number, _network: 'TRC20' | 'TON', _txHash: string) => {
      royalSound.playOptionClickSound();
      showToastNotification(
        'deposit-disabled',
        'DEPOSITS DISABLED',
        'Balance is credited only after verified on-chain payment.'
      );
    },
    [showToastNotification]
  );

  const handleWithdrawUsdt = useCallback(
    (_amount: number, _destinationAddress: string, _network: 'TRC20' | 'TON') => {
      royalSound.playOptionClickSound();
      showToastNotification(
        'withdraw-disabled',
        'WITHDRAWALS DISABLED',
        'Payouts will reopen after secure withdrawal processing is enabled.'
      );
    },
    [showToastNotification]
  );

  const showToastNotification = useCallback(
    (id: string, title: string, subtitle: string) => {
      royalSound.playOptionClickSound();
      setComingSoonModal({ id, title, subtitle, timestamp: Date.now() });
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(() => {
        setComingSoonModal(null);
      }, 2600);
    },
    []
  );

  const recordRealTransaction = (label: string, amount: number) => {
    const nowStr = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label,
      amount,
      timestamp: nowStr,
    };
  };

  // Update 3D Selection & Legal Target Highlight Rings on the 3D Board (Single-Die = Emerald, Combined Move = Gold)
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (!selectedLocation || remainingDice.length === 0 || winner) {
      engine.setHighlights(null, []);
      return;
    }

    const isLight = turn === 'light';
    const stackAtSelected = checkers.filter(
      (c) => c.isLight === isLight && c.location === selectedLocation
    );
    if (stackAtSelected.length === 0) {
      engine.setHighlights(null, []);
      return;
    }

    const topChecker = stackAtSelected.reduce((prev, curr) =>
      curr.stackIndex > prev.stackIndex ? curr : prev
    );
    const selPos = getStandardPoint3DPosition(
      topChecker.location,
      topChecker.stackIndex
    );

    const selectableMoves = getSelectableMovesForLocation(
      checkers,
      isLight,
      selectedLocation,
      remainingDice
    );

    const validTargets = selectableMoves.map((m) => {
      const countAtDest = checkers.filter(
        (c) => c.isLight === isLight && c.location === m.toLoc
      ).length;
      return {
        location: m.toLoc,
        stackIndex: countAtDest,
        isCombinedMove: m.isCombinedMove,
      };
    });

    engine.setHighlights(selPos, validTargets);
  }, [selectedLocation, checkers, turn, remainingDice, winner]);

  // Execute a verified single-die move from `fromLoc` to `toLoc` using `dieUsed`
  const executeCheckerMove = useCallback(
    (
      fromLoc: BoardLocation,
      toLoc: BoardLocation,
      dieUsed: number,
      recordUndo = true,
      isRemote = false
    ) => {
      const isLight = turnRef.current === 'light';
      const currentCheckers = checkersRef.current;

      const movingCandidates = currentCheckers.filter(
        (c) => c.isLight === isLight && c.location === fromLoc
      );
      if (movingCandidates.length === 0) return;

      const movingChecker = movingCandidates.reduce((a, b) =>
        a.stackIndex > b.stackIndex ? a : b
      );

      const snapshotBeforeMove = currentCheckers.map((c) => ({ ...c }));
      const nextCheckers = currentCheckers.map((c) => ({ ...c }));
      let restoredBlotInfo: MoveHistoryStep['restoredBlot'] = undefined;
      let isCaptureHit = false;

      // Check if hitting a single opponent blot on `toLoc`
      if (typeof toLoc === 'number') {
        const oppBlots = nextCheckers.filter(
          (c) => c.isLight !== isLight && c.location === toLoc
        );
        if (oppBlots.length === 1) {
          isCaptureHit = true;
          const hitChecker = oppBlots[0];
          restoredBlotInfo = {
            checkerId: hitChecker.id,
            loc: hitChecker.location,
            stackIndex: hitChecker.stackIndex,
          };
          const oppBarLoc: BoardLocation = isLight ? 'bar-dark' : 'bar-light';
          const barCount = nextCheckers.filter(
            (c) => c.location === oppBarLoc
          ).length;
          hitChecker.location = oppBarLoc;
          hitChecker.stackIndex = barCount;
          engineRef.current?.animateCheckerMove(
            hitChecker.id,
            oppBarLoc,
            barCount,
            true
          );
          triggerTelegramHaptic('heavy');
        }
      }

      // Record Undo snapshot for human player moves (only in practice or local private mode)
      if (
        recordUndo &&
        !isRemote &&
        (gameModeRef.current === 'practice' ||
          gameModeRef.current === 'private')
      ) {
        const undoStep: MoveHistoryStep = {
          prevCheckers: snapshotBeforeMove,
          prevTurn: turnRef.current,
          prevRemainingDice: [...remainingDiceRef.current],
          prevHasRolled: hasRolledRef.current,
          movedCheckerId: movingChecker.id,
          fromLoc: movingChecker.location,
          fromStackIndex: movingChecker.stackIndex,
          restoredBlot: restoredBlotInfo,
        };
        setMoveHistory((prev) => [...prev, undoStep]);
      }

      // Compute new stack index at destination
      const destStackCount = nextCheckers.filter(
        (c) =>
          c.id !== movingChecker.id &&
          c.isLight === isLight &&
          c.location === toLoc
      ).length;

      const targetObj = nextCheckers.find((c) => c.id === movingChecker.id)!;
      targetObj.location = toLoc;
      targetObj.stackIndex = destStackCount;

      // Re-index remaining stack at `fromLoc`
      nextCheckers
        .filter((c) => c.location === fromLoc)
        .sort((a, b) => a.stackIndex - b.stackIndex)
        .forEach((c, idx) => {
          c.stackIndex = idx;
        });

      // Animate 3D checker mesh with Parabolic Arc & Hit Sound
      engineRef.current?.animateCheckerMove(
        movingChecker.id,
        toLoc,
        destStackCount,
        isCaptureHit
      );
      triggerTelegramHaptic('light');

      // Consume the used die
      const nextRemaining = [...remainingDiceRef.current];
      const dieIdx = nextRemaining.indexOf(dieUsed);
      if (dieIdx !== -1) {
        nextRemaining.splice(dieIdx, 1);
      } else {
        nextRemaining.shift();
      }

      checkersRef.current = nextCheckers;
      remainingDiceRef.current = nextRemaining;
      setCheckers(nextCheckers);
      setSelectedLocation(null);

      // Check victory (all 15 borne off) with Gammon (2x) and Backgammon (3x) calculation
      const myOffLoc: BoardLocation = isLight ? 'off-light' : 'off-dark';
      const borneOffCount = nextCheckers.filter(
        (c) => c.isLight === isLight && c.location === myOffLoc
      ).length;

      if (borneOffCount >= 15) {
        const outcome = evaluateMatchVictoryOutcome(
          nextCheckers,
          turnRef.current,
          doublingCubeValueRef.current,
          100
        );
        royalSound.playVictoryFanfareSound();
        setWinner(turnRef.current);
        const victoryText = `${outcome.victoryLabel} • CUBE ${outcome.cubeValue}X = ${outcome.totalMultiplier}X`;
        setVictoryBanner(victoryText);
        setRemainingDice([]);
        setMoveHistory([]);
        triggerTelegramHaptic('success');

        const playerWon =
          gameModeRef.current === 'practice'
            ? isLight
            : turnRef.current === assignedMultiplayerColorRef.current;
        const rewardCoins = playerWon ? outcome.coinsAwarded : 0;
        setRealState((prev) => {
          const nextTx =
            rewardCoins > 0
              ? [
                  recordRealTransaction(
                    `VICTORY: ${outcome.victoryLabel} (${outcome.totalMultiplier}X)`,
                    rewardCoins
                  ),
                  ...prev.transactions,
                ]
              : prev.transactions;
          return {
            ...prev,
            coins: prev.coins + rewardCoins,
            transactions: nextTx,
            realStats: {
              ...prev.realStats,
              matchesPlayed: prev.realStats.matchesPlayed + 1,
              wins: prev.realStats.wins + (playerWon ? 1 : 0),
              losses: prev.realStats.losses + (playerWon ? 0 : 1),
              gammonsWon:
                (prev.realStats.gammonsWon ?? 0) +
                (playerWon && outcome.victoryType === 'gammon' ? 1 : 0),
              backgammonsWon:
                (prev.realStats.backgammonsWon ?? 0) +
                (playerWon && outcome.victoryType === 'backgammon' ? 1 : 0),
              highestCubePlayed: Math.max(
                prev.realStats.highestCubePlayed ?? 1,
                outcome.cubeValue
              ),
            },
          };
        });
        showToastNotification(
          'match-complete',
          playerWon
            ? `${outcome.victoryLabel}! +${rewardCoins} COINS`
            : `DEFEAT • ${outcome.victoryLabel}`,
          `Multiplier ${outcome.totalMultiplier}X recorded in real career ledger`
        );

        if (
          !isRemote &&
          (gameModeRef.current === 'online' ||
            gameModeRef.current === 'friend') &&
          activeOnlineRoomIdRef.current
        ) {
          multiplayerClient.sendMoveStep(
            activeOnlineRoomIdRef.current,
            fromLoc,
            toLoc,
            dieUsed,
            isCaptureHit,
            nextCheckers,
            [],
            turnRef.current,
            turnRef.current,
            victoryText
          );
        }
        return;
      }

      // Check if turn continues or switches
      const turnSwitched =
        nextRemaining.length === 0 ||
        !hasAnyLegalMoveOnBoard(nextCheckers, isLight, nextRemaining);
      const nextTurnCalc: 'light' | 'dark' = turnSwitched
        ? isLight
          ? 'dark'
          : 'light'
        : turnRef.current;
      const nextRemainingCalc = turnSwitched ? [] : nextRemaining;

      if (turnSwitched) {
        setRemainingDice([]);
        setHasRolledThisTurn(false);
        setTurn(nextTurnCalc);
      } else {
        setRemainingDice(nextRemainingCalc);
      }

      if (
        !isRemote &&
        (gameModeRef.current === 'online' ||
          gameModeRef.current === 'friend') &&
        activeOnlineRoomIdRef.current
      ) {
        multiplayerClient.sendMoveStep(
          activeOnlineRoomIdRef.current,
          fromLoc,
          toLoc,
          dieUsed,
          isCaptureHit,
          nextCheckers,
          nextRemainingCalc,
          nextTurnCalc,
          null,
          null
        );
      }
    },
    [showToastNotification]
  );

  // Execute either a Single-Die move OR a Combined Multi-Die chain sequentially
  const executeSelectableMove = useCallback(
    (
      steps: {
        fromLoc: BoardLocation;
        toLoc: BoardLocation;
        dieUsed: number;
      }[],
      recordUndo = true
    ) => {
      if (steps.length === 0) return;
      if (steps.length === 1) {
        executeCheckerMove(
          steps[0].fromLoc,
          steps[0].toLoc,
          steps[0].dieUsed,
          recordUndo
        );
        return;
      }

      // Execute multi-die chain step-by-step with 220ms 3D hop spacing
      steps.forEach((step, idx) => {
        if (idx === 0) {
          executeCheckerMove(
            step.fromLoc,
            step.toLoc,
            step.dieUsed,
            recordUndo
          );
        } else {
          window.setTimeout(() => {
            if (winnerRef.current) return;
            executeCheckerMove(
              step.fromLoc,
              step.toLoc,
              step.dieUsed,
              recordUndo
            );
          }, idx * 230);
        }
      });
    },
    [executeCheckerMove]
  );

  // Swap the order of the two active dice (تغییر ترتیب استفاده از دو تاس)
  const handleSwapDiceOrder = useCallback(() => {
    if (remainingDice.length !== 2 || remainingDice[0] === remainingDice[1]) {
      return;
    }
    royalSound.playOptionClickSound();
    triggerTelegramHaptic('light');
    setRemainingDice((prev) =>
      prev.length === 2 ? [prev[1], prev[0]] : prev
    );
    setDiceValues((prev) => [prev[1], prev[0]]);
  }, [remainingDice]);

  // Offer a Double with the 3D Doubling Cube (2, 4, 8, 16, 32, 64)
  const handleOfferDouble = useCallback(() => {
    if (winnerRef.current || hasRolledRef.current) {
      showToastNotification(
        'cube-timing',
        'DOUBLE BEFORE ROLLING',
        'You may offer the Doubling Cube at the start of your turn before rolling'
      );
      return;
    }

    const currentTurn = turnRef.current;
    const owner = doublingCubeOwnerRef.current;
    const currentVal = doublingCubeValueRef.current;

    if (currentVal >= 64) {
      showToastNotification(
        'cube-max',
        'DOUBLING CUBE AT 64X MAX',
        'Maximum tournament stake reached'
      );
      return;
    }

    if (owner !== 'center' && owner !== currentTurn) {
      showToastNotification(
        'cube-owner',
        'OPPONENT OWNS THE CUBE',
        `Only ${owner === 'light' ? realState.playerName : 'OPPONENT'} can offer the next double`
      );
      return;
    }

    const nextVal = currentVal * 2;
    royalSound.playDoublingCubeSound();
    triggerTelegramHaptic('medium');

    // In Online or Friend mode, broadcast cube offer over WebSockets to real opponent
    if (
      (gameModeRef.current === 'online' ||
        gameModeRef.current === 'friend') &&
      activeOnlineRoomIdRef.current
    ) {
      multiplayerClient.sendCubeOffer(activeOnlineRoomIdRef.current, nextVal);
      showToastNotification(
        'cube-offered',
        `OFFERED CUBE AT ${nextVal}X`,
        'Waiting for real opponent to Take or Drop...'
      );
      return;
    }

    // In Practice mode against ROYAL AI, the Grandmaster AI evaluates whether to TAKE or DROP
    if (gameModeRef.current === 'practice' && currentTurn === 'light') {
      const decision = shouldAITakePlayerDouble(checkersRef.current, false);
      if (decision.take) {
        setDoublingCubeValue(nextVal);
        setDoublingCubeOwner('dark');
        engineRef.current?.setDoublingCubeState(nextVal, 'dark');
        setRealState((prev) => ({
          ...prev,
          realStats: {
            ...prev.realStats,
            highestCubePlayed: Math.max(
              prev.realStats.highestCubePlayed ?? 1,
              nextVal
            ),
          },
        }));
        showToastNotification(
          'cube-taken',
          `CUBE DOUBLED TO ${nextVal}X!`,
          decision.reason
        );
      } else {
        // AI drops the cube -> Player wins immediately at currentVal stake!
        const payout = 100 * currentVal;
        royalSound.playVictoryFanfareSound();
        setWinner('light');
        setVictoryBanner(`OPPONENT DROPPED CUBE • WON ${currentVal}X`);
        setRealState((prev) => ({
          ...prev,
          coins: prev.coins + payout,
          transactions: [
            recordRealTransaction(
              `CUBE PASS FORFEIT (${currentVal}X)`,
              payout
            ),
            ...prev.transactions,
          ],
          realStats: {
            ...prev.realStats,
            matchesPlayed: prev.realStats.matchesPlayed + 1,
            wins: prev.realStats.wins + 1,
          },
        }));
        showToastNotification(
          'cube-dropped',
          `AI PASSED CUBE! +${payout} COINS`,
          decision.reason
        );
      }
      return;
    }

    // In Private 2-Player mode, display the Take / Drop prompt
    setPendingDoubleOffer({
      offeredBy: currentTurn,
      proposedValue: nextVal,
    });
  }, [realState.playerName, showToastNotification]);

  const handleRespondToDoubleOffer = useCallback(
    (take: boolean) => {
      if (!pendingDoubleOffer) return;
      const { offeredBy, proposedValue } = pendingDoubleOffer;
      const defender: 'light' | 'dark' =
        offeredBy === 'light' ? 'dark' : 'light';
      setPendingDoubleOffer(null);

      if (
        (gameModeRef.current === 'online' ||
          gameModeRef.current === 'friend') &&
        activeOnlineRoomIdRef.current
      ) {
        multiplayerClient.sendCubeRespond(
          activeOnlineRoomIdRef.current,
          take
        );
      }

      if (take) {
        setDoublingCubeValue(proposedValue);
        setDoublingCubeOwner(defender);
        engineRef.current?.setDoublingCubeState(proposedValue, defender);
        setRealState((prev) => ({
          ...prev,
          realStats: {
            ...prev.realStats,
            highestCubePlayed: Math.max(
              prev.realStats.highestCubePlayed ?? 1,
              proposedValue
            ),
          },
        }));
        showToastNotification(
          'cube-accepted',
          `CUBE ACCEPTED AT ${proposedValue}X`,
          'Touch the 3D dice on right side to roll'
        );
      } else {
        const currentStake = Math.max(1, proposedValue / 2);
        const payout = offeredBy === 'light' ? 100 * currentStake : 0;
        royalSound.playVictoryFanfareSound();
        setWinner(offeredBy);
        setVictoryBanner(`CUBE DROPPED • ${currentStake}X FORFEIT`);
        setRealState((prev) => ({
          ...prev,
          coins: prev.coins + payout,
          transactions:
            payout > 0
              ? [
                  recordRealTransaction(
                    `CUBE PASS FORFEIT (${currentStake}X)`,
                    payout
                  ),
                  ...prev.transactions,
                ]
              : prev.transactions,
          realStats: {
            ...prev.realStats,
            matchesPlayed: prev.realStats.matchesPlayed + 1,
            wins: prev.realStats.wins + (offeredBy === 'light' ? 1 : 0),
            losses: prev.realStats.losses + (offeredBy === 'light' ? 0 : 1),
          },
        }));
      }
    },
    [pendingDoubleOffer, showToastNotification]
  );

  // Undo the player's last checker move (برگشت حرکت مهره به عقب)
  const handleUndoMove = useCallback(() => {
    if (moveHistory.length === 0 || winner) return;
    if (gameModeRef.current === 'online' || gameModeRef.current === 'friend') {
      showToastNotification(
        'undo-multiplayer',
        'UNDO NOT AVAILABLE',
        'Moves cannot be undone in live competitive matches'
      );
      return;
    }
    royalSound.playOptionClickSound();
    triggerTelegramHaptic('medium');

    const lastStep = moveHistory[moveHistory.length - 1];
    setMoveHistory((prev) => prev.slice(0, -1));

    checkersRef.current = lastStep.prevCheckers;
    remainingDiceRef.current = lastStep.prevRemainingDice;
    setCheckers(lastStep.prevCheckers);
    setTurn(lastStep.prevTurn);
    setRemainingDice(lastStep.prevRemainingDice);
    setHasRolledThisTurn(lastStep.prevHasRolled);
    setSelectedLocation(null);

    // Animate the moved checker back to its previous point
    engineRef.current?.animateCheckerMove(
      lastStep.movedCheckerId,
      lastStep.fromLoc,
      lastStep.fromStackIndex,
      false
    );

    // If an opponent blot was hit on that move, animate it back from the bar to its point
    if (lastStep.restoredBlot) {
      engineRef.current?.animateCheckerMove(
        lastStep.restoredBlot.checkerId,
        lastStep.restoredBlot.loc,
        lastStep.restoredBlot.stackIndex,
        false
      );
    }
  }, [moveHistory, winner]);

  // Roll the Pair of 3D Dice on the Right Side using Provably Fair CSPRNG
  const handleRollDice = useCallback(() => {
    if (winnerRef.current || hasRolledRef.current) return;
    if (
      (gameModeRef.current === 'online' ||
        gameModeRef.current === 'friend') &&
      turnRef.current !== assignedMultiplayerColorRef.current
    ) {
      return;
    }
    if (boardStateRef.current !== 'open' && engineRef.current) {
      engineRef.current.openBoard();
      return;
    }

    const currentFairStats = {
      totalRolls: realState.realStats.totalDiceRolls ?? 0,
      doublesCount: realState.realStats.doublesRolled ?? 0,
      faceCounts:
        realState.realStats.diceFaceCounts ??
        createInitialDiceFairnessStats().faceCounts,
      lastRollHash: realState.realStats.lastRollProofHash ?? '',
      lastRollNonce: realState.realStats.totalDiceRolls ?? 0,
    };

    const { roll, nextStats } = rollProvablyFairDice(currentFairStats);
    const { d1, d2 } = roll;
    const moves = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];

    // Record 100% real cryptographic dice statistics
    setRealState((prev) => ({
      ...prev,
      realStats: {
        ...prev.realStats,
        totalDiceRolls: nextStats.totalRolls,
        doublesRolled: nextStats.doublesCount,
        diceFaceCounts: nextStats.faceCounts,
        lastRollProofHash: nextStats.lastRollHash,
      },
    }));

    setDiceValues([d1, d2]);
    setHasRolledThisTurn(true);
    setSelectedLocation(null);
    if (turnRef.current === 'light' || gameModeRef.current === 'private') {
      setMoveHistory([]);
    }

    engineRef.current?.roll3DDice(d1, d2);
    triggerTelegramHaptic('medium');

    if (
      (gameModeRef.current === 'online' ||
        gameModeRef.current === 'friend') &&
      activeOnlineRoomIdRef.current
    ) {
      multiplayerClient.sendDiceRoll(
        activeOnlineRoomIdRef.current,
        [d1, d2],
        nextStats.lastRollHash
      );
    }

    const isLight = turnRef.current === 'light';
    window.setTimeout(() => {
      if (!hasAnyLegalMoveOnBoard(checkersRef.current, isLight, moves)) {
        showToastNotification(
          'no-moves',
          `ROLLED ${d1} - ${d2} (NO LEGAL MOVES)`,
          'Turn passes automatically'
        );
        setRemainingDice([]);
        setHasRolledThisTurn(false);
        setTurn(isLight ? 'dark' : 'light');
      } else {
        setRemainingDice(moves);
      }
    }, 620);
  }, [
    realState.realStats.diceFaceCounts,
    realState.realStats.doublesRolled,
    realState.realStats.lastRollProofHash,
    realState.realStats.totalDiceRolls,
    showToastNotification,
  ]);

  // 1. AUTO DICE ROLL (گزینه پرتاب تاس خودکار) for the human player when enabled
  useEffect(() => {
    if (
      activeScreen !== 'game' ||
      boardState !== 'open' ||
      winner ||
      hasRolledThisTurn ||
      pendingDoubleOffer
    ) {
      return;
    }

    const isHumanTurn =
      gameMode === 'practice'
        ? turn === 'light'
        : gameMode === 'private'
        ? true
        : turn === assignedMultiplayerColor;
    if (isHumanTurn && realState.autoRoll) {
      const timer = window.setTimeout(() => {
        handleRollDice();
      }, 480);
      return () => window.clearTimeout(timer);
    }
  }, [
    activeScreen,
    boardState,
    winner,
    hasRolledThisTurn,
    pendingDoubleOffer,
    turn,
    gameMode,
    assignedMultiplayerColor,
    realState.autoRoll,
    handleRollDice,
  ]);

  // 2. AUTO CHECKER MOVE ONLY AT ENDGAME BEARING OFF (گزینه حرکت مهره خودکار فقط در اخر بازی موقع بیرون انداختن مهره ها)
  useEffect(() => {
    if (
      activeScreen !== 'game' ||
      boardState !== 'open' ||
      winner ||
      !hasRolledThisTurn ||
      remainingDice.length === 0 ||
      !realState.autoBearOff
    ) {
      return;
    }

    const isHumanTurn =
      gameMode === 'practice'
        ? turn === 'light'
        : gameMode === 'private'
        ? true
        : turn === assignedMultiplayerColor;
    if (!isHumanTurn) return;

    const isLight = turn === 'light';
    // Strictly check that all 15 of the player's checkers are in the Home Board / Bearing-Off phase!
    if (!isPlayerInBearingOffPhase(checkers, isLight)) {
      return;
    }

    const offLoc: BoardLocation = isLight ? 'off-light' : 'off-dark';
    const myCheckers = checkers.filter(
      (c) => c.isLight === isLight && c.location !== offLoc
    );
    const uniqueLocs = Array.from(new Set(myCheckers.map((c) => c.location)));

    let chosenMove: {
      fromLoc: BoardLocation;
      toLoc: BoardLocation;
      dieUsed: number;
    } | null = null;

    for (const loc of uniqueLocs) {
      const selectable = getSelectableMovesForLocation(
        checkers,
        isLight,
        loc,
        remainingDice
      ).filter((m) => !m.isCombinedMove);

      const directBearOff = selectable.find((m) => m.toLoc === offLoc);
      if (directBearOff && directBearOff.steps.length > 0) {
        chosenMove = directBearOff.steps[0];
        break;
      }
      if (!chosenMove && selectable.length > 0 && selectable[0].steps.length > 0) {
        chosenMove = selectable[0].steps[0];
      }
    }

    if (chosenMove) {
      const moveToRun = chosenMove;
      const timer = window.setTimeout(() => {
        executeCheckerMove(
          moveToRun.fromLoc,
          moveToRun.toLoc,
          moveToRun.dieUsed,
          true
        );
      }, 450);
      return () => window.clearTimeout(timer);
    }
  }, [
    activeScreen,
    boardState,
    winner,
    hasRolledThisTurn,
    remainingDice,
    realState.autoBearOff,
    turn,
    gameMode,
    checkers,
    executeCheckerMove,
  ]);

  // 3. PLAYER TURN COUNTDOWN TIMER (تایمر برای حرکت بازیکن)
  useEffect(() => {
    if (
      activeScreen !== 'game' ||
      boardState !== 'open' ||
      winner ||
      pendingDoubleOffer
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeScreen, boardState, winner, pendingDoubleOffer, turn]);

  // Handle Turn Timer reaching 0s: Auto-roll if not rolled, or auto-play best strategic move if rolled
  useEffect(() => {
    if (
      activeScreen !== 'game' ||
      boardState !== 'open' ||
      winner ||
      pendingDoubleOffer ||
      turnTimeLeft > 0
    ) {
      return;
    }

    const isCurrentPlayerTurn =
      gameMode === 'practice'
        ? turn === 'light'
        : gameMode === 'private'
        ? true
        : turn === assignedMultiplayerColor;

    if (!isCurrentPlayerTurn) {
      return;
    }

    if (!hasRolledThisTurn) {
      showToastNotification(
        'timer-roll',
        'TURN TIMER EXPIRED',
        'Auto-rolling 3D dice'
      );
      setTurnTimeLeft(TURN_TIME_LIMIT_SEC);
      handleRollDice();
      return;
    }

    if (remainingDice.length > 0) {
      const isLight = turn === 'light';
      const bestStep = chooseBestGrandmasterMoveStep(
        checkers,
        isLight,
        remainingDice
      );
      if (bestStep) {
        setTurnTimeLeft(8);
        executeCheckerMove(
          bestStep.fromLoc,
          bestStep.toLoc,
          bestStep.dieUsed,
          true
        );
      }
    }
  }, [
    turnTimeLeft,
    activeScreen,
    boardState,
    winner,
    pendingDoubleOffer,
    hasRolledThisTurn,
    remainingDice,
    turn,
    gameMode,
    assignedMultiplayerColor,
    checkers,
    handleRollDice,
    executeCheckerMove,
    showToastNotification,
  ]);

  // 4. Grandmaster Heuristic AI Opponent Turn for Dark ('dark') ONLY in Practice Mode
  useEffect(() => {
    if (
      activeScreen !== 'game' ||
      boardState !== 'open' ||
      winner ||
      pendingDoubleOffer ||
      turn !== 'dark' ||
      gameMode !== 'practice'
    ) {
      return;
    }

    if (!hasRolledThisTurn) {
      const rollTimer = window.setTimeout(() => {
        setMoveHistory([]);
        handleRollDice();
      }, 1050);
      return () => window.clearTimeout(rollTimer);
    }

    if (remainingDice.length > 0) {
      const moveTimer = window.setTimeout(() => {
        const bestStep = chooseBestGrandmasterMoveStep(
          checkersRef.current,
          false,
          remainingDiceRef.current
        );
        if (bestStep) {
          executeCheckerMove(
            bestStep.fromLoc,
            bestStep.toLoc,
            bestStep.dieUsed,
            false
          );
        }
      }, 620);
      return () => window.clearTimeout(moveTimer);
    }
  }, [
    activeScreen,
    boardState,
    winner,
    pendingDoubleOffer,
    turn,
    gameMode,
    hasRolledThisTurn,
    remainingDice,
    handleRollDice,
    executeCheckerMove,
  ]);

  // Start a fresh Standard Backgammon Match
  const handleStartNewMatch = useCallback(() => {
    royalSound.playOptionClickSound();
    if (activeOnlineRoomIdRef.current) {
      multiplayerClient.leaveRoom(activeOnlineRoomIdRef.current);
      setActiveOnlineRoomId(null);
      setMatchedOpponent(null);
      setOnlineOpponent(null);
    }
    const fresh = createInitialCheckersState();
    checkersRef.current = fresh;
    remainingDiceRef.current = [];
    setCheckers(fresh);
    setTurn('light');
    setDiceValues([6, 6]);
    setRemainingDice([]);
    setHasRolledThisTurn(false);
    setSelectedLocation(null);
    setWinner(null);
    setVictoryBanner(null);
    setDoublingCubeValue(1);
    setDoublingCubeOwner('center');
    setPendingDoubleOffer(null);
    setMoveHistory([]);
    setTurnTimeLeft(TURN_TIME_LIMIT_SEC);
    engineRef.current?.syncAllCheckers(fresh);
    engineRef.current?.setHighlights(null, []);
    engineRef.current?.setDoublingCubeState(64, 'center');
  }, []);

  // Start the sequential line-by-line typewriter animation
  const startLineByLineTyping = useCallback(() => {
    const lines: { key: LineKey; text: string }[] = [
      { key: 'brand', text: 'ROYAL BACKGAMMON' },
      { key: 'coins', text: `${realState.coins.toLocaleString()} COINS` },
      { key: 'hero1', text: 'YOUR TABLE' },
      { key: 'hero2', text: 'AWAITS' },
      { key: 'opt1Title', text: 'ONLINE MATCH' },
      { key: 'opt1Sub', text: 'Real 2-player match by player level' },
      { key: 'opt2Title', text: 'PRACTICE' },
      { key: 'opt2Sub', text: 'Hone your skills vs Grandmaster Royal AI' },
      { key: 'opt3Title', text: 'PLAY WITH FRIENDS' },
      { key: 'opt3Sub', text: 'Strictly online with real friends' },
      { key: 'cta', text: 'TAKE YOUR SEAT' },
      { key: 'navHome', text: 'HOME' },
      { key: 'navCollection', text: 'COLLECTION' },
      { key: 'navProfile', text: 'PROFILE' },
      { key: 'navWallet', text: 'WALLET' },
      { key: 'motto', text: 'A HIGHER KIND OF PLAY' },
    ];

    let lineIdx = 0;
    let charIdx = 0;
    let cancelled = false;

    const step = () => {
      if (cancelled) return;
      if (lineIdx >= lines.length) {
        setActiveLineKey(null);
        return;
      }

      const currentLine = lines[lineIdx];
      setActiveLineKey(currentLine.key);

      charIdx++;
      const nextSlice = currentLine.text.slice(0, charIdx);

      setTypedMap((prev) => ({
        ...prev,
        [currentLine.key]: nextSlice,
      }));

      if (charIdx % 2 === 1) {
        royalSound.playTypeTick();
      }

      if (charIdx < currentLine.text.length) {
        const charDelay = currentLine.text.length > 18 ? 15 : 22;
        window.setTimeout(step, charDelay);
      } else {
        lineIdx++;
        charIdx = 0;
        window.setTimeout(step, 75);
      }
    };

    step();

    return () => {
      cancelled = true;
    };
  }, [realState.coins]);

  // Enter the active 3D Game Page
  const enterGameTable = useCallback((mode: GameModeType) => {
    royalSound.playOptionClickSound();
    triggerTelegramHaptic('medium');
    setGameMode(mode);
    setActiveScreen('game');
    setComingSoonModal(null);
    setTurnTimeLeft(TURN_TIME_LIMIT_SEC);

    setRealState((prev) => ({
      ...prev,
      realStats: {
        ...prev.realStats,
        tableSessionsOpened: prev.realStats.tableSessionsOpened + 1,
      },
    }));

    if (engineRef.current) {
      engineRef.current.openBoard();
      engineRef.current.setGameStageMode(true);
    }
  }, []);

  // Connect to Real Multiplayer WebSocket Server & handle real events
  useEffect(() => {
    multiplayerClient.connect({
      id: playerId,
      username: realState.playerName,
      level: playerLevel,
      xp: realState.realStats.xp ?? playerLevel * 100,
      rating: playerRating,
      usdtBalance: usdtBalance,
      wins: realState.realStats.wins,
      losses: realState.realStats.losses ?? 0,
      matchesPlayed: realState.realStats.matchesPlayed,
    });

    const unsubReg = multiplayerClient.on('user:registered', (data) => {
      if (typeof data.onlineCount === 'number') {
        setOnlineCount(data.onlineCount);
      }
    });

    const unsubFriends = multiplayerClient.on('friends:list', (data) => {
      setFriends(data.friends || []);
      setIncomingRequests(data.incomingRequests || []);
      setOutgoingRequests(data.outgoingRequests || []);
    });

    const unsubSearch = multiplayerClient.on('users:search_result', (data) => {
      setSearchResults(data.users || []);
    });

    const unsubReq = multiplayerClient.on('friend:request_received', (data) => {
      showToastNotification(
        'friend-req',
        `FRIEND REQUEST: ${data.request.fromUser.username}`,
        `Level ${data.request.fromUser.level} sent you a friend request`
      );
      multiplayerClient.fetchFriends();
    });

    const unsubChal = multiplayerClient.on(
      'friend:challenge_received',
      (data) => {
        royalSound.playVictoryFanfareSound();
        setIncomingChallenge(data.challenge);
      }
    );

    const unsubDecl = multiplayerClient.on(
      'friend:challenge_declined',
      (data) => {
        showToastNotification(
          'challenge-declined',
          'CHALLENGE DECLINED',
          data.reason
        );
      }
    );

    const unsubWait = multiplayerClient.on('matchmaking:waiting', (data) => {
      setQueueCount(data.queueCount);
    });

    const unsubMatch = multiplayerClient.on('game:match_found', (data) => {
      royalSound.playVictoryFanfareSound();
      setMatchedOpponent(data.opponent);
      setOnlineOpponent(data.opponent);
      setAssignedMultiplayerColor(data.assignedColor);
      setActiveOnlineRoomId(data.room.roomId);

      // Start the fresh 2-player game
      const fresh = createInitialCheckersState();
      checkersRef.current = fresh;
      remainingDiceRef.current = [];
      setCheckers(fresh);
      setTurn('light');
      setDiceValues([6, 6]);
      setRemainingDice([]);
      setHasRolledThisTurn(false);
      setSelectedLocation(null);
      setWinner(null);
      setVictoryBanner(null);
      setDoublingCubeValue(1);
      setDoublingCubeOwner('center');
      setPendingDoubleOffer(null);
      setMoveHistory([]);
      setTurnTimeLeft(TURN_TIME_LIMIT_SEC);
      engineRef.current?.syncAllCheckers(fresh);
      engineRef.current?.setHighlights(null, []);
      engineRef.current?.setDoublingCubeState(64, 'center');

      window.setTimeout(() => {
        setIsMatchmakingOpen(false);
        setIsFriendsModalOpen(false);
        setIncomingChallenge(null);
        enterGameTable(data.room.mode === 'friend_match' ? 'friend' : 'online');
      }, 1800);
    });

    const unsubDice = multiplayerClient.on('game:dice_rolled', (data) => {
      if (data.byColor !== assignedMultiplayerColorRef.current) {
        engineRef.current?.roll3DDice(data.dice[0], data.dice[1]);
        setDiceValues(data.dice);
        setRemainingDice(data.remainingDice);
        setHasRolledThisTurn(true);
      }
    });

    const unsubOppMove = multiplayerClient.on('game:opponent_moved', (data) => {
      // Find moving checker ID
      const moving = checkersRef.current.find(
        (c) => c.location === data.fromLoc
      );
      if (moving) {
        const destCount = data.newCheckers.filter(
          (c: CheckerState3D) => c.location === data.toLoc
        ).length;
        engineRef.current?.animateCheckerMove(
          moving.id,
          data.toLoc,
          destCount,
          data.isCaptureHit
        );
      }
      checkersRef.current = data.newCheckers;
      setCheckers(data.newCheckers);
      remainingDiceRef.current = data.nextRemainingDice;
      setRemainingDice(data.nextRemainingDice);
      turnRef.current = data.nextTurn;
      setTurn(data.nextTurn);
      if (data.nextRemainingDice.length === 0) {
        setHasRolledThisTurn(false);
      }
      if (data.winner) {
        setWinner(data.winner);
        setVictoryBanner(data.victoryBanner);
      }
    });

    const unsubCubeOff = multiplayerClient.on('game:cube_offered', (data) => {
      setPendingDoubleOffer({
        offeredBy: data.offeredBy,
        proposedValue: data.proposedValue,
      });
    });

    const unsubCubeResp = multiplayerClient.on(
      'game:cube_responded',
      (data) => {
        if (data.take) {
          setDoublingCubeValue(data.cubeValue);
          setDoublingCubeOwner(data.cubeOwner);
          engineRef.current?.setDoublingCubeState(
            data.cubeValue,
            data.cubeOwner
          );
        } else {
          if (data.winner) {
            setWinner(data.winner);
            setVictoryBanner(data.victoryBanner);
          }
        }
      }
    );

    const unsubOppLeft = multiplayerClient.on('game:opponent_left', (data) => {
      showToastNotification('opp-left', 'OPPONENT RESIGNED', data.message);
      if (!winnerRef.current) {
        setWinner(assignedMultiplayerColorRef.current);
        setVictoryBanner('OPPONENT LEFT • YOU WIN BY FORFEIT');
      }
    });

    const unsubWallet = multiplayerClient.on('wallet:updated', (data) => {
      if (typeof data.newUsdtBalance === 'number') {
        setUsdtBalance(data.newUsdtBalance);
        setRealState((prev) => ({ ...prev, usdtBalance: data.newUsdtBalance }));
      }
      if (data.description) {
        showToastNotification(
          'wallet-update',
          'CRYPTO VAULT UPDATED',
          data.description
        );
      }
    });

    return () => {
      unsubReg();
      unsubFriends();
      unsubSearch();
      unsubReq();
      unsubChal();
      unsubDecl();
      unsubWait();
      unsubMatch();
      unsubDice();
      unsubOppMove();
      unsubCubeOff();
      unsubCubeResp();
      unsubOppLeft();
      unsubWallet();
    };
  }, [
    playerId,
    realState.playerName,
    playerLevel,
    playerRating,
    usdtBalance,
    realState.realStats.xp,
    realState.realStats.wins,
    realState.realStats.losses,
    realState.realStats.matchesPlayed,
    enterGameTable,
    showToastNotification,
  ]);

  // Initialize libGDX 3D GLB Engine
  const hasTypedOnceRef = useRef(false);
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const engine = new Gdx3DEngine(container, {
      onBoardReady: () => {
        setGlbReady(true);
      },
      onBoardTouchStartOpen: () => {
        setBoardState('opening');
        triggerTelegramHaptic('medium');
        setRealState((prev) => ({
          ...prev,
          realStats: {
            ...prev.realStats,
            boardFoldCount: prev.realStats.boardFoldCount + 1,
          },
        }));
      },
      onBoardFullyOpened: () => {
        setBoardState('open');
        if (engineRef.current) {
          setDiceScreenPos(engineRef.current.getDiceScreenPosition());
        }
        if (!hasTypedOnceRef.current) {
          hasTypedOnceRef.current = true;
          startLineByLineTyping();
        }
      },
      onBoardHoverChange: (hovered) => {
        setIsBoardHovered(hovered);
      },
      onDiceClicked: () => {
        handleRollDice();
      },
      onDoublingCubeClicked: () => {
        handleOfferDouble();
      },
      onCheckerClicked: (checkerId) => {
        if (!hasRolledRef.current || remainingDiceRef.current.length === 0) {
          showToastNotification(
            'touch-dice-prompt',
            'TOUCH THE 3D DICE TO ROLL',
            'Tap the pair of 3D dice on the right side of the board'
          );
          return;
        }

        const isLight = turnRef.current === 'light';
        const myActiveColor =
          gameModeRef.current === 'practice'
            ? 'light'
            : gameModeRef.current === 'private'
            ? turnRef.current
            : assignedMultiplayerColorRef.current;

        if (turnRef.current !== myActiveColor) return;

        const clicked = checkersRef.current.find((c) => c.id === checkerId);
        if (!clicked) return;

        // If user clicked an opponent blot that is a valid target (single or combined) for currently selected location
        if (clicked.isLight !== isLight && selectedLocRef.current !== null) {
          const selectable = getSelectableMovesForLocation(
            checkersRef.current,
            isLight,
            selectedLocRef.current,
            remainingDiceRef.current
          );
          const match = selectable.find((m) => m.toLoc === clicked.location);
          if (match) {
            executeSelectableMove(match.steps, true);
            return;
          }
        }

        if (clicked.isLight !== isLight) return;

        const selectable = getSelectableMovesForLocation(
          checkersRef.current,
          isLight,
          clicked.location,
          remainingDiceRef.current
        );

        if (selectable.length === 0) return;

        // If already selected, clicking again immediately plays the primary single-die move!
        if (selectedLocRef.current === clicked.location) {
          executeSelectableMove(selectable[0].steps, true);
        } else {
          royalSound.playOptionClickSound();
          triggerTelegramHaptic('light');
          setSelectedLocation(clicked.location);
        }
      },
      onLocationClicked: (toLoc) => {
        if (selectedLocRef.current === null) return;
        const isLight = turnRef.current === 'light';
        const selectable = getSelectableMovesForLocation(
          checkersRef.current,
          isLight,
          selectedLocRef.current,
          remainingDiceRef.current
        );
        const match = selectable.find((m) => m.toLoc === toLoc);
        if (match) {
          executeSelectableMove(match.steps, true);
        }
      },
    });

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTouchClosedBoard = () => {
    if (boardState === 'closed' && engineRef.current) {
      engineRef.current.openBoard();
    }
  };

  const navigateToScreen = (screen: ActiveScreen) => {
    royalSound.playOptionClickSound();
    setComingSoonModal(null);
    if (screen !== 'game' && activeOnlineRoomIdRef.current) {
      multiplayerClient.leaveRoom(activeOnlineRoomIdRef.current);
      setActiveOnlineRoomId(null);
      setMatchedOpponent(null);
      setOnlineOpponent(null);
    }
    setActiveScreen(screen);
  };

  const handleToggleBoardZoom = () => {
    royalSound.playOptionClickSound();
    setRealState((prev) => {
      const nextZoom: BoardZoomLevel = prev.boardZoom === 'max' ? 'xl' : 'max';
      showToastNotification(
        'board-zoom',
        nextZoom === 'max' ? 'BOARD SIZE: MAX FULL 3D' : 'BOARD SIZE: XL LARGE',
        '3D camera framing updated'
      );
      return {
        ...prev,
        boardZoom: nextZoom,
      };
    });
  };

  const handleToggleAutoRoll = () => {
    royalSound.playOptionClickSound();
    setRealState((prev) => {
      const next = !prev.autoRoll;
      showToastNotification(
        'auto-roll',
        next ? 'AUTO DICE ROLL: ON' : 'AUTO DICE ROLL: OFF',
        next
          ? '3D dice roll automatically at turn start'
          : 'Touch the 3D dice on right side to roll'
      );
      return {
        ...prev,
        autoRoll: next,
      };
    });
  };

  const handleToggleAutoBearOff = () => {
    royalSound.playOptionClickSound();
    setRealState((prev) => {
      const next = !prev.autoBearOff;
      showToastNotification(
        'auto-bearoff',
        next ? 'ENDGAME AUTO BEAR-OFF: ON' : 'ENDGAME AUTO BEAR-OFF: OFF',
        'Active only at endgame when bearing off checkers'
      );
      return {
        ...prev,
        autoBearOff: next,
      };
    });
  };

  const getPublicAppUrl = () => {
    if (typeof window === 'undefined') return '';
    return window.location.origin + window.location.pathname;
  };

  const handleCopyTelegramUrl = () => {
    const url = getPublicAppUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    showToastNotification(
      'tg-url',
      'TELEGRAM WEBAPP URL COPIED',
      'Paste into @BotFather /newapp or /setmenubutton'
    );
  };

  const handleDownloadTelegramConfig = () => {
    downloadTelegramPublishBundle(getPublicAppUrl());
    showToastNotification(
      'tg-json',
      'TELEGRAM CONFIG DOWNLOADED',
      'royal-backgammon-telegram-config.json saved'
    );
  };

  const handleDownloadTelegramBotScript = () => {
    downloadTelegramBotScript(getPublicAppUrl());
    showToastNotification(
      'tg-bot',
      'TELEGRAM BOT SCRIPT SAVED',
      'telegram-bot-launcher.mjs ready to run'
    );
  };

  const handleShareOnTelegram = () => {
    const shareLink = shareGameOnTelegram(
      getPublicAppUrl(),
      realState.playerName
    );
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareLink).catch(() => {});
    }
    showToastNotification(
      'tg-share',
      'TELEGRAM INVITE LINK READY',
      'Share link copied to clipboard'
    );
  };

  const handleEquipOrBuyItem = (item: StoreItem) => {
    const isOwned = realState.ownedIds.includes(item.id);
    if (isOwned) {
      royalSound.playOptionClickSound();
      setRealState((prev) => ({
        ...prev,
        equipped: {
          ...prev.equipped,
          [item.category]: item.id,
        },
      }));
      showToastNotification(item.id, 'EQUIPPED TO 3D TABLE', item.title);
      return;
    }

    if (realState.coins >= item.price) {
      royalSound.playOptionClickSound();
      const tx = recordRealTransaction(`UNLOCKED ${item.title}`, -item.price);
      setRealState((prev) => ({
        ...prev,
        coins: prev.coins - item.price,
        ownedIds: [...prev.ownedIds, item.id],
        equipped: {
          ...prev.equipped,
          [item.category]: item.id,
        },
        transactions: [tx, ...prev.transactions],
      }));
      showToastNotification(item.id, 'UNLOCKED & EQUIPPED', item.title);
    } else {
      showToastNotification(
        item.id,
        'INSUFFICIENT COINS',
        `Requires ${item.price.toLocaleString()} Coins (Claim in Wallet)`
      );
    }
  };

  const isTributeClaimedToday =
    realState.lastTributeDate === getTodayDateString();

  const handleClaimDailyTribute = () => {
    if (isTributeClaimedToday) return;
    royalSound.playOptionClickSound();
    const tx = recordRealTransaction('DAILY CLUB TRIBUTE', 250);
    setRealState((prev) => ({
      ...prev,
      coins: prev.coins + 250,
      lastTributeDate: getTodayDateString(),
      transactions: [tx, ...prev.transactions],
    }));
    showToastNotification(
      'daily-tribute',
      '+250 COINS ADDED',
      'RECORDED IN TREASURY LEDGER'
    );
  };

  const handleAcquireCoins = (amount: number, packName: string) => {
    royalSound.playOptionClickSound();
    const tx = recordRealTransaction(packName, amount);
    setRealState((prev) => ({
      ...prev,
      coins: prev.coins + amount,
      transactions: [tx, ...prev.transactions],
    }));
    showToastNotification(
      `pack-${amount}`,
      `+${amount.toLocaleString()} COINS ADDED`,
      packName
    );
  };

  const handleResetRealStats = () => {
    royalSound.playOptionClickSound();
    setRealState((prev) => ({
      ...prev,
      realStats: {
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        gammonsWon: 0,
        backgammonsWon: 0,
        highestCubePlayed: 1,
        totalDiceRolls: 0,
        doublesRolled: 0,
        diceFaceCounts: [0, 0, 0, 0, 0, 0],
        lastRollProofHash: 'AWAITING FIRST ROLL',
        tableSessionsOpened: 0,
        totalTableTimeSeconds: 0,
        boardFoldCount: 0,
      },
    }));
    showToastNotification(
      'reset-stats',
      'STATISTICS RESET',
      'All counters set to 0'
    );
  };

  const handleResetAllData = () => {
    royalSound.playOptionClickSound();
    window.localStorage.removeItem(STORAGE_KEY);
    setRealState({
      playerName: 'PLAYER 1',
      joinedDate: getFormattedToday(),
      coins: 0,
      lastTributeDate: null,
      ownedIds: [
        'board-imperial-walnut',
        'checkers-gold-silver',
        'dice-royal-ivory',
      ],
      equipped: {
        boards: 'board-imperial-walnut',
        checkers: 'checkers-gold-silver',
        dice: 'dice-royal-ivory',
      },
      realStats: {
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        gammonsWon: 0,
        backgammonsWon: 0,
        highestCubePlayed: 1,
        totalDiceRolls: 0,
        doublesRolled: 0,
        diceFaceCounts: [0, 0, 0, 0, 0, 0],
        lastRollProofHash: 'AWAITING FIRST ROLL',
        tableSessionsOpened: 0,
        totalTableTimeSeconds: 0,
        boardFoldCount: 0,
      },
      transactions: [],
      sfxEnabled: true,
      boardZoom: 'xl',
      autoRoll: false,
      autoBearOff: true,
    });
    handleStartNewMatch();
    showToastNotification(
      'reset-all',
      'ALL DATA CLEARED',
      'Reset to fresh state'
    );
  };

  const hasLineStarted = (key: LineKey) =>
    typedMap[key].length > 0 || activeLineKey === key;

  const renderCursor = (key: LineKey) =>
    activeLineKey === key ? <span className="typewriter-cursor" /> : null;

  const isHomeScreen = activeScreen === 'home';
  const isGameScreen = activeScreen === 'game';
  const show3DStage = isHomeScreen || isGameScreen;

  const lightBorneOff = checkers.filter(
    (c) => c.isLight && c.location === 'off-light'
  ).length;
  const darkBorneOff = checkers.filter(
    (c) => !c.isLight && c.location === 'off-dark'
  ).length;

  // Real-time Exact Pip Counts (167 Pips at start)
  const lightPipCount = calculatePipCount(checkers, true);
  const darkPipCount = calculatePipCount(checkers, false);

  return (
    <div className="w-screen h-[100dvh] bg-[#020705] flex items-center justify-center overflow-hidden select-none p-0.5 relative">
      {/* Mobile Orientation Quick Switch for Telegram / Phone in Vertical Mode */}
      {isPortrait && (
        <div className="fixed top-2 z-50 flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              royalSound.playOptionClickSound();
              setIsRotatedView((prev) => !prev);
            }}
            className="px-3 py-1 rounded-full bg-[#071d13]/95 border border-[#c8a668] text-[#f5dca8] text-[9.5px] font-cinzel font-bold shadow-[0_4px_16px_rgba(0,0,0,0.85)] backdrop-blur flex items-center gap-1.5 cursor-pointer hover:bg-[#0c2f20] transition-all active:scale-95"
          >
            <span>📱</span>
            <span>{isRotatedView ? 'چرخش افقی فعال است' : 'چرخش تمام‌صفحه عمودی'}</span>
          </button>
        </div>
      )}

      {/* Scaled Wrapper filling the viewport */}
      <div
        style={{
          width:
            isPortrait && isRotatedView
              ? `${Math.round(ANDROID_LANDSCAPE_H * fitScale)}px`
              : `${Math.round(ANDROID_LANDSCAPE_W * fitScale)}px`,
          height:
            isPortrait && isRotatedView
              ? `${Math.round(ANDROID_LANDSCAPE_W * fitScale)}px`
              : `${Math.round(ANDROID_LANDSCAPE_H * fitScale)}px`,
        }}
        className="relative flex items-center justify-center shrink-0"
      >
        {/* HORIZONTAL (LANDSCAPE) ANDROID & TELEGRAM MINI APP SHELL (680 x 320 dp) */}
        <div
          style={{
            width: `${ANDROID_LANDSCAPE_W}px`,
            height: `${ANDROID_LANDSCAPE_H}px`,
            transform:
              isPortrait && isRotatedView
                ? `rotate(90deg) scale(${fitScale})`
                : `scale(${fitScale})`,
            transformOrigin: 'center center',
          }}
          className="relative bg-[#05110c] rounded-[20px] border-[2.5px] border-[#222825] ring-1 ring-[#c8a668]/45 shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col justify-between shrink-0"
        >
          {/* Subtle Android Front Camera Punch-Hole (Left Bezel in Landscape) */}
          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#020504] border border-white/10 z-40 pointer-events-none" />

          {/* 1. Photorealistic Luxury Dark Emerald Parlor & Velvet Table Background */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img
              src={isHomeScreen ? parlorBg : parlorOverheadBg}
              alt="Royal Backgammon Parlor Table"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center scale-[1.02] transition-opacity duration-300"
            />
            <div
              className="absolute inset-0"
              style={{
                background: isHomeScreen
                  ? 'linear-gradient(90deg, rgba(4, 15, 10, 0.96) 0%, rgba(5, 18, 12, 0.88) 28%, rgba(6, 22, 15, 0.30) 48%, rgba(5, 16, 11, 0.12) 74%, rgba(4, 12, 8, 0.45) 100%)'
                  : isGameScreen
                  ? 'radial-gradient(circle at center, rgba(4, 16, 11, 0.08) 0%, rgba(3, 10, 7, 0.62) 100%)'
                  : 'radial-gradient(circle at center, rgba(4, 15, 10, 0.58) 0%, rgba(3, 11, 7, 0.88) 100%)',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(3, 11, 7, 0.65) 0%, transparent 15%, transparent 84%, rgba(3, 10, 7, 0.88) 100%)',
              }}
            />
          </div>

          {/* 2. TOP BAR */}
          <header
            className={`relative z-30 w-full flex items-center justify-between shrink-0 ${
              isGameScreen
                ? 'h-[32px] px-3 bg-[#040e09]/92 border-b border-[#c8a668]/25'
                : 'h-[36px] pt-1.5 px-5'
            }`}
          >
            {isGameScreen ? (
              /* GAME PAGE TOP BAR: Player 1 (+Pips) vs Opponent (+Pips) + Timer + Cube + Swap Dice + Undo + Auto Roll + Auto Bear-Off */
              <>
                <div className="flex items-center gap-1 pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => navigateToScreen('home')}
                    className="px-1.5 py-0.5 rounded-[2px] bg-[#061810]/92 hover:bg-[#0c261b] border border-[#c8a668]/50 font-cinzel text-[6px] font-semibold tracking-[0.12em] text-[#f0e5ce] cursor-pointer"
                  >
                    &lt; LOBBY
                  </button>

                  {/* Player 1 (Gold/Light) Badge with Live Pip Count */}
                  <div
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] border transition-all ${
                      turn === 'light'
                        ? 'bg-[#0b261a]/95 border-[#e3c485] shadow-sm'
                        : 'bg-[#04100b]/85 border-[#c8a668]/25 opacity-75'
                    }`}
                  >
                    <img
                      src={boardCrestImg}
                      alt="Player"
                      className="w-2.5 h-2.5 rounded-full object-cover border border-[#e3c485]"
                    />
                    <span className="font-cinzel text-[6px] font-semibold tracking-[0.08em] text-[#f5dca8] tabular-nums">
                      {gameMode === 'online' || gameMode === 'friend'
                        ? assignedMultiplayerColor === 'light'
                          ? `${realState.playerName} (YOU)`
                          : onlineOpponent
                          ? `${onlineOpponent.username} (LVL ${onlineOpponent.level})`
                          : 'OPPONENT'
                        : realState.playerName}{' '}
                      ({lightBorneOff}/15 • {lightPipCount}P)
                    </span>
                  </div>

                  {/* Real Player Turn Countdown Timer (تایمر حرکت بازیکن) */}
                  <div
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-[2px] border font-cinzel text-[6px] font-bold tracking-[0.1em] tabular-nums ${
                      turnTimeLeft <= 7
                        ? 'bg-[#361410]/95 border-[#f28b6c] text-[#ffd4c4] animate-pulse'
                        : 'bg-[#061b12]/95 border-[#c8a668]/55 text-[#f5dca8]'
                    }`}
                  >
                    <span>⏱ {turnTimeLeft}S</span>
                  </div>

                  {/* Opponent (Silver/Dark) Badge with Live Pip Count */}
                  <div
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] border transition-all ${
                      turn === 'dark'
                        ? 'bg-[#0b261a]/95 border-[#e3c485] shadow-sm'
                        : 'bg-[#04100b]/85 border-[#c8a668]/25 opacity-75'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#8e97a2] border border-white/40 inline-block" />
                    <span className="font-cinzel text-[6px] font-semibold tracking-[0.08em] text-[#d8dee6] tabular-nums">
                      {gameMode === 'online' || gameMode === 'friend'
                        ? assignedMultiplayerColor === 'dark'
                          ? `${realState.playerName} (YOU)`
                          : onlineOpponent
                          ? `${onlineOpponent.username} (LVL ${onlineOpponent.level})`
                          : 'OPPONENT'
                        : gameMode === 'private'
                        ? 'PLAYER 2'
                        : 'ROYAL AI'}{' '}
                      ({darkBorneOff}/15 • {darkPipCount}P)
                    </span>
                  </div>
                </div>

                {/* Top-Right Game Controls: Doubling Cube, Swap Dice Order, Undo, Auto Roll, Auto Bear-Off, Reset, Settings */}
                <div className="flex items-center gap-1 pointer-events-auto">
                  {/* 3D Doubling Cube Button (مکعب دوبر) */}
                  <button
                    type="button"
                    onClick={handleOfferDouble}
                    title="Offer Doubling Cube (2x, 4x, 8x, 16x, 32x, 64x)"
                    className={`px-1.5 py-0.5 rounded-[2px] border font-cinzel text-[6px] font-bold tracking-[0.1em] transition-all cursor-pointer tabular-nums ${
                      !hasRolledThisTurn &&
                      !winner &&
                      doublingCubeValue < 64 &&
                      (doublingCubeOwner === 'center' ||
                        doublingCubeOwner === turn)
                        ? 'bg-[#1f1608]/95 border-[#f2d080] text-[#ffe4a0] hover:bg-[#33240c]'
                        : 'bg-[#04100b]/85 border-[#c8a668]/35 text-[#cbbca0]'
                    }`}
                  >
                    CUBE:{doublingCubeValue}X
                  </button>

                  {winner ? (
                    <button
                      type="button"
                      onClick={handleStartNewMatch}
                      className="px-2 py-0.5 rounded-[2px] brass-button-surface border border-[#ead4a4]/80 font-cinzel text-[6px] font-bold tracking-[0.12em] text-[#140e05] cursor-pointer"
                    >
                      PLAY AGAIN
                    </button>
                  ) : hasRolledThisTurn ? (
                    <button
                      type="button"
                      onClick={handleSwapDiceOrder}
                      title="Click to Swap Dice Order"
                      className="px-1.5 py-0.5 rounded-[2px] bg-[#04100b]/92 hover:bg-[#0b2419] border border-[#c8a668]/55 font-cinzel text-[6px] tracking-[0.1em] text-[#f2dca8] tabular-nums cursor-pointer"
                    >
                      {diceValues[0]}-{diceValues[1]}
                      {remainingDice.length > 0
                        ? ` (${remainingDice.join(',')})`
                        : ''}
                      {remainingDice.length === 2 &&
                      remainingDice[0] !== remainingDice[1]
                        ? ' ⇄'
                        : ''}
                    </button>
                  ) : null}

                  {/* UNDO Button (گزینه برگشت برای حرکت مهره به عقب) */}
                  <button
                    type="button"
                    disabled={moveHistory.length === 0 || Boolean(winner)}
                    onClick={handleUndoMove}
                    className={`px-1.5 py-0.5 rounded-[2px] border font-cinzel text-[6px] font-semibold tracking-[0.1em] transition-all ${
                      moveHistory.length > 0 && !winner
                        ? 'brass-button-surface border-[#ead4a4]/85 text-[#140e05] cursor-pointer active:scale-95'
                        : 'bg-[#04100b]/70 border-[#c8a668]/20 text-[#6e6a60] cursor-not-allowed'
                    }`}
                  >
                    ↶ UNDO{moveHistory.length > 0 ? `(${moveHistory.length})` : ''}
                  </button>

                  {/* AUTO DICE ROLL Toggle (گزینه پرتاب تاس خودکار) */}
                  <button
                    type="button"
                    onClick={handleToggleAutoRoll}
                    className={`px-1.5 py-0.5 rounded-[2px] border font-cinzel text-[5.8px] font-semibold tracking-[0.08em] transition-all cursor-pointer ${
                      realState.autoRoll
                        ? 'brass-button-surface border-[#ead4a4]/80 text-[#140e05]'
                        : 'bg-[#061810]/90 border-[#c8a668]/40 text-[#cbbca0]'
                    }`}
                  >
                    AUTO ROLL:{realState.autoRoll ? 'ON' : 'OFF'}
                  </button>

                  {/* AUTO BEAR-OFF AT ENDGAME Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleAutoBearOff}
                    className={`px-1.5 py-0.5 rounded-[2px] border font-cinzel text-[5.8px] font-semibold tracking-[0.08em] transition-all cursor-pointer ${
                      realState.autoBearOff
                        ? 'brass-button-surface border-[#ead4a4]/80 text-[#140e05]'
                        : 'bg-[#061810]/90 border-[#c8a668]/40 text-[#cbbca0]'
                    }`}
                  >
                    BEAR-OFF:{realState.autoBearOff ? 'AUTO' : 'OFF'}
                  </button>

                  <button
                    type="button"
                    onClick={handleStartNewMatch}
                    className="px-1.5 py-0.5 rounded-[2px] bg-[#061810]/92 hover:bg-[#0c261b] border border-[#c8a668]/40 font-cinzel text-[5.8px] tracking-[0.08em] text-[#e5dccb] cursor-pointer"
                  >
                    RESET
                  </button>

                  <button
                    type="button"
                    aria-label="Settings"
                    onClick={() => navigateToScreen('settings')}
                    className="p-0.5 text-[#c5a263] hover:text-[#ebd09a] cursor-pointer"
                  >
                    <GearSettingsIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : (
              /* LOBBY / INNER SCREENS TOP BAR */
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (boardState !== 'open') {
                      handleTouchClosedBoard();
                    } else if (!isHomeScreen) {
                      navigateToScreen('home');
                    } else {
                      enterGameTable('practice');
                    }
                  }}
                  className={`flex items-center gap-2 text-left transition-opacity duration-300 cursor-pointer group ${
                    hasLineStarted('brand') ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <RoyalCrownIcon className="w-4 h-3.5 text-[#c8a668] group-hover:text-[#e2c489] transition-colors shrink-0" />
                  <span className="font-cinzel text-[9px] font-medium tracking-[0.24em] text-[#e8dfd0] group-hover:text-white whitespace-nowrap">
                    {typedMap.brand}
                    {renderCursor('brand')}
                  </span>
                </button>

                <div
                  className={`flex items-center gap-3 transition-opacity duration-300 ${
                    hasLineStarted('coins') ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => navigateToScreen('wallet')}
                    className={`flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap px-1.5 py-0.5 rounded-[2px] ${
                      activeScreen === 'wallet'
                        ? 'bg-[#c8a668]/20 text-[#f5dca8] border border-[#c8a668]/50'
                        : 'text-[#e5dccb] hover:text-[#f5dca8]'
                    }`}
                  >
                    <WalletIcon
                      className="w-3 h-3 text-[#b89352] shrink-0"
                      filled={true}
                    />
                    <span className="font-cinzel text-[8px] tracking-[0.16em] tabular-nums">
                      {activeLineKey === 'coins'
                        ? typedMap.coins
                        : `${realState.coins.toLocaleString()} COINS`}
                      {renderCursor('coins')}
                    </span>
                  </button>

                  <div className="h-3 w-[1px] bg-[#c8a668]/30" />

                  <button
                    type="button"
                    aria-label="Settings"
                    onClick={() =>
                      navigateToScreen(
                        activeScreen === 'settings' ? 'home' : 'settings'
                      )
                    }
                    className={`p-1 rounded-[2px] transition-all duration-200 cursor-pointer ${
                      activeScreen === 'settings'
                        ? 'bg-[#c8a668]/25 text-[#f5dca8] border border-[#c8a668]/60 rotate-45'
                        : 'text-[#c5a263] hover:text-[#ebd09a] hover:rotate-45'
                    }`}
                  >
                    <GearSettingsIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </header>

          {/* 3. CENTER LANDSCAPE BODY */}
          <div className="relative z-10 w-full flex-1 min-h-0 flex flex-row items-center">
            {/* SHARED 3D GLB STAGE */}
            <div
              className={`w-full h-full flex flex-row items-center ${
                show3DStage
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none absolute inset-0'
              }`}
            >
              {/* LEFT MENU COLUMN (Visible only on Home Screen) */}
              {isHomeScreen && (
                <main className="relative z-20 w-[34%] h-full pl-5 pr-1.5 flex flex-col justify-center min-h-0">
                  <div className="mb-2 min-h-[42px]">
                    {hasLineStarted('hero1') && (
                      <h1 className="font-cormorant text-[21px] font-normal leading-[1.02] tracking-[0.04em] text-[#ece5d5] uppercase">
                        <span className="block whitespace-nowrap">
                          {typedMap.hero1}
                          {renderCursor('hero1')}
                        </span>
                        {hasLineStarted('hero2') && (
                          <span className="block whitespace-nowrap">
                            {typedMap.hero2}
                            {renderCursor('hero2')}
                          </span>
                        )}
                      </h1>
                    )}
                  </div>

                  {/* Menu Options List — All 100% Connected to the Active 3D Game Page */}
                  <div className="flex flex-col">
                    {/* Option 1: ONLINE MATCH */}
                    <div
                      className={`transition-opacity duration-200 ${
                        hasLineStarted('opt1Title')
                          ? 'opacity-100 pointer-events-auto'
                          : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          royalSound.playOptionClickSound();
                          setIsTiersModalOpen(true);
                        }}
                        className="w-full py-1.5 flex items-center justify-between gap-2 text-left group border-b border-[#c8a668]/20 hover:border-[#c8a668]/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <GlobeMatchIcon className="w-4 h-4 text-[#b99656] group-hover:text-[#e2c285] transition-colors shrink-0" />
                          <div className="min-w-0">
                            <span className="font-cinzel text-[9px] tracking-[0.12em] text-[#ebe3d2] group-hover:text-white transition-colors whitespace-nowrap block">
                              {typedMap.opt1Title}
                              {renderCursor('opt1Title')}
                            </span>
                            <p className="font-cormorant text-[9.5px] text-[#a39e93] truncate leading-tight">
                              {typedMap.opt1Sub}
                              {renderCursor('opt1Sub')}
                            </p>
                          </div>
                        </div>
                        <ChevronRightIcon className="w-2.5 h-2.5 text-[#b99656] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    </div>

                    {/* Option 2: PRACTICE */}
                    <div
                      className={`transition-opacity duration-200 ${
                        hasLineStarted('opt2Title')
                          ? 'opacity-100 pointer-events-auto'
                          : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => enterGameTable('practice')}
                        className="w-full py-1.5 flex items-center justify-between gap-2 text-left group border-b border-[#c8a668]/20 hover:border-[#c8a668]/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <SinglePlayerIcon className="w-4 h-4 text-[#b99656] group-hover:text-[#e2c285] transition-colors shrink-0" />
                          <div className="min-w-0">
                            <span className="font-cinzel text-[9px] tracking-[0.12em] text-[#ebe3d2] group-hover:text-white transition-colors whitespace-nowrap block">
                              {typedMap.opt2Title}
                              {renderCursor('opt2Title')}
                            </span>
                            <p className="font-cormorant text-[9.5px] text-[#a39e93] truncate leading-tight">
                              {typedMap.opt2Sub}
                              {renderCursor('opt2Sub')}
                            </p>
                          </div>
                        </div>
                        <ChevronRightIcon className="w-2.5 h-2.5 text-[#b99656] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    </div>

                    {/* Option 3: PLAY WITH FRIENDS */}
                    <div
                      className={`transition-opacity duration-200 ${
                        hasLineStarted('opt3Title')
                          ? 'opacity-100 pointer-events-auto'
                          : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setIsFriendsModalOpen(true)}
                        className="w-full py-1.5 flex items-center justify-between gap-2 text-left group transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <GroupPlayersIcon className="w-4 h-4 text-[#b99656] group-hover:text-[#e2c285] transition-colors shrink-0" />
                          <div className="min-w-0">
                            <span className="font-cinzel text-[9px] tracking-[0.12em] text-[#ebe3d2] group-hover:text-white transition-colors whitespace-nowrap block">
                              {typedMap.opt3Title}
                              {renderCursor('opt3Title')}
                            </span>
                            <p className="font-cormorant text-[9.5px] text-[#a39e93] truncate leading-tight">
                              {typedMap.opt3Sub}
                              {renderCursor('opt3Sub')}
                            </p>
                          </div>
                        </div>
                        <ChevronRightIcon className="w-2.5 h-2.5 text-[#b99656] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    </div>
                  </div>

                  {/* Primary Brushed Brass Button: TAKE YOUR SEAT */}
                  <div
                    className={`mt-2 transition-all duration-300 ${
                      hasLineStarted('cta')
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 translate-y-1 pointer-events-none'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleStartOnlineMatch('quick_seat')}
                      className="w-full h-[28px] px-3.5 rounded-[3px] brass-button-surface border border-[#ead4a4]/65 flex items-center justify-between group cursor-pointer active:scale-[0.99] transition-transform"
                    >
                      <span className="font-cinzel text-[9px] font-semibold tracking-[0.18em] text-[#140e05] whitespace-nowrap">
                        {typedMap.cta}
                        {renderCursor('cta')}
                      </span>
                      <ChevronRightIcon className="w-2.5 h-2.5 text-[#140e05] group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </button>
                  </div>
                </main>
              )}

              {/* 3D GLB BACKGAMMON BOARD STAGE */}
              <div
                className={`relative h-full shrink-0 flex items-center justify-center ${
                  isGameScreen ? 'w-full' : 'w-[66%]'
                }`}
              >
                <div
                  ref={canvasContainerRef}
                  className={`w-full h-full ${
                    isBoardHovered ? 'cursor-pointer' : ''
                  }`}
                />

                {/* ON-DICE "ROLL" HOTSPOT (گزینه Roll روی خود تاس‌ها در سمت راست تخته) */}
                {isWaitingForPlayerDiceRoll && (
                  <button
                    type="button"
                    onClick={handleRollDice}
                    style={{
                      left: `${diceScreenPos.xPercent}%`,
                      top: `${diceScreenPos.yPercent}%`,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-[125%] z-20 pointer-events-auto px-2 py-0.5 rounded-[3px] brass-button-surface border border-[#fff2cf] shadow-[0_4px_14px_rgba(0,0,0,0.85)] flex items-center gap-1 cursor-pointer animate-bounce active:scale-95"
                  >
                    <DiceStoreIcon className="w-2.5 h-2.5 text-[#140e05]" />
                    <span className="font-cinzel text-[6.5px] font-bold tracking-[0.16em] text-[#140e05] whitespace-nowrap">
                      ROLL
                    </span>
                  </button>
                )}

                {/* Doubling Cube Offer Modal for Private 2-Player Table */}
                {isGameScreen && pendingDoubleOffer && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
                    <div className="rounded-[4px] bg-[#061810]/96 border border-[#e3c485] px-5 py-3 shadow-[0_14px_36px_rgba(0,0,0,0.95)] flex flex-col items-center gap-2">
                      <span className="font-cinzel text-[9px] font-bold tracking-[0.18em] text-[#f5dca8]">
                        DOUBLING CUBE OFFERED ({pendingDoubleOffer.proposedValue}X)
                      </span>
                      <span className="font-cormorant text-[9.5px] text-[#cfc6b4]">
                        {pendingDoubleOffer.offeredBy === 'light'
                          ? realState.playerName
                          : 'PLAYER 2'}{' '}
                        raises the table stakes to {pendingDoubleOffer.proposedValue}X
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => handleRespondToDoubleOffer(true)}
                          className="px-3 py-1 rounded-[2px] brass-button-surface border border-[#fff0c4] font-cinzel text-[7px] font-bold tracking-[0.16em] text-[#140e05] cursor-pointer"
                        >
                          TAKE CUBE ({pendingDoubleOffer.proposedValue}X)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespondToDoubleOffer(false)}
                          className="px-3 py-1 rounded-[2px] bg-[#2a100c] border border-[#e58b78]/60 font-cinzel text-[7px] font-semibold tracking-[0.14em] text-[#ffd4c8] cursor-pointer"
                        >
                          DROP &amp; FORFEIT
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Touch Prompt while 3D Board is Closed on Home */}
                {isHomeScreen && boardState === 'closed' && (
                  <div className="absolute inset-x-0 bottom-2 z-20 flex justify-center pointer-events-none px-3">
                    <button
                      type="button"
                      onClick={handleTouchClosedBoard}
                      className="pointer-events-auto flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-sm bg-[#071710]/92 border border-[#c8a668]/55 backdrop-blur-md shadow-[0_8px_22px_rgba(0,0,0,0.85)] active:scale-95 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-[#e5d6b8]">
                        <RoyalCrownIcon className="w-3.5 h-3 text-[#c8a668]" />
                        <span className="font-cinzel text-[8.5px] font-semibold tracking-[0.18em] text-[#f0e5ce] uppercase">
                          {glbReady
                            ? 'TOUCH BOARD TO OPEN'
                            : 'LOADING 3D GLB MODEL...'}
                        </span>
                      </div>
                      <span className="font-cormorant text-[8.5px] tracking-[0.08em] text-[#b89758]">
                        Tap the Royal Lion &amp; Sun case to unfold
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* STORE / COLLECTION SCREEN (BOARDS | CHECKERS | DICE) */}
            {activeScreen === 'collection' && (
              <CollectionStoreView
                activeCategory={storeCategory}
                onSelectCategory={setStoreCategory}
                ownedIds={realState.ownedIds}
                equipped={realState.equipped}
                coins={realState.coins}
                onEquipOrBuy={handleEquipOrBuyItem}
              />
            )}

            {/* PROFILE SCREEN (100% Real Player Stats) */}
            {activeScreen === 'profile' && (
              <ProfileView
                playerName={realState.playerName}
                joinedDate={realState.joinedDate}
                onUpdatePlayerName={(name) =>
                  setRealState((prev) => ({ ...prev, playerName: name }))
                }
                realStats={realState.realStats}
                ownedCount={realState.ownedIds.length}
                equipped={realState.equipped}
                onOpenStoreCategory={(cat) => {
                  setStoreCategory(cat);
                  setActiveScreen('collection');
                }}
                onOpenGameTable={() => enterGameTable('practice')}
                onResetStats={handleResetRealStats}
              />
            )}

            {/* WALLET SCREEN (100% Real Balance & Ledger) */}
            {activeScreen === 'wallet' && (
              <WalletView
                coins={realState.coins}
                usdtBalance={usdtBalance}
                tributeClaimed={isTributeClaimedToday}
                transactions={realState.transactions}
                usdtTransactions={usdtTransactions}
                onClaimTribute={handleClaimDailyTribute}
                onAcquireCoins={handleAcquireCoins}
                onDepositUsdt={handleDepositUsdt}
                onWithdrawUsdt={handleWithdrawUsdt}
              />
            )}

            {/* SETTINGS & TELEGRAM PUBLISHING SCREEN */}
            {activeScreen === 'settings' && (
              <SettingsView
                sfxEnabled={realState.sfxEnabled}
                onToggleSfx={() =>
                  setRealState((prev) => ({
                    ...prev,
                    sfxEnabled: !prev.sfxEnabled,
                  }))
                }
                boardZoom={realState.boardZoom}
                onToggleBoardZoom={handleToggleBoardZoom}
                autoRoll={realState.autoRoll}
                onToggleAutoRoll={handleToggleAutoRoll}
                autoBearOff={realState.autoBearOff}
                onToggleAutoBearOff={handleToggleAutoBearOff}
                onCopyTelegramUrl={handleCopyTelegramUrl}
                onDownloadTelegramConfig={handleDownloadTelegramConfig}
                onDownloadTelegramBotScript={handleDownloadTelegramBotScript}
                onShareOnTelegram={handleShareOnTelegram}
                onResetAllData={handleResetAllData}
                onBackHome={() => setActiveScreen('home')}
              />
            )}
          </div>

          {/* 4. BOTTOM NAVIGATION BAR */}
          <footer
            className={`relative z-30 w-full flex items-center justify-between shrink-0 border-t border-[#c8a668]/25 bg-[#040d09]/92 transition-opacity duration-300 ${
              isGameScreen ? 'h-[28px] px-4' : 'h-[34px] px-5'
            } ${
              hasLineStarted('navHome') || !isHomeScreen
                ? 'opacity-100'
                : 'opacity-0 pointer-events-none'
            }`}
          >
            <nav className="flex items-center h-full pointer-events-auto">
              {/* HOME */}
              <button
                type="button"
                onClick={() => navigateToScreen('home')}
                className={`relative h-full px-2 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap group ${
                  activeScreen === 'home'
                    ? 'text-[#ebe3d2]'
                    : 'text-[#7e7c74] hover:text-[#ebe3d2]'
                }`}
              >
                <HomeIcon
                  className={`w-2.5 h-2.5 shrink-0 transition-colors ${
                    activeScreen === 'home'
                      ? 'text-[#c8a668]'
                      : 'text-[#7e7c74] group-hover:text-[#c8a668]'
                  }`}
                />
                <span className="font-cinzel text-[7px] tracking-[0.15em]">
                  {typedMap.navHome || 'HOME'}
                  {renderCursor('navHome')}
                </span>
                {activeScreen === 'home' && (
                  <span className="absolute bottom-0.5 left-2 right-2 h-[1px] bg-[#c8a668]" />
                )}
              </button>

              <div className="h-2.5 w-[1px] bg-[#c8a668]/20 mx-0.5" />

              {/* COLLECTION (STORE: BOARDS, CHECKERS, DICE) */}
              <button
                type="button"
                onClick={() => navigateToScreen('collection')}
                className={`relative h-full px-2 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap group ${
                  activeScreen === 'collection'
                    ? 'text-[#ebe3d2]'
                    : 'text-[#7e7c74] hover:text-[#ebe3d2]'
                }`}
              >
                <CollectionIcon
                  className={`w-2.5 h-2.5 shrink-0 transition-colors ${
                    activeScreen === 'collection'
                      ? 'text-[#c8a668]'
                      : 'text-[#7e7c74] group-hover:text-[#c8a668]'
                  }`}
                />
                <span className="font-cinzel text-[7px] tracking-[0.15em]">
                  {typedMap.navCollection || 'COLLECTION'}
                  {renderCursor('navCollection')}
                </span>
                {activeScreen === 'collection' && (
                  <span className="absolute bottom-0.5 left-2 right-2 h-[1px] bg-[#c8a668]" />
                )}
              </button>

              <div className="h-2.5 w-[1px] bg-[#c8a668]/20 mx-0.5" />

              {/* PROFILE */}
              <button
                type="button"
                onClick={() => navigateToScreen('profile')}
                className={`relative h-full px-2 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap group ${
                  activeScreen === 'profile'
                    ? 'text-[#ebe3d2]'
                    : 'text-[#7e7c74] hover:text-[#ebe3d2]'
                }`}
              >
                <SinglePlayerIcon
                  className={`w-2.5 h-2.5 shrink-0 transition-colors ${
                    activeScreen === 'profile'
                      ? 'text-[#c8a668]'
                      : 'text-[#7e7c74] group-hover:text-[#c8a668]'
                  }`}
                />
                <span className="font-cinzel text-[7px] tracking-[0.15em]">
                  {typedMap.navProfile || 'PROFILE'}
                  {renderCursor('navProfile')}
                </span>
                {activeScreen === 'profile' && (
                  <span className="absolute bottom-0.5 left-2 right-2 h-[1px] bg-[#c8a668]" />
                )}
              </button>

              <div className="h-2.5 w-[1px] bg-[#c8a668]/20 mx-0.5" />

              {/* WALLET */}
              <button
                type="button"
                onClick={() => navigateToScreen('wallet')}
                className={`relative h-full px-2 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap group ${
                  activeScreen === 'wallet'
                    ? 'text-[#ebe3d2]'
                    : 'text-[#7e7c74] hover:text-[#ebe3d2]'
                }`}
              >
                <WalletIcon
                  className={`w-2.5 h-2.5 shrink-0 transition-colors ${
                    activeScreen === 'wallet'
                      ? 'text-[#c8a668]'
                      : 'text-[#7e7c74] group-hover:text-[#c8a668]'
                  }`}
                />
                <span className="font-cinzel text-[7px] tracking-[0.15em]">
                  {typedMap.navWallet || 'WALLET'}
                  {renderCursor('navWallet')}
                </span>
                {activeScreen === 'wallet' && (
                  <span className="absolute bottom-0.5 left-2 right-2 h-[1px] bg-[#c8a668]" />
                )}
              </button>
            </nav>

            {/* Right Status / Quick Game Launch */}
            {isGameScreen ? (
              <span className="font-cinzel text-[6px] tracking-[0.12em] text-[#e3c485] whitespace-nowrap pointer-events-auto">
                {victoryBanner
                  ? victoryBanner
                  : !isHumanTurn
                  ? `WAITING FOR ${
                      onlineOpponent ? onlineOpponent.username : 'OPPONENT'
                    }'S MOVE...`
                  : !hasRolledThisTurn
                  ? `TOUCH 3D DICE TO ROLL • RNG:${(
                      realState.realStats.lastRollProofHash ?? 'CSPRNG'
                    ).slice(0, 8)}`
                  : selectedLocation
                  ? 'GREEN = 1 DIE • GOLD = COMBINED MULTI-DIE MOVE'
                  : `SELECT A ${
                      turn === 'light' ? 'GOLD' : 'SILVER'
                    } CHECKER TO MOVE`}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => enterGameTable('practice')}
                className="flex items-center font-cinzel text-[7px] tracking-[0.16em] text-[#7a7870] hover:text-[#c8a668] transition-colors whitespace-nowrap cursor-pointer pointer-events-auto"
              >
                {typedMap.motto || 'A HIGHER KIND OF PLAY'}
                {renderCursor('motto')}
              </button>
            )}
          </footer>

          {/* 5. English Luxury Notification Toast */}
          {comingSoonModal && (
            <div className="absolute inset-x-0 top-8 z-50 flex justify-center pointer-events-none px-3">
              <div
                key={comingSoonModal.timestamp}
                className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-1.5 rounded-sm bg-[#071911]/95 border border-[#c8a668]/70 shadow-[0_10px_28px_rgba(0,0,0,0.9)] backdrop-blur-md"
              >
                <RoyalCrownIcon className="w-4 h-3.5 text-[#d4b26f] shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="font-cinzel text-[8.5px] font-semibold tracking-[0.18em] text-[#f3e6c8] uppercase">
                    {comingSoonModal.title}
                  </span>
                  <span className="font-cinzel text-[6.5px] tracking-[0.14em] text-[#b99656] uppercase">
                    {comingSoonModal.subtitle}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setComingSoonModal(null)}
                  className="ml-1 text-[9px] font-cinzel text-[#9e885c] hover:text-[#e8d5b0] px-1 py-0.5 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* 5 Online Tournament Tiers Modal (1 to 25 USDT, Levels 0 to 81+) */}
          <OnlineTiersModal
            isOpen={isTiersModalOpen}
            onClose={() => setIsTiersModalOpen(false)}
            playerLevel={playerLevel}
            playerRating={playerRating}
            usdtBalance={usdtBalance}
            onSelectTier={(tier) => {
              setIsTiersModalOpen(false);
              handleStartOnlineMatch('online_match', tier.id);
            }}
            onOpenWallet={() => {
              setIsTiersModalOpen(false);
              navigateToScreen('wallet');
            }}
          />

          {/* Real Online Matchmaking Modal */}
          <OnlineMatchmakingModal
            isOpen={isMatchmakingOpen}
            mode={matchmakingMode}
            player={{
              username: realState.playerName,
              level: playerLevel,
              wins: realState.realStats.wins,
              matchesPlayed: realState.realStats.matchesPlayed,
            }}
            onlineCount={onlineCount}
            queueCount={queueCount}
            matchedOpponent={matchedOpponent}
            onCancel={() => {
              multiplayerClient.cancelMatchmaking();
              setIsMatchmakingOpen(false);
            }}
          />

          {/* Real Online Friends & Challenges Modal */}
          <FriendsModal
            isOpen={isFriendsModalOpen}
            onClose={() => setIsFriendsModalOpen(false)}
            friends={friends}
            incomingRequests={incomingRequests}
            outgoingRequests={outgoingRequests}
            searchResults={searchResults}
            onSearchUsers={(q) => multiplayerClient.searchUsers(q)}
            onSendFriendRequest={(targetId) =>
              multiplayerClient.sendFriendRequest(targetId)
            }
            onAcceptFriendRequest={(reqId) =>
              multiplayerClient.acceptFriendRequest(reqId)
            }
            onRejectFriendRequest={(reqId) =>
              multiplayerClient.rejectFriendRequest(reqId)
            }
            onChallengeFriend={(targetId) => {
              multiplayerClient.sendFriendChallenge(targetId);
              showToastNotification(
                'challenge-sent',
                'CHALLENGE SENT',
                'Waiting for friend to accept...'
              );
            }}
          />

          {/* Incoming Real Challenge Modal */}
          <IncomingChallengeModal
            challenge={incomingChallenge}
            onAccept={(chalId) => {
              multiplayerClient.respondFriendChallenge(chalId, true);
              setIncomingChallenge(null);
            }}
            onDecline={(chalId) => {
              multiplayerClient.respondFriendChallenge(chalId, false);
              setIncomingChallenge(null);
            }}
          />
        </div>
      </div>
    </div>
  );
}
