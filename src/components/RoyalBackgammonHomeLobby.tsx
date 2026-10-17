import React, { useState } from 'react';
import palaceNightStageBg from '../assets/images/royal_palace_night_stage_1792268375096.jpg';
import cardPlayGoldImg from '../assets/images/card_play_lion_gold_1792268393216.jpg';
import cardTournamentsSilverImg from '../assets/images/card_tournaments_silver_1792268408315.jpg';
import cardFriendsEmeraldImg from '../assets/images/card_friends_emerald_1792268423438.jpg';
import goldenPiggyBankImg from '../assets/images/golden_piggy_bank_1792268437912.jpg';
import royalClosedBoardImg from '../assets/images/royal_closed_board_gold_lion.jpg';
import { royalSound } from '../libgdx/Gdx3DEngine';
import { triggerTelegramHaptic } from '../telegram/telegramMiniApp';

export interface RoyalBackgammonHomeLobbyProps {
  onlineCount: number;
  userCoins: number;
  userUsdt: number;
  playerLevel: number;
  playerRating: number;
  playerName: string;
  onPlayOneOnOne: () => void;
  onOpenTournaments: () => void;
  onOpenPractice: () => void;
  onOpenFriends: () => void;
  onOpenProvablyFair: () => void;
  onOpenLeaderboard: () => void;
  onOpenVariants: () => void;
  onOpenProfile: () => void;
  onOpenWallet: () => void;
  onOpenStore: () => void;
  onOpenSettings: () => void;
  onOpenSupport: () => void;
  onClaimDailyReward: () => void;
}

