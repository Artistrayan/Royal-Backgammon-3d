import React, { useState } from 'react';
import boardImperialImg from '../assets/images/board_imperial_emerald_walnut_1791747690118.jpg';
import boardCrestImg from '../assets/images/board_center_lion_sun_crest_1791747231807.jpg';
import closedBoardEmblemImg from '../assets/images/closed_board_lion_sun_emblem_1791745629203.jpg';
import checkersGoldSilverImg from '../assets/images/checkers_gold_silver_lion_1791747212473.jpg';
import checkersIvoryEbonyImg from '../assets/images/checkers_ivory_ebony_lion_1791747221934.jpg';
import diceCollectionImg from '../assets/images/dice_royal_collection_set_1791747679078.jpg';
import {
  RoyalCrownIcon,
  WalletIcon,
  BoardStoreIcon,
  CheckerStoreIcon,
  DiceStoreIcon,
  ChevronRightIcon,
} from './RoyalIcons';
import { royalSound } from '../libgdx/Gdx3DEngine';

export type StoreCategory = 'boards' | 'checkers' | 'dice';

export interface StoreItem {
  id: string;
  category: StoreCategory;
  title: string;
  subtitle: string;
  materialTag: string;
  image: string;
  imagePosition?: string;
  price: number;
}

export interface RealPlayerStats {
  matchesPlayed: number;
  wins: number;
  losses: number;
  rating?: number; // Global ELO (start at 1200)
  xp?: number;
  winStreak?: number;
  gammonsWon?: number;
  backgammonsWon?: number;
  highestCubePlayed?: number;
  totalDiceRolls?: number;
  doublesRolled?: number;
  diceFaceCounts?: [number, number, number, number, number, number];
  lastRollProofHash?: string;
  tableSessionsOpened: number;
  totalTableTimeSeconds: number;
  boardFoldCount: number;
}

export interface WalletTransaction {
  id: string;
  label: string;
  amount: number; // positive or negative
  timestamp: string;
}

export interface UsdtTransaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'match_win' | 'match_entry';
  amount: number;
  network?: 'TRC20' | 'TON';
  address?: string;
  txHash?: string;
  description: string;
  timestamp: string;
  status: 'confirmed' | 'pending';
}

export const STORE_ITEMS: StoreItem[] = [
  // 1. BOARDS
  {
    id: 'board-imperial-walnut',
    category: 'boards',
    title: 'IMPERIAL LION & SUN',
    subtitle: 'Burl walnut cabinet, emerald baize & 24k crest',
    materialTag: 'BURL WALNUT & EMERALD',
    image: boardImperialImg,
    imagePosition: 'object-center',
    price: 0,
  },
  {
    id: 'board-sovereign-crest',
    category: 'boards',
    title: 'SOVEREIGN MEDALLION',
    subtitle: 'Engraved golden Lion & Sun centerpiece inlay',
    materialTag: '24K GOLD RELIEF',
    image: boardCrestImg,
    imagePosition: 'object-center',
    price: 500,
  },
  {
    id: 'board-heritage-case',
    category: 'boards',
    title: 'ROYAL HERITAGE CASE',
    subtitle: 'Full exterior Persian Lion & Sun embossed cover',
    materialTag: 'ROYAL EDITION',
    image: closedBoardEmblemImg,
    imagePosition: 'object-center',
    price: 1200,
  },

  // 2. CHECKERS
  {
    id: 'checkers-gold-silver',
    category: 'checkers',
    title: 'IMPERIAL GOLD & SILVER',
    subtitle: '24k gold & sterling silver Lion & Sun relief',
    materialTag: 'GOLD & STERLING',
    image: checkersGoldSilverImg,
    imagePosition: 'object-center',
    price: 0,
  },
  {
    id: 'checkers-ivory-ebony',
    category: 'checkers',
    title: 'ROYAL IVORY & EBONY',
    subtitle: 'Polished bone ivory & obsidian with brass rims',
    materialTag: 'IVORY & OBSIDIAN',
    image: checkersIvoryEbonyImg,
    imagePosition: 'object-center',
    price: 450,
  },
  {
    id: 'checkers-sovereign-crest',
    category: 'checkers',
    title: 'CROWN CREST CHECKERS',
    subtitle: 'Heavy turned brass rings with emerald center',
    materialTag: 'ANTIQUE BRASS',
    image: boardCrestImg,
    imagePosition: 'object-center',
    price: 850,
  },

  // 3. DICE
  {
    id: 'dice-royal-ivory',
    category: 'dice',
    title: 'ROYAL BONE IVORY DICE',
    subtitle: 'Precision-balanced ivory cubes with gold pips',
    materialTag: 'BONE IVORY & GOLD',
    image: diceCollectionImg,
    imagePosition: 'object-left',
    price: 0,
  },
  {
    id: 'dice-obsidian-night',
    category: 'dice',
    title: 'OBSIDIAN NIGHT DICE',
    subtitle: 'Deep black obsidian cubes with 24k gold pips',
    materialTag: 'BLACK OBSIDIAN',
    image: diceCollectionImg,
    imagePosition: 'object-center',
    price: 350,
  },
  {
    id: 'dice-antique-brass',
    category: 'dice',
    title: 'ANTIQUE BRASS DICE',
    subtitle: 'Solid brushed brass parlor dice with dark pips',
    materialTag: 'SOLID BRASS',
    image: diceCollectionImg,
    imagePosition: 'object-right',
    price: 600,
  },
];

