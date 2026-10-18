import React, { useState, useEffect } from 'react';
import palaceNightStageBg from '../assets/images/royal_palace_night_stage_1792268375096.jpg';
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
import { ThreeDCardCarousel } from './ThreeDCardCarousel';

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
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'wallet' | 'store' | 'settings' | 'help'>('home');
  const [piggyBankClaimed, setPiggyBankClaimed] = useState(false);
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

  const handleBreakPiggy = () => {
    if (piggyBankClaimed) return;
    royalSound.playVictoryFanfareSound();
    triggerTelegramHaptic('heavy');
    setPiggyBankClaimed(true);
    onClaimDailyReward();
  };

  const displayName = playerName || 'Masoud';
  const selectedLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="fixed inset-0 z-40 w-full h-full flex flex-col justify-between bg-black text-white font-sans overflow-hidden select-none touch-none">
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

      {/* 3. CENTER 3D WEBGL CARD CAROUSEL (THREE.JS 3D CUBOID MESHES WITH TEXTURES & PITCHED TILT) */}
      <ThreeDCardCarousel
        onPlayOneOnOne={onPlayOneOnOne}
        onOpenTournaments={onOpenTournaments}
        onOpenPractice={onOpenPractice}
        onOpenFriends={onOpenFriends}
        onOpenVariants={onOpenVariants}
      />

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
