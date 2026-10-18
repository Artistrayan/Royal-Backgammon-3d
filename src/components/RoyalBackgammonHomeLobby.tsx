import React, { useState, useEffect } from 'react';
import palaceNightStageBg from '../assets/images/royal_palace_night_stage_1792268375096.jpg';
import cardPlayGoldImg from '../assets/images/card_play_gold_lion_sun_1792320293012.jpg';
import cardTournamentsSilverImg from '../assets/images/card_tournaments_silver_lion_sun_1792320310950.jpg';
import cardFriendsEmeraldImg from '../assets/images/card_friends_emerald_lion_sun_1792320329436.jpg';
import goldenPiggyBankImg from '../assets/images/golden_piggy_bank_1792268437912.jpg';
import { royalSound } from '../libgdx/Gdx3DEngine';
import { triggerTelegramHaptic } from '../telegram/telegramMiniApp';
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  getLanguage,
  setLanguage,
  t,
} from '../i18n/translations';

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
  // Active Card index (0: Practice, 1: Tournaments, 2: Play [Center], 3: Friends, 4: Special)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(2);
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'wallet' | 'store' | 'settings' | 'help'>('home');
  const [piggyBankClaimed, setPiggyBankClaimed] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(getLanguage());
  const [showLangMenu, setShowLangMenu] = useState(false);

  useEffect(() => {
    const handleLangChange = (e: any) => {
      if (e?.detail) setCurrentLang(e.detail);
    };
    window.addEventListener('app_language_changed', handleLangChange);
    return () => {
      window.removeEventListener('app_language_changed', handleLangChange);
    };
  }, []);

  const handleSelectLanguage = (code: SupportedLanguage) => {
    setLanguage(code);
    setCurrentLang(code);
    setShowLangMenu(false);
    triggerTelegramHaptic('light');
    royalSound.playOptionClickSound();
  };

  // 5 World-Class Thick 3D Game Cards with Lion and Sun Motif
  const cards = [
    {
      id: 'practice',
      title: t('practice'),
      sub: t('practiceSub'),
      icon: '🎓',
      image: cardTournamentsSilverImg,
      glow: 'rgba(100, 116, 139, 0.55)',
      accentBorder: 'border-slate-400',
      sideGradient: 'from-[#334155] via-[#475569] to-[#1e293b]',
      action: onOpenPractice,
    },
    {
      id: 'tournaments',
      title: t('tournaments'),
      sub: t('tournamentsSub'),
      icon: '🏆',
      image: cardTournamentsSilverImg,
      glow: 'rgba(148, 163, 184, 0.7)',
      accentBorder: 'border-slate-300',
      sideGradient: 'from-[#64748b] via-[#94a3b8] to-[#334155]',
      action: onOpenTournaments,
    },
    {
      id: 'play',
      title: t('play'),
      sub: t('playSub'),
      icon: '👥',
      image: cardPlayGoldImg,
      glow: 'rgba(234, 179, 8, 0.95)',
      accentBorder: 'border-[#ffd700]',
      sideGradient: 'from-[#854d0e] via-[#d4af37] to-[#451a03]',
      action: onPlayOneOnOne,
    },
    {
      id: 'friends',
      title: t('friends'),
      sub: t('friendsSub'),
      icon: '🤝',
      image: cardFriendsEmeraldImg,
      glow: 'rgba(16, 185, 129, 0.8)',
      accentBorder: 'border-emerald-500',
      sideGradient: 'from-[#065f46] via-[#10b981] to-[#022c22]',
      action: onOpenFriends,
    },
    {
      id: 'special',
      title: t('special'),
      sub: t('specialSub'),
      icon: '⭐',
      image: cardPlayGoldImg,
      glow: 'rgba(217, 119, 6, 0.75)',
      accentBorder: 'border-amber-600',
      sideGradient: 'from-[#78350f] via-[#d97706] to-[#451a03]',
      action: onOpenVariants,
    },
  ];

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragStartX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const deltaX = (e.clientX - centerX) / (window.innerWidth / 2);
    const deltaY = (e.clientY - centerY) / (window.innerHeight / 2);
    setTilt({
      x: deltaY * -12,
      y: deltaX * 14,
    });
  };

  const handlePointerLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const delta = e.clientX - dragStartX;
    if (Math.abs(delta) > 35) {
      if (delta > 0) {
        handleSelectCard(Math.max(0, selectedCardIndex - 1));
      } else {
        handleSelectCard(Math.min(cards.length - 1, selectedCardIndex + 1));
      }
    }
  };

  const handleSelectCard = (index: number) => {
    if (index === selectedCardIndex) {
      royalSound.playOptionClickSound();
      triggerTelegramHaptic('medium');
      cards[index].action();
    } else {
      royalSound.playDiceRollSound();
      triggerTelegramHaptic('light');
      setSelectedCardIndex(index);
    }
  };

  const handleBreakPiggy = () => {
    if (piggyBankClaimed) return;
    royalSound.playVictoryFanfareSound();
    triggerTelegramHaptic('heavy');
    setPiggyBankClaimed(true);
    onClaimDailyReward();
  };

  const displayName = playerName || 'Masoud';
  const selectedLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  return (
    <div
      className="fixed inset-0 z-40 w-full h-full flex flex-col justify-between bg-black text-white font-sans overflow-hidden select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerUp}
    >
      {/* 1. CINEMATIC BACKGROUND: ILLUMINATED PALACE AT NIGHT & REFLECTIVE PLATFORM */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src={palaceNightStageBg}
          alt="Royal Backgammon Night Palace Stage"
          className="w-full h-full object-cover object-center scale-[1.02]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/70" />
      </div>

      {/* 2. TOP BAR: AVATAR, TOKENS, ICONS, AND LANGUAGE SELECTOR */}
      <header className="relative z-30 w-full h-[52px] sm:h-[58px] px-2 sm:px-4 pt-1 sm:pt-2 flex items-center justify-between pointer-events-auto">
        {/* Left Side: Avatar with Golden Crown Frame & Level */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <div
            onClick={onOpenProfile}
            className="relative cursor-pointer group flex items-center justify-center"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full p-[2px] bg-gradient-to-tr from-[#b8860b] via-[#ffd700] to-[#fff3b0] shadow-[0_0_15px_rgba(255,215,0,0.5)] flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#1e1006] flex items-center justify-center overflow-hidden border border-[#ffe082]">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#ffd700]" fill="currentColor">
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                </svg>
              </div>
            </div>
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[10px] text-[#ffd700]">
              👑
            </div>
          </div>

          <div className="flex flex-col">
            <span className="font-bold text-xs sm:text-sm text-white tracking-wide drop-shadow-md">
              {displayName}
            </span>

            <div className="flex items-center gap-1 mt-0.5">
              <div className="px-1.5 py-0.2 rounded-sm bg-gradient-to-b from-[#ffd700] to-[#b8860b] border border-[#ffe082] text-[#1a0f02] font-black text-[9px] sm:text-[10px] leading-tight shadow-sm">
                {playerLevel || 18}
              </div>
              <div className="relative w-16 sm:w-20 h-3 rounded-full bg-black/75 border border-white/20 overflow-hidden flex items-center justify-center">
                <div
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#eab308] via-[#ffd700] to-[#22c55e]"
                  style={{ width: '70%' }}
                />
                <span className="relative z-10 text-[7.5px] font-bold text-white tracking-tight drop-shadow">
                  165/170
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Icons: Rewards, Leaderboards, Shop */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClaimDailyReward}
            className="flex flex-col items-center cursor-pointer group active:scale-95 transition-transform"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-b from-[#d97706] to-[#78350f] border border-[#f59e0b] shadow-[0_2px_10px_rgba(217,119,6,0.5)] flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-sm sm:text-base">🎁</span>
            </div>
            <span className="text-[9px] font-bold text-amber-200 mt-0.5">{t('rewards')}</span>
          </button>

          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="flex flex-col items-center cursor-pointer group active:scale-95 transition-transform"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-b from-[#0284c7] to-[#0369a1] border border-[#38bdf8] shadow-[0_2px_10px_rgba(2,132,199,0.5)] flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-sm sm:text-base">🏆</span>
            </div>
            <span className="text-[9px] font-bold text-sky-200 mt-0.5">{t('leaderboards')}</span>
          </button>

          <button
            type="button"
            onClick={onOpenStore}
            className="flex flex-col items-center cursor-pointer group active:scale-95 transition-transform"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-b from-[#16a34a] to-[#14532d] border border-[#4ade80] shadow-[0_2px_10px_rgba(22,163,74,0.5)] flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-sm sm:text-base">🛒</span>
            </div>
            <span className="text-[9px] font-bold text-green-200 mt-0.5">{t('shop')}</span>
          </button>
        </div>

        {/* Right Side: Balances & Language Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Gold Coins */}
          <div
            onClick={onOpenStore}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 border border-[#eab308]/50 shadow-sm cursor-pointer hover:border-[#eab308]"
          >
            <span className="text-xs">🪙</span>
            <span className="text-xs font-black text-[#ffd700]">
              {userCoins ? userCoins.toLocaleString() : '35,000'}
            </span>
          </div>

          {/* USDT Gems */}
          <div
            onClick={onOpenWallet}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 border border-[#22c55e]/50 shadow-sm cursor-pointer hover:border-[#22c55e]"
          >
            <span className="text-xs">💎</span>
            <span className="text-xs font-black text-[#4ade80]">
              {userUsdt !== undefined ? Number(userUsdt).toFixed(2) : '25.00'}
            </span>
          </div>

          {/* Top 10 World Language Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/70 border border-[#ffd700]/50 text-xs text-white hover:border-[#ffd700] transition-colors cursor-pointer"
            >
              <span>{selectedLangObj.flag}</span>
              <span className="font-bold text-[10px] uppercase">{selectedLangObj.code}</span>
            </button>

            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#140e06]/98 backdrop-blur-xl border border-[#ffd700]/60 shadow-[0_15px_40px_rgba(0,0,0,0.95)] py-2 z-50 max-h-72 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-[#ffd700] tracking-wider border-b border-white/10">
                  {t('selectLanguage')}
                </div>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors cursor-pointer hover:bg-[#ffd700]/15 ${
                      currentLang === lang.code ? 'text-[#ffd700] font-bold bg-[#ffd700]/10' : 'text-white/85'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{lang.flag}</span>
                      <span>{lang.nativeName}</span>
                    </div>
                    {currentLang === lang.code && <span className="text-[#ffd700]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3. CENTER 3D ROTATING DAIS & VISIBLY THICK 3D CARDS (بیشتر سه بعدی و ضخیم‌تر) */}
      <div className="relative z-10 flex-1 w-full flex items-center justify-center overflow-visible">
        {/* Ground Dais: Glowing Ring & Dark Marble Platform */}
        <div className="absolute bottom-6 w-[88%] max-w-[650px] h-28 rounded-[100%] bg-gradient-to-r from-transparent via-[#ffd700]/15 to-transparent border-t-2 border-[#ffd700]/40 shadow-[0_0_50px_rgba(234,179,8,0.35)] transform rotate-x-65 pointer-events-none" />

        {/* Left Navigation Chevron */}
        <button
          type="button"
          onClick={() => handleSelectCard(Math.max(0, selectedCardIndex - 1))}
          disabled={selectedCardIndex === 0}
          className={`absolute left-2 sm:left-4 z-40 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/60 backdrop-blur-md border border-[#ffd700]/60 flex items-center justify-center text-[#ffd700] text-xl sm:text-2xl shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-all cursor-pointer ${
            selectedCardIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95 hover:bg-[#ffd700]/20'
          }`}
        >
          ‹
        </button>

        {/* Right Navigation Chevron */}
        <button
          type="button"
          onClick={() => handleSelectCard(Math.min(cards.length - 1, selectedCardIndex + 1))}
          disabled={selectedCardIndex === cards.length - 1}
          className={`absolute right-2 sm:right-4 z-40 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/60 backdrop-blur-md border border-[#ffd700]/60 flex items-center justify-center text-[#ffd700] text-xl sm:text-2xl shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-all cursor-pointer ${
            selectedCardIndex === cards.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95 hover:bg-[#ffd700]/20'
          }`}
        >
          ›
        </button>

        {/* 3D CAROUSEL STAGE WITH PERSPECTIVE */}
        <div
          style={{ perspective: '1400px' }}
          className="relative w-full h-[320px] sm:h-[380px] md:h-[420px] flex items-center justify-center"
        >
          {cards.map((card, idx) => {
            const offset = idx - selectedCardIndex;
            const absOffset = Math.abs(offset);
            const isCenter = idx === selectedCardIndex;

            // Geometry offsets for 3D carousel with dramatic perspective lean and tilt
            const isSmall = typeof window !== 'undefined' && window.innerWidth < 640;
            const stepX = isSmall ? 155 : 225;
            const xOffset = offset * stepX;
            const zOffset = isCenter ? 95 : -absOffset * 105;

            // "یکم بالای کارت هارو بخوابین" (Pitch top back by 18deg!)
            const rotateX = 18 + (isCenter ? tilt.x : 0);

            // "یکم کج کن بزار ضخامتش مشخص بشه ... یکم زاویه بده به کارت ها"
            // Center card has a stylish -8deg yaw, flanking cards have prominent -32deg arc yaw
            const baseRotateY = isCenter ? -8 : offset * -32;
            const rotateY = baseRotateY + (isCenter ? tilt.y : 0);
            const rotateZ = isCenter ? -2 : offset * -5;

            const scale = isCenter ? 1.16 : Math.max(0.78, 0.91 - absOffset * 0.08);
            const opacity = isCenter ? 1 : Math.max(0.84, 0.95 - absOffset * 0.06);
            const zIndex = isCenter ? 50 : 35 - absOffset * 6;

            // Physical Extrusion Thickness: 36px (بسیار ضخیم و مشخص در نمای ۳بعدی)
            const cardThickness = 36;

            return (
              <div
                key={card.id}
                onClick={() => handleSelectCard(idx)}
                style={{
                  transform: `translateX(${xOffset}px) translateZ(${zOffset}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`,
                  opacity,
                  zIndex,
                  transition: isCenter ? 'transform 0.15s ease-out, opacity 0.4s' : 'all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  transformStyle: 'preserve-3d',
                }}
                className="absolute w-[205px] sm:w-[245px] md:w-[270px] h-[290px] sm:h-[345px] md:h-[390px] cursor-pointer flex flex-col justify-between group pointer-events-auto"
              >
                {/* Radiant Neon Halo behind Center Active Card */}
                {isCenter && (
                  <div className="absolute inset-0 -m-6 rounded-3xl bg-gradient-to-tr from-[#0284c7]/40 via-[#38bdf8]/50 to-[#ffd700]/45 blur-2xl pointer-events-none transform -translate-z-10 animate-pulse" />
                )}

                {/* Ground Shadow on Dais */}
                <div
                  style={{
                    transform: 'translateY(195px) rotateX(90deg) scale(0.98)',
                  }}
                  className="absolute inset-x-2 h-16 rounded-full bg-black/95 blur-lg pointer-events-none"
                />

                {/* --- 3D THICK EXTRUDED CUBOID SLAB --- */}
                <div
                  style={{
                    transformStyle: 'preserve-3d',
                    boxShadow: isCenter
                      ? '0 40px 90px rgba(0,0,0,0.98), 0 0 55px rgba(234,179,8,0.8), inset 0 3px 5px rgba(255,255,255,0.45), inset 0 -4px 10px rgba(0,0,0,0.95)'
                      : `0 28px 65px rgba(0,0,0,0.95), 0 0 35px ${card.glow}, inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -3px 8px rgba(0,0,0,0.85)`,
                  }}
                  className={`relative w-full h-full rounded-2xl border-[3.5px] ${
                    isCenter ? 'border-[#ffd700]' : card.accentBorder
                  } bg-[#0e0703] flex flex-col justify-between transition-all duration-300 transform group-hover:-translate-y-2.5`}
                >
                  {/* 1. VISIBLE EXTRUDED LEFT EDGE WALL (Shows when card rotates right) */}
                  <div
                    style={{
                      width: `${cardThickness}px`,
                      transform: `rotateY(-90deg) translateZ(${cardThickness / 2}px)`,
                      transformOrigin: 'left center',
                    }}
                    className={`absolute left-0 top-0 bottom-0 bg-gradient-to-r ${card.sideGradient} border-l-2 border-[#ffe082] shadow-inner pointer-events-none flex flex-col justify-between py-4`}
                  >
                    <div className="w-[2px] h-full bg-gradient-to-b from-[#ffd700] via-[#ffe082]/60 to-[#ffd700] ml-1 opacity-70" />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/70 pointer-events-none" />
                  </div>

                  {/* 2. VISIBLE EXTRUDED RIGHT EDGE WALL (Shows when card rotates left) */}
                  <div
                    style={{
                      width: `${cardThickness}px`,
                      transform: `rotateY(90deg) translateZ(calc(100% - ${cardThickness / 2}px))`,
                      transformOrigin: 'right center',
                    }}
                    className={`absolute right-0 top-0 bottom-0 bg-gradient-to-l ${card.sideGradient} border-r-2 border-[#ffe082] shadow-inner pointer-events-none flex flex-col justify-between py-4`}
                  >
                    <div className="w-[2px] h-full bg-gradient-to-b from-[#ffd700] via-[#ffe082]/60 to-[#ffd700] mr-1 opacity-70 self-end" />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/70 pointer-events-none" />
                  </div>

                  {/* 3. VISIBLE EXTRUDED TOP RIM (Visible because top is tilted backward!) */}
                  <div
                    style={{
                      height: `${cardThickness}px`,
                      transform: `rotateX(90deg) translateZ(${cardThickness / 2}px)`,
                      transformOrigin: 'top center',
                    }}
                    className="absolute left-0 right-0 top-0 bg-gradient-to-b from-[#fff3b0] via-[#ffd700] to-[#b8860b] border-t-2 border-[#fffbe0] shadow-[0_2px_12px_rgba(255,215,0,0.6)] flex items-center justify-center pointer-events-none overflow-hidden"
                  >
                    <div className="w-full h-[2px] bg-white/70 shadow-sm" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
                  </div>

                  {/* 4. VISIBLE EXTRUDED BOTTOM RIM */}
                  <div
                    style={{
                      height: `${cardThickness}px`,
                      transform: `rotateX(-90deg) translateZ(calc(100% - ${cardThickness / 2}px))`,
                      transformOrigin: 'bottom center',
                    }}
                    className="absolute left-0 right-0 bottom-0 bg-gradient-to-t from-black via-[#1e1307] to-[#b8860b] border-b border-[#ffd700]/60 pointer-events-none"
                  />

                  {/* Inner Metallic Bevel Highlight */}
                  <div className="absolute inset-0 rounded-[13px] border-2 border-[#ffd700]/30 pointer-events-none" />
                  <div className="absolute inset-[3px] rounded-[11px] border border-white/20 pointer-events-none" />

                  {/* Top Image: The Embossed Golden Lion and Sun with Sword and Crown */}
                  <div className="relative w-full flex-1 overflow-hidden rounded-t-xl bg-[#120904]">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="w-full h-full object-cover object-center scale-[1.03] transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent pointer-events-none" />

                    {/* Ornate Baroque Golden Corner Brackets on All Cards */}
                    <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-[#ffd700] rounded-tl-sm shadow-sm" />
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-[#ffd700] rounded-tr-sm shadow-sm" />
                    <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-[#ffd700] rounded-bl-sm shadow-sm" />
                    <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-[#ffd700] rounded-br-sm shadow-sm" />

                    {/* Ornate Header Filigree on Active Center Card */}
                    {isCenter && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-black/75 border border-[#ffd700] text-[8.5px] font-cinzel font-black text-[#ffd700] tracking-widest uppercase shadow-[0_0_12px_rgba(255,215,0,0.6)] flex items-center gap-1">
                        <span>⚜</span>
                        <span>ROYAL 3D</span>
                        <span>⚜</span>
                      </div>
                    )}

                    {/* Specular Diagonal Light Glint */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/12 to-transparent pointer-events-none" />
                  </div>

                  {/* Bottom Glossy Glass Text Plaque */}
                  <div className="relative z-10 w-full py-2.5 sm:py-3.5 px-3 bg-gradient-to-t from-black via-black/95 to-black/85 border-t border-[#ffd700]/40 flex flex-col items-center justify-center text-center shadow-inner rounded-b-xl">
                    <h3 className="font-cinzel text-lg sm:text-2xl font-black text-white tracking-wider drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                      {card.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs sm:text-sm font-semibold text-[#ffd700]">
                      <span className="text-[12px] sm:text-sm">{card.icon}</span>
                      <span className="tracking-wide">{card.sub}</span>
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ffd700] transform transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. BOTTOM BAR: NAVIGATION (HOME, PROFILE, WALLET, STORE, SETTINGS, HELP) + PIGGY BANK */}
      <footer className="relative z-30 w-full h-[58px] sm:h-[66px] px-2 sm:px-4 pb-1 sm:pb-2 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-1 sm:gap-2 bg-black/60 backdrop-blur-md p-1 rounded-2xl border border-white/10 shadow-lg">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'bg-gradient-to-b from-[#ffd700]/30 to-[#b8860b]/20 border-[#ffd700] shadow-[0_0_15px_rgba(255,215,0,0.5)] text-[#ffd700]'
                : 'border-transparent text-white/70 hover:text-white'
            }`}
          >
            <span className="text-base sm:text-lg">🏠</span>
            <span className="text-xs sm:text-sm font-bold tracking-wide">{t('home')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              onOpenProfile();
            }}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <span className="text-base sm:text-lg">👤</span>
            <span className="hidden sm:inline text-xs font-semibold">{t('profile')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('wallet');
              onOpenWallet();
            }}
            className="relative flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <span className="text-base sm:text-lg">👛</span>
            <span className="hidden sm:inline text-xs font-semibold">{t('wallet')}</span>
            <span className="text-[9px] text-[#ffd700] ml-0.5">🔒</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('store');
              onOpenStore();
            }}
            className="relative flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <span className="text-base sm:text-lg">🏪</span>
            <span className="hidden sm:inline text-xs font-semibold">{t('store')}</span>
            <span className="text-[9px] text-[#ffd700] ml-0.5">🔒</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('settings');
              onOpenSettings();
            }}
            className="relative flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <span className="text-base sm:text-lg">⚙️</span>
            <span className="hidden sm:inline text-xs font-semibold">{t('settings')}</span>
            <span className="text-[9px] text-[#ffd700] ml-0.5">🔒</span>
          </button>

          <button
            type="button"
            onClick={onOpenSupport}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <span className="text-base sm:text-lg">❓</span>
            <span className="hidden sm:inline text-xs font-semibold">{t('help')}</span>
          </button>
        </div>

        {/* Right Corner: "Your Piggy Bank is FULL!" Widget */}
        <div
          onClick={handleBreakPiggy}
          className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0369a1]/80 via-[#0284c7]/80 to-[#0369a1]/80 border border-[#38bdf8]/60 shadow-[0_4px_20px_rgba(56,189,248,0.5)] cursor-pointer hover:brightness-110 active:scale-95 transition-all"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 -my-2 flex items-center justify-center filter drop-shadow-[0_2px_8px_rgba(234,179,8,0.8)]">
            <img
              src={goldenPiggyBankImg}
              alt="Golden Piggy Bank"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[10px] sm:text-xs font-bold text-white tracking-tight">
              {t('yourPiggyBank')}
            </span>
            <div className="px-1.5 py-0.2 rounded bg-gradient-to-r from-[#eab308] to-[#f59e0b] text-[#1e1006] font-black text-[9px] sm:text-[10px] tracking-wider uppercase text-center shadow-sm">
              {piggyBankClaimed ? t('piggyBankClaimed') : t('piggyBankFull')}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