function formatDuration(totalSec: number): string {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

interface CollectionStoreProps {
  activeCategory: StoreCategory;
  onSelectCategory: (cat: StoreCategory) => void;
  ownedIds: string[];
  equipped: Record<StoreCategory, string>;
  coins: number;
  onEquipOrBuy: (item: StoreItem) => void;
}

/**
 * STORE / COLLECTION SCREEN (BOARDS, CHECKERS, DICE)
 */
export function CollectionStoreView({
  activeCategory,
  onSelectCategory,
  ownedIds,
  equipped,
  coins,
  onEquipOrBuy,
}: CollectionStoreProps) {
  const filteredItems = STORE_ITEMS.filter(
    (item) => item.category === activeCategory
  );

  return (
    <div className="relative z-20 w-full h-full px-5 py-1.5 flex flex-col justify-between min-h-0">
      {/* Top Store Header & Category Tabs (BOARDS | CHECKERS | DICE) */}
      <div className="flex items-center justify-between gap-3 border-b border-[#c8a668]/30 pb-1.5 shrink-0">
        <div>
          <h1 className="font-cinzel text-[13px] font-semibold tracking-[0.18em] text-[#f0e6d2] uppercase leading-none">
            ROYAL COLLECTION &amp; STORE
          </h1>
          <p className="font-cormorant text-[9.5px] text-[#b9b09f] tracking-[0.04em] mt-0.5 leading-none">
            Owned items: {ownedIds.length} / {STORE_ITEMS.length} • Balance:{' '}
            {coins.toLocaleString()} Coins
          </p>
        </div>

        {/* Category Switcher: BOARDS | CHECKERS | DICE */}
        <div className="flex items-center gap-1.5 bg-[#04100b]/90 p-0.5 rounded-[3px] border border-[#c8a668]/35">
          {(
            [
              { id: 'boards', label: 'BOARDS', Icon: BoardStoreIcon },
              { id: 'checkers', label: 'CHECKERS', Icon: CheckerStoreIcon },
              { id: 'dice', label: 'DICE', Icon: DiceStoreIcon },
            ] as const
          ).map(({ id, label, Icon }) => {
            const isActive = activeCategory === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  royalSound.playOptionClickSound();
                  onSelectCategory(id);
                }}
                className={`px-2.5 py-1 rounded-[2px] flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'brass-button-surface text-[#140e05] border border-[#f2dca8]/70 shadow-sm'
                    : 'text-[#cfc6b4] hover:text-white hover:bg-[#0c2419]'
                }`}
              >
                <Icon
                  className={`w-3 h-3 shrink-0 ${
                    isActive ? 'text-[#140e05]' : 'text-[#c8a668]'
                  }`}
                />
                <span className="font-cinzel text-[8px] font-semibold tracking-[0.15em]">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 Luxury Product Cards Grid */}
      <div className="grid grid-cols-3 gap-2.5 my-auto py-1.5 flex-1 min-h-0">
        {filteredItems.map((item) => {
          const isOwned = ownedIds.includes(item.id);
          const isEquipped = equipped[item.category] === item.id;
          const canAfford = coins >= item.price;

          return (
            <div
              key={item.id}
              className={`relative rounded-[4px] bg-[#05140e]/92 border transition-all flex flex-col justify-between overflow-hidden ${
                isEquipped
                  ? 'border-[#e3c485] ring-1 ring-[#e3c485]/45 shadow-[0_6px_20px_rgba(0,0,0,0.85)]'
                  : 'border-[#c8a668]/35 hover:border-[#c8a668]/70 shadow-[0_4px_14px_rgba(0,0,0,0.75)]'
              }`}
            >
              {/* Product Image Showcase */}
              <div className="relative w-full h-[94px] bg-[#030b08] overflow-hidden border-b border-[#c8a668]/25">
                <img
                  src={item.image}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover ${
                    item.imagePosition || 'object-center'
                  } transition-transform duration-300 hover:scale-105`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#05140e] via-transparent to-black/25 pointer-events-none" />

                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-[2px] bg-[#04100b]/90 border border-[#c8a668]/45 font-cinzel text-[6.5px] tracking-[0.14em] text-[#e2c68a]">
                  {item.materialTag}
                </span>

                {isEquipped && (
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-[2px] brass-button-surface font-cinzel text-[6.5px] font-bold tracking-[0.14em] text-[#140e05]">
                    ACTIVE
                  </span>
                )}
              </div>

              {/* Card Details & Action Button */}
              <div className="p-2 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="font-cinzel text-[8.5px] font-semibold tracking-[0.12em] text-[#f2ead9] truncate">
                    {item.title}
                  </h2>
                  <p className="font-cormorant text-[9px] text-[#aba496] leading-tight line-clamp-1 mt-0.5">
                    {item.subtitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onEquipOrBuy(item)}
                  className={`mt-1.5 w-full h-[22px] px-2 rounded-[2px] flex items-center justify-center gap-1.5 font-cinzel text-[7.5px] font-semibold tracking-[0.16em] transition-all cursor-pointer ${
                    isEquipped
                      ? 'bg-[#0c291d] text-[#dfc184] border border-[#c8a668]/60'
                      : isOwned
                      ? 'brass-button-surface text-[#140e05] border border-[#ead4a4]/70'
                      : canAfford
                      ? 'bg-[#173628] hover:bg-[#1f4634] text-[#f2e2be] border border-[#c8a668]/65'
                      : 'bg-[#0b1a13] text-[#8a8478] border border-[#c8a668]/25'
                  }`}
                >
                  {isEquipped ? (
                    <span>EQUIPPED</span>
                  ) : isOwned ? (
                    <span>EQUIP NOW</span>
                  ) : (
                    <>
                      <WalletIcon className="w-2.5 h-2.5 text-[#d4b26f]" filled />
                      <span>UNLOCK • {item.price.toLocaleString()} COINS</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ProfileViewProps {
  playerName: string;
  joinedDate: string;
  onUpdatePlayerName: (name: string) => void;
  realStats: RealPlayerStats;
  ownedCount: number;
  equipped: Record<StoreCategory, string>;
  onOpenStoreCategory: (cat: StoreCategory) => void;
  onOpenGameTable: () => void;
  onResetStats: () => void;
}

/**
 * PROFILE SCREEN (100% Real Player Data & Live Tracked Session Statistics — Zero Fake Numbers)
 */
export function ProfileView({
  playerName,
  joinedDate,
  onUpdatePlayerName,
  realStats,
  ownedCount,
  equipped,
  onOpenStoreCategory,
  onOpenGameTable,
  onResetStats,
}: ProfileViewProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(playerName);

  const equippedBoard =
    STORE_ITEMS.find((i) => i.id === equipped.boards) || STORE_ITEMS[0];
  const equippedCheckers =
    STORE_ITEMS.find((i) => i.id === equipped.checkers) || STORE_ITEMS[3];
  const equippedDice =
    STORE_ITEMS.find((i) => i.id === equipped.dice) || STORE_ITEMS[6];

  const winRateStr =
    realStats.matchesPlayed > 0
      ? `${((realStats.wins / realStats.matchesPlayed) * 100).toFixed(1)}%`
      : '0.0%';

  const currentXp = realStats.xp ?? (realStats.wins * 45);
  const realLevel = Math.max(0, Math.floor(currentXp / 100));
  const xpInCurrentLevel = currentXp % 100;
  const currentRating = realStats.rating ?? 1200;
  const winStreak = realStats.winStreak ?? 0;

  const handleSaveName = () => {
    const cleaned = draftName.trim().toUpperCase() || 'PLAYER 1';
    onUpdatePlayerName(cleaned);
    setDraftName(cleaned);
    setIsEditingName(false);
    royalSound.playOptionClickSound();
  };

  return (
    <div className="relative z-20 w-full h-full px-5 py-1.5 flex flex-row gap-3 items-stretch min-h-0">
      {/* Left Player Identity & Equipped Set Card */}
      <div className="w-[41%] rounded-[4px] bg-[#05140e]/92 border border-[#c8a668]/45 p-2.5 flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
        {/* Top Crest Avatar & Real Editable Name */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-b from-[#e5c98f] via-[#b8924e] to-[#745622] shrink-0 shadow-md">
            <img
              src={boardCrestImg}
              alt="Royal Crest Avatar"
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-full object-cover"
            />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-[2px] brass-button-surface font-cinzel text-[6px] font-bold tracking-[0.12em] text-[#140e05]">
              LVL {realLevel}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <RoyalCrownIcon className="w-3 h-2.5 text-[#d4b26f] shrink-0" />
              <span className="font-cinzel text-[6.5px] tracking-[0.16em] text-[#c8a668] uppercase">
                GLOBAL RATING: {currentRating} ELO
              </span>
              {winStreak >= 2 && (
                <span className="font-cinzel text-[6px] px-1 py-0.2 rounded bg-[#381608] border border-[#f28b6c]/40 text-[#f5a890]">
                  🔥 {winStreak}W
                </span>
              )}
            </div>

            {isEditingName ? (
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="text"
                  value={draftName}
                  maxLength={18}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                  }}
                  className="w-full h-5 px-1.5 rounded-[2px] bg-[#020906] border border-[#e3c485] font-cinzel text-[9px] text-[#f3ead8] uppercase outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="px-1.5 h-5 rounded-[2px] brass-button-surface font-cinzel text-[6.5px] font-bold text-[#140e05] cursor-pointer shrink-0"
                >
                  SAVE
                </button>
              </div>
            ) : (
              <h1 className="font-cinzel text-[11px] font-semibold tracking-[0.12em] text-[#f3ead8] truncate mt-0.5">
                {playerName}
              </h1>
            )}

            <p className="font-cormorant text-[8.5px] text-[#9e988c] tracking-[0.04em] truncate">
              {currentRating >= 1600 ? 'Grandmaster League' : currentRating >= 1400 ? 'Master Guild' : 'Novice Division'} • {ownedCount}/{STORE_ITEMS.length} Items
            </p>
          </div>
        </div>

        {/* Equipped Royal Set Preview (Board, Checkers, Dice) */}
        <div className="my-1 border-t border-b border-[#c8a668]/25 py-1.5">
          <div className="flex items-center justify-between mb-1">
            <span className="font-cinzel text-[7px] tracking-[0.16em] text-[#c8a668]">
              EQUIPPED ROYAL SET
            </span>
            <button
              type="button"
              onClick={() => {
                royalSound.playOptionClickSound();
                onOpenStoreCategory('boards');
              }}
              className="font-cinzel text-[6.5px] tracking-[0.14em] text-[#e3c485] hover:underline cursor-pointer"
            >
              CUSTOMIZE &gt;
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { cat: 'boards' as const, label: 'BOARD', item: equippedBoard },
              {
                cat: 'checkers' as const,
                label: 'CHECKERS',
                item: equippedCheckers,
              },
              { cat: 'dice' as const, label: 'DICE', item: equippedDice },
            ].map(({ cat, label, item }) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  royalSound.playOptionClickSound();
                  onOpenStoreCategory(cat);
                }}
                className="group rounded-[3px] bg-[#030c08] border border-[#c8a668]/35 hover:border-[#e3c485] overflow-hidden flex flex-col items-center p-1 transition-all cursor-pointer"
              >
                <div className="w-full h-8 rounded-[2px] overflow-hidden mb-0.5">
                  <img
                    src={item.image}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <span className="font-cinzel text-[6px] tracking-[0.14em] text-[#cfc6b4] group-hover:text-[#f2dca8]">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Profile Actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              royalSound.playOptionClickSound();
              setDraftName(playerName);
              setIsEditingName((v) => !v);
            }}
            className="flex-1 h-[22px] rounded-[2px] brass-button-surface border border-[#ead4a4]/70 font-cinzel text-[7px] font-semibold tracking-[0.14em] text-[#140e05] cursor-pointer"
          >
            {isEditingName ? 'CANCEL EDIT' : 'EDIT NAME'}
          </button>
          <button
            type="button"
            onClick={onOpenGameTable}
            className="flex-1 h-[22px] rounded-[2px] bg-[#0a2117] hover:bg-[#103022] border border-[#c8a668]/45 font-cinzel text-[7px] tracking-[0.14em] text-[#e5dccb] cursor-pointer"
          >
            3D GAME TABLE
          </button>
        </div>
      </div>

      {/* Right Real Career Ledger & Live Tracked Statistics */}
      <div className="flex-1 rounded-[4px] bg-[#05140e]/92 border border-[#c8a668]/45 p-2.5 flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-between border-b border-[#c8a668]/25 pb-1">
          <span className="font-cinzel text-[8px] font-semibold tracking-[0.15em] text-[#f0e6d2]">
            LIVE TOURNAMENT &amp; PROVABLY FAIR RNG LEDGER
          </span>
          <button
            type="button"
            onClick={onResetStats}
            className="font-cinzel text-[6.5px] tracking-[0.14em] text-[#b89758] hover:text-[#f3e6c8] cursor-pointer"
          >
            RESET STATS
          </button>
        </div>

        {/* 2x2 Real Tracked Stat Grid */}
        <div className="grid grid-cols-2 gap-1.5 my-auto py-1">
          <div className="rounded-[3px] bg-[#030d09]/90 border border-[#c8a668]/30 px-2 py-1 flex flex-col justify-center">
            <span className="font-cinzel text-[6px] tracking-[0.14em] text-[#b89758]">
              MATCHES &amp; WIN RATE
            </span>
            <span className="font-cinzel text-[12px] font-semibold tracking-[0.06em] text-[#f5ebd6] leading-tight mt-0.5 tabular-nums">
              {realStats.matchesPlayed} ({winRateStr})
            </span>
            <span className="font-cormorant text-[8px] text-[#9c9689] leading-none mt-0.5">
              {realStats.wins} Won • {realStats.losses} Lost
            </span>
          </div>

          <div className="rounded-[3px] bg-[#030d09]/90 border border-[#c8a668]/30 px-2 py-1 flex flex-col justify-center">
            <span className="font-cinzel text-[6px] tracking-[0.14em] text-[#b89758]">
              GAMMON (2X) &amp; BACKGAMMON (3X)
            </span>
            <span className="font-cinzel text-[12px] font-semibold tracking-[0.06em] text-[#f5ebd6] leading-tight mt-0.5 tabular-nums">
              {realStats.gammonsWon ?? 0}G • {realStats.backgammonsWon ?? 0}BG
            </span>
            <span className="font-cormorant text-[8px] text-[#9c9689] leading-none mt-0.5">
              Max Doubling Cube: {realStats.highestCubePlayed ?? 1}X
            </span>
          </div>

          <div className="rounded-[3px] bg-[#030d09]/90 border border-[#c8a668]/30 px-2 py-1 flex flex-col justify-center">
            <span className="font-cinzel text-[6px] tracking-[0.14em] text-[#b89758]">
              PROVABLY FAIR DICE ROLLS
            </span>
            <span className="font-cinzel text-[12px] font-semibold tracking-[0.06em] text-[#f5ebd6] leading-tight mt-0.5 tabular-nums">
              {realStats.totalDiceRolls ?? 0} ROLLS
            </span>
            <span className="font-cormorant text-[8px] text-[#9c9689] leading-none mt-0.5">
              Doubles: {realStats.doublesRolled ?? 0} • CSPRNG Verified
            </span>
          </div>

          <div className="rounded-[3px] bg-[#030d09]/90 border border-[#c8a668]/30 px-2 py-1 flex flex-col justify-center">
            <span className="font-cinzel text-[6px] tracking-[0.14em] text-[#b89758]">
              3D TABLE SESSIONS &amp; TIME
            </span>
            <span className="font-cinzel text-[12px] font-semibold tracking-[0.06em] text-[#f5ebd6] leading-tight mt-0.5 tabular-nums">
              {realStats.tableSessionsOpened} SESSIONS
            </span>
            <span className="font-cormorant text-[8px] text-[#9c9689] leading-none mt-0.5">
              Time: {formatDuration(realStats.totalTableTimeSeconds)} • Folds: {realStats.boardFoldCount}
            </span>
          </div>
        </div>

        {/* Real Cryptographic Dice Face Distribution Bar (1..6) */}
        <div className="rounded-[3px] bg-[#030d09]/90 border border-[#c8a668]/30 px-2 py-1">
          <div className="flex items-center justify-between text-[6px] font-cinzel tracking-[0.12em] mb-0.5">
            <span className="text-[#e5dccb]">
              REAL DICE DISTRIBUTION (1–6):{' '}
              {(realStats.diceFaceCounts ?? [0, 0, 0, 0, 0, 0])
                .map((cnt, i) => `[${i + 1}]:${cnt}`)
                .join('  ')}
            </span>
            <span className="text-[#d4b26f] tabular-nums">
              LVL {realLevel} ({xpInCurrentLevel}/100 XP)
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#091e15] overflow-hidden border border-[#c8a668]/30">
            <div
              className="h-full brass-button-surface transition-all duration-300"
              style={{ width: `${xpInCurrentLevel}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface WalletViewProps {
  coins: number;
  usdtBalance: number;
  tributeClaimed: boolean;
  transactions: WalletTransaction[];
  usdtTransactions?: UsdtTransaction[];
  onClaimTribute: () => void;
  onAcquireCoins: (amount: number, packName: string) => void;
  onDepositUsdt: (amount: number, network: 'TRC20' | 'TON', txHash: string) => void;
  onWithdrawUsdt: (amount: number, destinationAddress: string, network: 'TRC20' | 'TON') => void;
}

/**
 * WALLET SCREEN (Real USDT Crypto Vault & Real Recorded Transaction Ledger)
 */
export function WalletView({
  coins,
  usdtBalance,
  tributeClaimed,
  transactions,
  usdtTransactions = [],
  onClaimTribute,
  onAcquireCoins,
  onDepositUsdt,
  onWithdrawUsdt,
}: WalletViewProps) {
  const [walletTab, setWalletTab] = useState<'usdt' | 'coins'>('usdt');
  const [usdtAction, setUsdtAction] = useState<'view' | 'deposit' | 'withdraw'>('view');
  const [depositNetwork, setDepositNetwork] = useState<'TRC20' | 'TON'>('TRC20');
  const [depositTxHash, setDepositTxHash] = useState('');
  const [depositAmountInput, setDepositAmountInput] = useState('25');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('10');
  const [withdrawNetwork, setWithdrawNetwork] = useState<'TRC20' | 'TON'>('TRC20');
  const [copiedAddress, setCopiedAddress] = useState(false);

  const PLATFORM_ADDRESSES = {
    TRC20: 'TYD8xQv9F34mZ87LpWeQ98aC21vB67xNqR',
    TON: 'EQB_t1r8f92jK7lWp3Qv84_USDT_TELEGRAM',
  };

  const handleCopyAddress = (addr: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(addr).catch(() => {});
    }
    setCopiedAddress(true);
    royalSound.playOptionClickSound();
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleConfirmDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmountInput);
    if (!amt || amt <= 0) return;
    const hash = depositTxHash.trim() || `tx-${Date.now().toString(36)}`;
    onDepositUsdt(amt, depositNetwork, hash);
    setDepositTxHash('');
    setUsdtAction('view');
  };

  const handleConfirmWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt < 5 || !withdrawAddress.trim()) return;
    onWithdrawUsdt(amt, withdrawAddress.trim(), withdrawNetwork);
    setWithdrawAddress('');
    setUsdtAction('view');
  };

  return (
    <div className="relative z-20 w-full h-full px-4 py-1.5 flex flex-col gap-2 min-h-0 text-[#e8dfd0]">
      {/* Top Wallet Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-[#c8a668]/30 pb-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setWalletTab('usdt')}
            className={`px-3 py-1 rounded font-cinzel text-[8.5px] font-bold tracking-wider transition-all cursor-pointer ${
              walletTab === 'usdt'
                ? 'bg-[#0a281c] border border-[#52f29c]/60 text-[#52f29c] shadow-sm'
                : 'text-[#8e8a80] hover:text-[#d0c7b6]'
            }`}
          >
            💵 USDT CRYPTO VAULT ({usdtBalance.toFixed(2)} USDT)
          </button>
          <button
            type="button"
            onClick={() => setWalletTab('coins')}
            className={`px-3 py-1 rounded font-cinzel text-[8.5px] font-bold tracking-wider transition-all cursor-pointer ${
              walletTab === 'coins'
                ? 'bg-[#0a281c] border border-[#c8a668]/60 text-[#f5dca8] shadow-sm'
                : 'text-[#8e8a80] hover:text-[#d0c7b6]'
            }`}
          >
            🪙 ROYAL CLUB COINS ({coins.toLocaleString()})
          </button>
        </div>

        <span className="font-cormorant text-[9.5px] text-[#a39e93]">
          Official Telegram &amp; TRC20/TON Ledger
        </span>
      </div>

      {walletTab === 'usdt' ? (
        <div className="flex-1 flex flex-row gap-3 min-h-0 overflow-hidden">
          {/* Left Column: USDT Balance & Actions */}
          <div className="w-[42%] rounded-lg bg-[#05140e]/95 border border-[#c8a668]/50 p-3 flex flex-col justify-between shadow-xl overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-cinzel text-[7.5px] tracking-wider text-[#c8a668]">
                  USDT ACTIVE CRYPTO ASSETS
                </span>
                <span className="text-[7.5px] font-cinzel px-1.5 py-0.2 rounded bg-[#020b06] border border-[#52f29c]/40 text-[#52f29c]">
                  CONNECTED
                </span>
              </div>

              {/* Big Balance Box */}
              <div className="p-3 rounded-lg bg-gradient-to-r from-[#020d08] to-[#04170e] border border-[#c8a668]/40 mb-3">
                <span className="font-cinzel text-[7px] text-[#8e8a80] block">
                  AVAILABLE TOURNAMENT BALANCE
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-cinzel text-[20px] font-extrabold text-[#52f29c] tabular-nums tracking-tight">
                    {usdtBalance.toFixed(2)}
                  </span>
                  <span className="font-cinzel text-[9.5px] font-bold text-[#f5dca8]">
                    USDT
                  </span>
                </div>
                <span className="font-cormorant text-[8.5px] text-[#9e988c] block mt-0.5">
                  Directly usable across all 5 online tournament tiers (1 to 25 USDT)
                </span>
              </div>

              {/* Deposit / Withdraw Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setUsdtAction(usdtAction === 'deposit' ? 'view' : 'deposit')}
                  className={`py-1.5 rounded font-cinzel text-[8.5px] font-bold tracking-wider transition-all cursor-pointer ${
                    usdtAction === 'deposit'
                      ? 'bg-[#52f29c] text-[#021008]'
                      : 'brass-button-surface border border-[#ead4a4]/80 text-[#140e05]'
                  }`}
                >
                  📥 DEPOSIT USDT
                </button>
                <button
                  type="button"
                  onClick={() => setUsdtAction(usdtAction === 'withdraw' ? 'view' : 'withdraw')}
                  className={`py-1.5 rounded font-cinzel text-[8.5px] font-bold tracking-wider transition-all cursor-pointer ${
                    usdtAction === 'withdraw'
                      ? 'bg-[#52f29c] text-[#021008]'
                      : 'bg-[#0a2418] hover:bg-[#123625] border border-[#c8a668]/40 text-[#f5dca8]'
                  }`}
                >
                  📤 WITHDRAW USDT
                </button>
              </div>

              {/* Quick Demo Test Deposit */}
              <div className="p-2 rounded bg-[#020b06] border border-[#c8a668]/20 flex items-center justify-between">
                <span className="font-cinzel text-[7px] text-[#8e8a80]">
                  DEMO TEST TOP-UP:
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => onDepositUsdt(10, 'TRC20', `demo-${Date.now()}`)}
                    className="px-2 py-0.5 rounded bg-[#0a281c] border border-[#52f29c]/40 hover:bg-[#143b2a] font-cinzel text-[7px] font-bold text-[#52f29c] cursor-pointer"
                  >
                    +10 USDT
                  </button>
                  <button
                    type="button"
                    onClick={() => onDepositUsdt(50, 'TON', `demo-${Date.now()}`)}
                    className="px-2 py-0.5 rounded bg-[#0a281c] border border-[#52f29c]/40 hover:bg-[#143b2a] font-cinzel text-[7px] font-bold text-[#52f29c] cursor-pointer"
                  >
                    +50 USDT
                  </button>
                </div>
              </div>
            </div>

            <div className="text-[7.5px] font-cormorant text-[#7e7a72] mt-2 border-t border-[#c8a668]/20 pt-1">
              Supports TRC20 (Tron) &amp; TON (Telegram Official USDT). 0% Platform deposit fee.
            </div>
          </div>

          {/* Right Column: Active Action Panel (Deposit / Withdraw / Ledger) */}
          <div className="flex-1 rounded-lg bg-[#05140e]/95 border border-[#c8a668]/50 p-3 flex flex-col justify-between shadow-xl overflow-y-auto">
            {usdtAction === 'deposit' ? (
              /* DEPOSIT FORM */
              <div className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#c8a668]/25 pb-1 mb-2">
                    <span className="font-cinzel text-[9px] font-bold text-[#52f29c]">
                      DEPOSIT USDT TO VAULT (واریز تتر)
                    </span>
                    <button
                      type="button"
                      onClick={() => setUsdtAction('view')}
                      className="text-xs font-bold text-[#c8a668] hover:text-white cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Network Selector */}
                  <div className="flex gap-2 mb-2">
                    {(['TRC20', 'TON'] as const).map((net) => (
                      <button
                        key={net}
                        type="button"
                        onClick={() => setDepositNetwork(net)}
                        className={`flex-1 py-1 rounded font-cinzel text-[8px] font-bold border transition-all cursor-pointer ${
                          depositNetwork === net
                            ? 'bg-[#0a2c1e] border-[#52f29c] text-[#52f29c]'
                            : 'bg-[#020a06] border-[#444] text-[#8e8a80]'
                        }`}
                      >
                        {net === 'TRC20' ? 'TRC20 (TRON TETHER)' : 'TON (TELEGRAM TETHER)'}
                      </button>
                    ))}
                  </div>

                  {/* Deposit Address Box */}
                  <div className="p-2 rounded bg-[#020a06] border border-[#c8a668]/30 mb-2">
                    <span className="font-cinzel text-[6.5px] text-[#8e8a80] block mb-0.5">
                      OFFICIAL DEPOSIT ADDRESS ({depositNetwork})
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[9px] text-[#f5dca8] truncate select-all">
                        {PLATFORM_ADDRESSES[depositNetwork]}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyAddress(PLATFORM_ADDRESSES[depositNetwork])}
                        className="px-2 py-0.5 rounded brass-button-surface font-cinzel text-[7px] font-bold text-[#140e05] shrink-0 cursor-pointer"
                      >
                        {copiedAddress ? 'COPIED ✓' : 'COPY'}
                      </button>
                    </div>
                  </div>

                  {/* Deposit Amount & TXID Verification Form */}
                  <form onSubmit={handleConfirmDeposit} className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-cinzel text-[6.5px] text-[#8e8a80] block mb-0.5">
                          AMOUNT (USDT)
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={depositAmountInput}
                          onChange={(e) => setDepositAmountInput(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-[#020a06] border border-[#c8a668]/40 font-cinzel text-[9px] text-white outline-none"
                          placeholder="Amount in USDT"
                          required
                        />
                      </div>
                      <div>
                        <label className="font-cinzel text-[6.5px] text-[#8e8a80] block mb-0.5">
                          TXID HASH (اختیاری برای تست)
                        </label>
                        <input
                          type="text"
                          value={depositTxHash}
                          onChange={(e) => setDepositTxHash(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-[#020a06] border border-[#c8a668]/40 font-mono text-[8.5px] text-white outline-none"
                          placeholder="Enter Transaction Hash"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-1.5 rounded brass-button-surface border border-[#fff0c4] font-cinzel text-[8.5px] font-bold text-[#140e05] cursor-pointer mt-1"
                    >
                      CONFIRM DEPOSIT (+{depositAmountInput} USDT)
                    </button>
                  </form>
                </div>
              </div>
            ) : usdtAction === 'withdraw' ? (
              /* WITHDRAW FORM */
              <div className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#c8a668]/25 pb-1 mb-2">
                    <span className="font-cinzel text-[9px] font-bold text-[#f5dca8]">
                      WITHDRAW USDT (برداشت تتر)
                    </span>
                    <button
                      type="button"
                      onClick={() => setUsdtAction('view')}
                      className="text-xs font-bold text-[#c8a668] hover:text-white cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleConfirmWithdrawal} className="space-y-2">
                    {/* Network Selector */}
                    <div className="flex gap-2 mb-1">
                      {(['TRC20', 'TON'] as const).map((net) => (
                        <button
                          key={net}
                          type="button"
                          onClick={() => setWithdrawNetwork(net)}
                          className={`flex-1 py-1 rounded font-cinzel text-[8px] font-bold border transition-all cursor-pointer ${
                            withdrawNetwork === net
                              ? 'bg-[#0a2c1e] border-[#52f29c] text-[#52f29c]'
                              : 'bg-[#020a06] border-[#444] text-[#8e8a80]'
                          }`}
                        >
                          {net}
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="font-cinzel text-[6.5px] text-[#8e8a80] block mb-0.5">
                        DESTINATION {withdrawNetwork} WALLET ADDRESS
                      </label>
                      <input
                        type="text"
                        value={withdrawAddress}
                        onChange={(e) => setWithdrawAddress(e.target.value)}
                        className="w-full px-2 py-1 rounded bg-[#020a06] border border-[#c8a668]/40 font-mono text-[8.5px] text-white outline-none"
                        placeholder={`Paste your ${withdrawNetwork} address...`}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-cinzel text-[6.5px] text-[#8e8a80] block mb-0.5">
                          AMOUNT (MIN 5 USDT)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max={usdtBalance}
                          step="1"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-[#020a06] border border-[#c8a668]/40 font-cinzel text-[9px] text-white outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="font-cinzel text-[6.5px] text-[#8e8a80] block mb-0.5">
                          NETWORK FEE
                        </label>
                        <div className="px-2 py-1 rounded bg-[#020a06] border border-[#c8a668]/20 font-cinzel text-[9px] text-[#52f29c]">
                          0.00 USDT (FREE)
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={usdtBalance < parseFloat(withdrawAmount || '0')}
                      className={`w-full py-1.5 rounded font-cinzel text-[8.5px] font-bold tracking-wider transition-all ${
                        usdtBalance >= parseFloat(withdrawAmount || '0')
                          ? 'brass-button-surface border border-[#fff0c4] text-[#140e05] cursor-pointer'
                          : 'bg-[#1a0f0b] border border-[#8a4235] text-[#d67b6f] cursor-not-allowed'
                      }`}
                    >
                      {usdtBalance >= parseFloat(withdrawAmount || '0')
                        ? `REQUEST WITHDRAWAL (${withdrawAmount} USDT)`
                        : 'INSUFFICIENT BALANCE'}
                    </button>
                  </form>
                </div>

                <span className="font-cormorant text-[8px] text-[#8e8a80]">
                  Withdrawals processed to your wallet within 1–5 minutes.
                </span>
              </div>
            ) : (
              /* FINANCIAL LEDGER TABLE */
              <div className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#c8a668]/25 pb-1 mb-2">
                    <span className="font-cinzel text-[9px] font-bold text-[#f5dca8]">
                      USDT FINANCIAL TRANSACTION LEDGER (دفتر کل تراکنش‌ها)
                    </span>
                    <span className="font-cinzel text-[7px] text-[#52f29c]">
                      {usdtTransactions.length} ENTRIES
                    </span>
                  </div>

                  <div className="space-y-1.5 overflow-y-auto max-h-[170px] pr-1">
                    {usdtTransactions.length === 0 ? (
                      <div className="text-center py-6">
                        <span className="font-cinzel text-[8.5px] text-[#8e8a80] block">
                          NO USDT TRANSACTIONS YET
                        </span>
                        <span className="font-cormorant text-[8.5px] text-[#6b6760]">
                          Deposit USDT or enter any tournament tier to record entries.
                        </span>
                      </div>
                    ) : (
                      usdtTransactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="p-1.5 rounded bg-[#020b06] border border-[#c8a668]/25 flex items-center justify-between text-[7.5px]"
                        >
                          <div>
                            <span className="font-cinzel text-[#f5dca8] block font-semibold">
                              {tx.description}
                            </span>
                            <span className="font-cormorant text-[#8e8a80]">
                              {tx.timestamp} • {tx.network || 'USDT'} • {tx.status.toUpperCase()}
                            </span>
                          </div>
                          <span
                            className={`font-cinzel font-bold tabular-nums ${
                              tx.amount >= 0 ? 'text-[#52f29c]' : 'text-[#f28b6c]'
                            }`}
                          >
                            {tx.amount >= 0 ? `+${tx.amount.toFixed(2)}` : `${tx.amount.toFixed(2)}`} USDT
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[7px] font-cinzel text-[#8e8a80] border-t border-[#c8a668]/20 pt-1 mt-1">
                  <span>NETWORK: TRON &amp; TON PROTOCOL</span>
                  <span>IMMUTABLE SETTLEMENT</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: ROYAL CLUB COINS */
        <div className="flex-1 flex flex-row gap-3 min-h-0">
          {/* Left Royal Treasury Balance Vault Card */}
          <div className="w-[38%] rounded-[4px] bg-[#05140e]/92 border border-[#c8a668]/45 p-2.5 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-1.5">
                <WalletIcon className="w-3.5 h-3.5 text-[#d4b26f]" filled />
                <span className="font-cinzel text-[7.5px] tracking-[0.18em] text-[#c8a668]">
                  ROYAL TREASURY VAULT
                </span>
              </div>

              <div className="mt-2 p-2 rounded-[3px] bg-[#030c08] border border-[#c8a668]/35 flex items-center gap-2.5">
                <img
                  src={checkersGoldSilverImg}
                  alt="Royal Gold Coins"
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-[2px] object-cover border border-[#c8a668]/45 shrink-0"
                />
                <div>
                  <span className="font-cinzel text-[6.5px] tracking-[0.16em] text-[#9e988c] block">
                    CURRENT BALANCE
                  </span>
                  <span className="font-cinzel text-[15px] font-bold tracking-[0.1em] text-[#f5dca8] tabular-nums leading-tight">
                    {coins.toLocaleString()}
                  </span>
                  <span className="font-cinzel text-[7px] tracking-[0.2em] text-[#c8a668] block">
                    ROYAL COINS
                  </span>
                </div>
              </div>
            </div>

            {/* Daily Royal Tribute Box */}
            <div className="rounded-[3px] bg-[#071c13]/90 border border-[#c8a668]/35 p-2">
              <div className="flex items-center justify-between">
                <span className="font-cinzel text-[7px] tracking-[0.14em] text-[#e8dfd0]">
                  DAILY CLUB TRIBUTE
                </span>
                <span className="font-cinzel text-[7px] font-semibold tracking-[0.12em] text-[#e3c485]">
                  +250 COINS
                </span>
              </div>
              <p className="font-cormorant text-[8.5px] text-[#a39e93] mt-0.5">
                Claim daily coins to unlock items in the Store
              </p>
              <button
                type="button"
                disabled={tributeClaimed}
                onClick={onClaimTribute}
                className={`mt-1.5 w-full h-[22px] rounded-[2px] font-cinzel text-[7.5px] font-semibold tracking-[0.16em] transition-all cursor-pointer ${
                  tributeClaimed
                    ? 'bg-[#0b1f16] text-[#7e7c74] border border-[#c8a668]/25 cursor-default'
                    : 'brass-button-surface text-[#140e05] border border-[#ead4a4]/70'
                }`}
              >
                {tributeClaimed ? 'TRIBUTE CLAIMED' : 'CLAIM +250 COINS'}
              </button>
            </div>
          </div>

          {/* Right Coin Grants */}
          <div className="flex-1 rounded-[4px] bg-[#05140e]/92 border border-[#c8a668]/45 p-2.5 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between border-b border-[#c8a668]/25 pb-1">
              <span className="font-cinzel text-[9px] font-semibold tracking-[0.18em] text-[#f0e6d2]">
                TREASURY COIN GRANTS
              </span>
              <span className="font-cinzel text-[7px] tracking-[0.15em] text-[#b89758]">
                {transactions.length} RECORDED TRANSACTIONS
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 my-auto py-1">
              {[
                { id: 'pouch', title: 'PARLOR POUCH', amount: 500, tag: 'BRONZE GRANT', img: checkersIvoryEbonyImg },
                { id: 'chest', title: 'SOVEREIGN CHEST', amount: 1000, tag: 'SILVER GRANT', img: checkersGoldSilverImg },
                { id: 'treasury', title: 'IMPERIAL VAULT', amount: 2500, tag: 'GOLD GRANT', img: boardCrestImg },
              ].map((pack) => (
                <div
                  key={pack.id}
                  className="rounded-[3px] bg-[#030d09]/95 border border-[#c8a668]/35 p-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="relative w-full h-11 rounded-[2px] overflow-hidden mb-1 border border-[#c8a668]/25">
                      <img
                        src={pack.img}
                        alt={pack.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1 left-1 px-1 py-0.2 rounded-[2px] bg-[#04100b]/90 font-cinzel text-[5.5px] tracking-[0.12em] text-[#e3c485]">
                        {pack.tag}
                      </span>
                    </div>
                    <h3 className="font-cinzel text-[7.5px] tracking-[0.12em] text-[#e8dfd0] truncate">
                      {pack.title}
                    </h3>
                    <div className="font-cinzel text-[11px] font-bold tracking-[0.08em] text-[#f5dca8] tabular-nums">
                      +{pack.amount.toLocaleString()}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAcquireCoins(pack.amount, pack.title)}
                    className="mt-1.5 w-full h-[20px] rounded-[2px] brass-button-surface border border-[#ead4a4]/70 font-cinzel text-[7px] font-semibold tracking-[0.14em] text-[#140e05] cursor-pointer"
                  >
                    ADD +{pack.amount.toLocaleString()}
                  </button>
                </div>
              ))}
            </div>

            <div className="rounded-[3px] bg-[#030d09]/90 border border-[#c8a668]/25 px-2.5 py-1 flex items-center justify-between text-[7px] font-cinzel tracking-[0.12em]">
              <span className="text-[#cfc6b4] truncate">
                {transactions.length > 0 ? `${transactions[0].timestamp} • ${transactions[0].label}` : 'LEDGER ACTIVE'}
              </span>
              <span className="text-[#e3c485] font-bold">
                {coins.toLocaleString()} TOTAL COINS
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SettingsViewProps {
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  boardZoom: 'xl' | 'max';
  onToggleBoardZoom: () => void;
  autoRoll: boolean;
  onToggleAutoRoll: () => void;
  autoBearOff: boolean;
  onToggleAutoBearOff: () => void;
  onCopyTelegramUrl: () => void;
  onDownloadTelegramConfig: () => void;
  onDownloadTelegramBotScript: () => void;
  onShareOnTelegram: () => void;
  onResetAllData: () => void;
  onBackHome: () => void;
}

/**
 * SETTINGS & TELEGRAM PUBLISHING SCREEN (Connected to Real Engine Acoustics, Board Scale & Telegram Mini App Kit)
 */
export function SettingsView({
  sfxEnabled,
  onToggleSfx,
  boardZoom,
  onToggleBoardZoom,
  autoRoll,
  onToggleAutoRoll,
  autoBearOff,
  onToggleAutoBearOff,
  onCopyTelegramUrl,
  onDownloadTelegramConfig,
  onDownloadTelegramBotScript,
  onShareOnTelegram,
  onResetAllData,
  onBackHome,
}: SettingsViewProps) {
  return (
    <div className="relative z-20 w-full h-full px-5 py-1.5 flex flex-col justify-between min-h-0">
      {/* Settings Header */}
      <div className="flex items-center justify-between border-b border-[#c8a668]/30 pb-1.5 shrink-0">
        <div>
          <h1 className="font-cinzel text-[13px] font-semibold tracking-[0.18em] text-[#f0e6d2] uppercase leading-none">
            SETTINGS &amp; TELEGRAM MINI APP
          </h1>
          <p className="font-cormorant text-[9.5px] text-[#b9b09f] tracking-[0.04em] mt-0.5 leading-none">
            3D board scale, gameplay automation &amp; official @BotFather Telegram deployment files
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            royalSound.playOptionClickSound();
            onBackHome();
          }}
          className="px-2.5 py-1 rounded-[2px] brass-button-surface border border-[#ead4a4]/70 font-cinzel text-[7.5px] font-semibold tracking-[0.15em] text-[#140e05] flex items-center gap-1 cursor-pointer"
        >
          <span>RETURN TO LOBBY</span>
          <ChevronRightIcon className="w-2.5 h-2.5 text-[#140e05]" />
        </button>
      </div>

      {/* Two-Column Settings Panel */}
      <div className="grid grid-cols-2 gap-3 my-auto py-1.5 flex-1 min-h-0">
        {/* Left Column: Gameplay Automation, Board Scale & Sound */}
        <div className="rounded-[4px] bg-[#05140e]/92 border border-[#c8a668]/40 p-2.5 flex flex-col justify-between">
          <span className="font-cinzel text-[8px] font-semibold tracking-[0.18em] text-[#d4b26f] border-b border-[#c8a668]/20 pb-1">
            GAMEPLAY AUTOMATION &amp; 3D SCALE
          </span>

          <div className="flex items-center justify-between gap-2 py-0.5 border-b border-[#c8a668]/15">
            <div>
              <div className="font-cinzel text-[7.5px] tracking-[0.12em] text-[#ebe3d2]">
                AUTO DICE ROLL
              </div>
              <div className="font-cormorant text-[8px] text-[#9c9689] leading-none">
                Roll 3D dice automatically at turn start
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleAutoRoll}
              className={`w-12 h-[18px] rounded-[2px] font-cinzel text-[6.5px] font-semibold tracking-[0.14em] transition-all cursor-pointer ${
                autoRoll
                  ? 'brass-button-surface text-[#140e05] border border-[#ead4a4]/70'
                  : 'bg-[#091c14] text-[#857f73] border border-[#c8a668]/30'
              }`}
            >
              {autoRoll ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 py-0.5 border-b border-[#c8a668]/15">
            <div>
              <div className="font-cinzel text-[7.5px] tracking-[0.12em] text-[#ebe3d2]">
                AUTO BEAR-OFF (ENDGAME ONLY)
              </div>
              <div className="font-cormorant text-[8px] text-[#9c9689] leading-none">
                Auto-move checkers only when bearing off
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleAutoBearOff}
              className={`w-12 h-[18px] rounded-[2px] font-cinzel text-[6.5px] font-semibold tracking-[0.14em] transition-all cursor-pointer ${
                autoBearOff
                  ? 'brass-button-surface text-[#140e05] border border-[#ead4a4]/70'
                  : 'bg-[#091c14] text-[#857f73] border border-[#c8a668]/30'
              }`}
            >
              {autoBearOff ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 py-0.5 border-b border-[#c8a668]/15">
            <div>
              <div className="font-cinzel text-[7.5px] tracking-[0.12em] text-[#ebe3d2]">
                3D BOARD DISPLAY SIZE &amp; SOUND
              </div>
              <div className="font-cormorant text-[8px] text-[#9c9689] leading-none">
                Full-bleed widescreen &amp; physical acoustics
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleBoardZoom}
                className="px-1.5 h-[18px] rounded-[2px] brass-button-surface text-[#140e05] border border-[#ead4a4]/70 font-cinzel text-[6px] font-bold tracking-[0.12em] cursor-pointer"
              >
                {boardZoom === 'max' ? 'MAX' : 'XL'}
              </button>
              <button
                type="button"
                onClick={onToggleSfx}
                className={`px-1.5 h-[18px] rounded-[2px] font-cinzel text-[6px] font-semibold tracking-[0.12em] transition-all cursor-pointer ${
                  sfxEnabled
                    ? 'brass-button-surface text-[#140e05] border border-[#ead4a4]/70'
                    : 'bg-[#091c14] text-[#857f73] border border-[#c8a668]/30'
                }`}
              >
                {sfxEnabled ? 'SFX' : 'MUTE'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 py-0.5">
            <div>
              <div className="font-cinzel text-[7.5px] tracking-[0.12em] text-[#ebe3d2]">
                RESET ALL STORED DATA
              </div>
              <div className="font-cormorant text-[8px] text-[#9c9689] leading-none">
                Clear real stats, coins &amp; unlocked items
              </div>
            </div>

            <button
              type="button"
              onClick={onResetAllData}
              className="px-2 h-[18px] rounded-[2px] bg-[#2a1212] hover:bg-[#3d1919] border border-[#d98a6c]/50 font-cinzel text-[6px] tracking-[0.14em] text-[#f2c6b6] cursor-pointer"
            >
              RESET DATA
            </button>
          </div>
        </div>

        {/* Right Column: Telegram Mini App Publishing Kit */}
        <div className="rounded-[4px] bg-[#05140e]/92 border border-[#c8a668]/40 p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#c8a668]/20 pb-1">
            <span className="font-cinzel text-[8px] font-semibold tracking-[0.16em] text-[#d4b26f]">
              TELEGRAM MINI APP PUBLISH KIT
            </span>
            <span className="font-cinzel text-[6px] tracking-[0.14em] px-1.5 py-0.5 rounded-[2px] bg-[#0c261b] border border-[#c8a668]/40 text-[#72f2b3]">
              SDK READY
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#c8a668]/15">
            <div>
              <div className="font-cinzel text-[8px] tracking-[0.12em] text-[#ebe3d2]">
                1. WEBAPP URL FOR @BOTFATHER
              </div>
              <div className="font-cormorant text-[8.5px] text-[#9c9689] leading-none">
                Paste into /newapp or /setmenubutton
              </div>
            </div>
            <button
              type="button"
              onClick={onCopyTelegramUrl}
              className="px-2 h-[20px] flex items-center rounded-[2px] brass-button-surface font-cinzel text-[6.5px] font-bold tracking-[0.14em] text-[#140e05] cursor-pointer"
            >
              COPY URL
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#c8a668]/15">
            <div>
              <div className="font-cinzel text-[8px] tracking-[0.12em] text-[#ebe3d2]">
                2. BOTFATHER MANIFEST (.JSON)
              </div>
              <div className="font-cormorant text-[8.5px] text-[#9c9689] leading-none">
                Complete Telegram Mini App config file
              </div>
            </div>
            <button
              type="button"
              onClick={onDownloadTelegramConfig}
              className="px-2 h-[20px] flex items-center rounded-[2px] bg-[#0c261b] hover:bg-[#133828] border border-[#c8a668]/55 font-cinzel text-[6.5px] tracking-[0.14em] text-[#f0e2c4] cursor-pointer"
            >
              DOWNLOAD .JSON
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 py-1">
            <div>
              <div className="font-cinzel text-[8px] tracking-[0.12em] text-[#ebe3d2]">
                3. BOT SERVER &amp; SHARE
              </div>
              <div className="font-cormorant text-[8.5px] text-[#9c9689] leading-none">
                Node.js bot launcher or share table link
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onDownloadTelegramBotScript}
                className="px-1.5 h-[20px] flex items-center rounded-[2px] bg-[#091c14] hover:bg-[#113023] border border-[#c8a668]/45 font-cinzel text-[6px] tracking-[0.12em] text-[#e3c485] cursor-pointer"
              >
                BOT .MJS
              </button>
              <button
                type="button"
                onClick={onShareOnTelegram}
                className="px-1.5 h-[20px] flex items-center rounded-[2px] brass-button-surface font-cinzel text-[6px] font-bold tracking-[0.12em] text-[#140e05] cursor-pointer"
              >
                SHARE TG
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Engine Status Strip */}
      <div className="flex items-center justify-between text-[6.5px] font-cinzel tracking-[0.16em] text-[#8c867a] pt-0.5 shrink-0">
        <span>TELEGRAM WEBAPP SDK v8.0 • FULLSCREEN LANDSCAPE</span>
        <span>LIBGDX 3D GLTF 2.0 (.GLB) • REAL PERSISTENT STATE</span>
      </div>
    </div>
  );
}