export function RoyalBackgammonHomeLobby({
  onlineCount,
  userCoins,
  userUsdt,
  playerLevel,
  playerRating,
  playerName,
  onPlayOneOnOne,
  onOpenTournaments,
  onOpenPractice,
  onOpenFriends,
  onOpenProvablyFair,
  onOpenLeaderboard,
  onOpenVariants,
  onOpenProfile,
  onOpenWallet,
  onOpenStore,
  onOpenSettings,
  onOpenSupport,
  onClaimDailyReward,
}: RoyalBackgammonHomeLobbyProps) {
  // Selected card index (0: Practice, 1: Tournaments, 2: Play [Center], 3: Friends, 4: Special)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(2);
  const [piggyBankBroken, setPiggyBankBroken] = useState(false);

  const cards = [
    {
      id: 'practice',
      title: 'Practice',
      sub: 'Solo',
      icon: '🎓',
      image: cardTournamentsSilverImg,
      badge: 'OFFLINE AI',
      glow: 'rgba(59, 130, 246, 0.5)',
      onClick: onOpenPractice,
    },
    {
      id: 'tournaments',
      title: 'Tournaments',
      sub: 'Events',
      icon: '🏆',
      image: cardTournamentsSilverImg,
      badge: '5 & 10 USDT',
      glow: 'rgba(234, 179, 8, 0.5)',
      onClick: onOpenTournaments,
    },
    {
      id: 'play',
      title: 'Play',
      sub: '1 on 1',
      icon: '👥',
      image: cardPlayGoldImg,
      badge: 'LIVE MULTIPLAYER',
      glow: 'rgba(56, 189, 248, 0.75)',
      onClick: onPlayOneOnOne,
    },
    {
      id: 'friends',
      title: 'Friends',
      sub: 'Private',
      icon: '👥',
      image: cardFriendsEmeraldImg,
      badge: 'TELEGRAM LOBBY',
      glow: 'rgba(34, 197, 94, 0.5)',
      onClick: onOpenFriends,
    },
    {
      id: 'special',
      title: 'Special',
      sub: 'Unique',
      icon: '⭐️',
      image: royalClosedBoardImg,
      badge: 'VARIANTS & FAIR',
      glow: 'rgba(168, 85, 247, 0.5)',
      onClick: onOpenVariants,
    },
  ];

  const handleSelectCard = (index: number) => {
    royalSound.playOptionClickSound();
    triggerTelegramHaptic('light');
    if (selectedCardIndex === index) {
      // Direct click on currently focused card triggers action
      cards[index].onClick();
    } else {
      setSelectedCardIndex(index);
    }
  };

  const handleBreakPiggyBank = () => {
    if (piggyBankBroken) return;
    royalSound.playVictoryFanfareSound();
    triggerTelegramHaptic('heavy');
    setPiggyBankBroken(true);
    onClaimDailyReward();
  };

  const displayName = playerName || 'Masoud';

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden select-none bg-black text-white font-sans">
      {/* 1. CINEMATIC BACKGROUND: ILLUMINATED PALACE AT NIGHT & REFLECTIVE PLATFORM */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src={palaceNightStageBg}
          alt="Royal Backgammon Night Palace Stage"
          className="w-full h-full object-cover object-center scale-[1.02]"
        />
        {/* Soft vignette & floor blue reflection overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />
      </div>

      {/* 2. TOP BAR (EXACT REPLICA OF THE SCREENSHOT) */}
      <header className="relative z-30 w-full h-[54px] sm:h-[60px] px-2 sm:px-4 pt-1 sm:pt-2 flex items-center justify-between">
        {/* Left Side: Avatar Profile & Energy */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Circular Crown Avatar + Level Shield + XP Bar */}
          <div
            onClick={onOpenProfile}
            className="flex items-center gap-2 cursor-pointer group transition-transform active:scale-95"
          >
            {/* Crown Avatar Circle */}
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-[#f5dca8] bg-gradient-to-b from-[#2a1b0a] to-[#120b04] p-0.5 shadow-[0_0_15px_rgba(245,220,168,0.5)] flex items-center justify-center">
              <span className="text-xl">👑</span>
            </div>

            {/* Name + Level Shield + XP */}
            <div className="flex flex-col text-left">
              <span className="font-cinzel text-xs sm:text-sm font-black tracking-wider text-[#ffffff] drop-shadow-md">
                {displayName}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                {/* Level Shield */}
                <div className="px-1 py-0.2 rounded bg-gradient-to-b from-[#451a03] to-[#1e0a02] border border-[#f59e0b] text-[9px] font-bold text-[#fde047] leading-none flex items-center justify-center shadow">
                  <span>{playerLevel || 18}</span>
                </div>
                {/* XP Progress Bar */}
                <div className="relative w-20 sm:w-24 h-3.5 rounded-full bg-black/70 border border-[#d97706]/70 overflow-hidden flex items-center justify-center">
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#d97706] to-[#fde047]"
                    style={{ width: '70%' }}
                  />
                  <span className="relative z-10 text-[8px] font-bold text-[#ffffff] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    165/170
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Energy / Lightning Bolt Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-[#f59e0b]/50 shadow-md">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#d97706] to-[#fbbf24] flex items-center justify-center text-[10px] text-black font-black">
              ⚡️
            </div>
            <span className="font-cinzel text-[10px] font-black text-[#fef08a] tabular-nums">
              415/440
            </span>
            <span className="w-4 h-4 rounded-full bg-purple-700 border border-purple-400 text-[8px] font-bold text-white flex items-center justify-center">
              22
            </span>
          </div>
        </div>

        {/* Center: Top Action Buttons (Rewards, Leaderboards, Shop) */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Rewards (Gift) */}
          <button
            type="button"
            onClick={() => {
              royalSound.playVictoryFanfareSound();
              onClaimDailyReward();
            }}
            className="flex flex-col items-center justify-center group cursor-pointer transition-transform active:scale-95"
          >
            <div className="relative">
              <span className="text-xl sm:text-2xl filter drop-shadow">🎁</span>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-600 border border-white text-[7px] font-bold text-white flex items-center justify-center animate-pulse">
                !
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium text-[#ffd700] drop-shadow">
              Rewards
            </span>
          </button>

          {/* Leaderboards */}
          <button
            type="button"
            onClick={() => {
              royalSound.playOptionClickSound();
              onOpenLeaderboard();
            }}
            className="flex flex-col items-center justify-center group cursor-pointer transition-transform active:scale-95"
          >
            <span className="text-xl sm:text-2xl filter drop-shadow">🏆</span>
            <span className="text-[9px] sm:text-[10px] font-medium text-[#e2e8f0] group-hover:text-[#ffd700]">
              Leaderboards
            </span>
          </button>

          {/* Shop */}
          <button
            type="button"
            onClick={() => {
              royalSound.playOptionClickSound();
              onOpenStore();
            }}
            className="flex flex-col items-center justify-center group cursor-pointer transition-transform active:scale-95"
          >
            <span className="text-xl sm:text-2xl filter drop-shadow">🏪</span>
            <span className="text-[9px] sm:text-[10px] font-medium text-[#e2e8f0] group-hover:text-[#ffd700]">
              Shop
            </span>
          </button>
        </div>

        {/* Right Side: Currency Badges (Coins & Gems/USDT with green +) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Gold Chest Coins Badge */}
          <div
            onClick={onOpenWallet}
            className="flex items-center gap-1.5 px-2 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-black/80 to-[#1e1405]/90 border border-[#f59e0b]/60 shadow-md cursor-pointer hover:border-[#fde047] transition-all"
          >
            <span className="text-base sm:text-lg">💰</span>
            <span className="font-cinzel text-xs sm:text-sm font-black text-[#fef08a] tabular-nums">
              {userCoins > 0 ? userCoins.toLocaleString() : '26'}
            </span>
            <button
              type="button"
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#22c55e] hover:bg-[#16a34a] border border-[#86efac] text-black font-black text-[10px] sm:text-xs flex items-center justify-center shadow transition-all"
            >
              +
            </button>
          </div>

          {/* Blue Diamond Gems / USDT Badge */}
          <div
            onClick={onOpenWallet}
            className="flex items-center gap-1.5 px-2 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-black/80 to-[#061e29]/90 border border-[#38bdf8]/60 shadow-md cursor-pointer hover:border-[#7dd3fc] transition-all"
          >
            <span className="text-base sm:text-lg">💎</span>
            <span className="font-cinzel text-xs sm:text-sm font-black text-[#7dd3fc] tabular-nums">
              {userUsdt > 0 ? userUsdt.toFixed(0) : '1 350'}
            </span>
            <button
              type="button"
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#22c55e] hover:bg-[#16a34a] border border-[#86efac] text-black font-black text-[10px] sm:text-xs flex items-center justify-center shadow transition-all"
            >
              +
            </button>
          </div>
        </div>
      </header>

      {/* 3. CENTER HERO 3D STAGE: 5 BACKGAMMON BOARD CARDS ON CIRCULAR ILLUMINATED DAIS */}
      <div className="relative z-10 flex-1 min-h-0 w-full flex items-center justify-center px-2 sm:px-6 overflow-hidden perspective-[1200px]">
        {/* Glow beneath the central podium */}
        <div className="absolute w-[450px] sm:w-[620px] h-[120px] sm:h-[160px] rounded-full bg-[#0284c7]/25 blur-[60px] pointer-events-none transform translate-y-24" />

        {/* The 5 Standing 3D Backgammon Board Cards in an Arc */}
        <div className="relative w-full max-w-[980px] h-[280px] sm:h-[350px] md:h-[400px] flex items-center justify-center">
          {cards.map((card, idx) => {
            const offset = idx - selectedCardIndex;
            const isCenter = offset === 0;

            // Compute 3D translation & rotation to recreate the curved carousel arc in the screenshot
            let translateX = offset * 180;
            let translateZ = -Math.abs(offset) * 80;
            let rotateY = offset * -18;
            let scale = isCenter ? 1.0 : Math.max(0.72, 1 - Math.abs(offset) * 0.14);
            let opacity = Math.max(0.45, 1 - Math.abs(offset) * 0.22);
            let zIndex = 30 - Math.abs(offset) * 5;

            // Responsive scale tuning
            if (typeof window !== 'undefined' && window.innerWidth < 640) {
              translateX = offset * 125;
              scale = isCenter ? 0.95 : Math.max(0.65, 0.95 - Math.abs(offset) * 0.16);
            }

            return (
              <div
                key={card.id}
                onClick={() => handleSelectCard(idx)}
                style={{
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity,
                  zIndex,
                  transformStyle: 'preserve-3d',
                }}
                className={`absolute w-[180px] sm:w-[220px] md:w-[250px] h-[260px] sm:h-[320px] md:h-[360px] rounded-2xl cursor-pointer transition-all duration-500 ease-out flex flex-col justify-between group ${
                  isCenter ? 'drop-shadow-[0_20px_40px_rgba(56,189,248,0.55)]' : 'hover:opacity-90'
                }`}
              >
                {/* 3D Cyan Light Halo behind Center Card */}
                {isCenter && (
                  <div className="absolute -inset-2 rounded-2xl bg-gradient-to-b from-[#38bdf8]/40 via-transparent to-[#38bdf8]/30 blur-lg pointer-events-none" />
                )}

                {/* Card Container Frame with Gold Borders and Ornate Filigree */}
                <div className="relative w-full h-full rounded-2xl overflow-hidden border-[3px] border-[#d4af37] bg-gradient-to-b from-[#241306] via-[#150a03] to-[#0a0501] shadow-[0_20px_50px_rgba(0,0,0,0.95)] flex flex-col justify-between">
                  {/* Top Cyan Light Accent on Center Card */}
                  {isCenter && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#38bdf8] to-transparent shadow-[0_0_15px_#38bdf8]" />
                  )}

                  {/* High Quality Card Cover Art (Sculpted Lion & Backgammon Case) */}
                  <div className="relative w-full flex-1 overflow-hidden">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="w-full h-full object-cover object-center scale-[1.02] group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/25 pointer-events-none" />
                  </div>

                  {/* Bottom Action Banner (Play 1 on 1, Tournaments Events, etc.) */}
                  <div className="relative z-10 w-full py-2 sm:py-3 px-3 bg-gradient-to-t from-black via-black/95 to-black/80 border-t border-[#d4af37]/50 flex flex-col items-center justify-center text-center">
                    <h3 className="font-cinzel text-base sm:text-xl font-black text-white tracking-wider drop-shadow-md">
                      {card.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs sm:text-sm font-semibold text-[#f5dca8]">
                      <span>{card.icon}</span>
                      <span>{card.sub}</span>
                      <span className="text-[#ffd700] font-bold text-sm">❯</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. BOTTOM BAR (EXACT REPLICA OF THE SCREENSHOT) */}
      <footer className="relative z-30 w-full h-[58px] sm:h-[66px] px-2 sm:px-4 pb-1 sm:pb-2 flex items-center justify-between">
        {/* Left Side: Navigation Tabs Capsules */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* Home (Active with gold glowing border) */}
          <button
            type="button"
            className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-gradient-to-b from-[#2a1d0d] to-[#140d05] border-2 border-[#f5dca8] shadow-[0_0_15px_rgba(245,220,168,0.4)] flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95"
          >
            <span className="text-sm sm:text-base leading-none">🏠</span>
            <span className="font-cinzel text-[8px] sm:text-[9px] font-bold text-[#fef08a] mt-0.5">
              Home
            </span>
          </button>

          {/* Profile */}
          <button
            type="button"
            onClick={() => {
              royalSound.playOptionClickSound();
              onOpenProfile();
            }}
            className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-black/60 hover:bg-[#1a1f2c] border border-slate-700/60 flex flex-col items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-all active:scale-95"
          >
            <span className="text-sm sm:text-base leading-none">👤</span>
            <span className="font-cinzel text-[8px] sm:text-[9px] font-bold mt-0.5">
              Profile
            </span>
          </button>

          {/* Wallet */}
          <button
            type="button"
            onClick={() => {
              royalSound.playOptionClickSound();
              onOpenWallet();
            }}
            className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-black/60 hover:bg-[#1a1f2c] border border-slate-700/60 flex flex-col items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-all active:scale-95 relative"
          >
            <span className="text-sm sm:text-base leading-none">💳</span>
            <span className="font-cinzel text-[8px] sm:text-[9px] font-bold mt-0.5">
              Wallet
            </span>
          </button>

          {/* Store */}
          <button
            type="button"
            onClick={() => {
              royalSound.playOptionClickSound();
              onOpenStore();
            }}
            className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-black/60 hover:bg-[#1a1f2c] border border-slate-700/60 flex flex-col items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-all active:scale-95 relative"
          >
            <span className="text-sm sm:text-base leading-none">🏪</span>
            <span className="font-cinzel text-[8px] sm:text-[9px] font-bold mt-0.5">
              Store
            </span>
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => {
              royalSound.playOptionClickSound();
              onOpenSettings();
            }}
            className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-black/60 hover:bg-[#1a1f2c] border border-slate-700/60 flex flex-col items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-all active:scale-95 relative"
          >
            <span className="text-sm sm:text-base leading-none">⚙️</span>
            <span className="font-cinzel text-[8px] sm:text-[9px] font-bold mt-0.5">
              Settings
            </span>
          </button>

          {/* Help */}
          <button
            type="button"
            onClick={() => {
              royalSound.playOptionClickSound();
              onOpenSupport();
            }}
            className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-black/60 hover:bg-[#1a1f2c] border border-slate-700/60 flex flex-col items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-all active:scale-95"
          >
            <span className="text-sm sm:text-base leading-none">❓</span>
            <span className="font-cinzel text-[8px] sm:text-[9px] font-bold mt-0.5">
              Help
            </span>
          </button>
        </nav>

        {/* Right Side: Golden Piggy Bank Widget */}
        <div
          onClick={handleBreakPiggyBank}
          className="relative h-11 sm:h-12 px-2.5 sm:px-3 rounded-2xl bg-gradient-to-r from-[#031d36]/90 via-[#073059]/90 to-[#02182d]/90 border border-[#38bdf8]/60 shadow-[0_0_20px_rgba(56,189,248,0.35)] flex items-center gap-2 cursor-pointer hover:border-[#7dd3fc] transition-all active:scale-95 group overflow-hidden"
        >
          {/* 3D Piggy Bank Image */}
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 shrink-0">
            <img
              src={goldenPiggyBankImg}
              alt="Golden Piggy Bank"
              className="w-full h-full object-contain filter drop-shadow group-hover:scale-110 transition-transform"
            />
          </div>

          {/* Piggy Bank Label & Status */}
          <div className="flex flex-col text-left">
            <span className="text-[9px] sm:text-[10px] font-bold text-white leading-tight">
              Your Piggy Bank
            </span>
            <span className="px-1.5 py-0.2 rounded bg-gradient-to-r from-[#eab308] to-[#fde047] text-[8px] font-black text-black uppercase tracking-wider shadow">
              {piggyBankBroken ? 'CLAIMED!' : 'is FULL!'}
            </span>
          </div>

          {/* Shimmer light effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
        </div>
      </footer>
    </div>
  );
}
