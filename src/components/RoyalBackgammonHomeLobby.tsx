import React, { useState } from 'react';
import palaceNightStageBg from '../assets/images/royal_palace_night_stage_1792268375096.jpg';
import goldenPiggyBankImg from '../assets/images/golden_piggy_bank_1792268437912.jpg';
import { royalSound } from '../libgdx/Gdx3DEngine';
import { triggerTelegramHaptic } from '../telegram/telegramMiniApp';
import { t } from '../i18n/translations';
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
  onlineCount, userCoins, userUsdt, playerLevel, playerRating, playerName,
  onPlayOneOnOne, onOpenTournaments, onOpenPractice, onOpenFriends,
  onOpenProvablyFair, onOpenLeaderboard, onOpenVariants, onOpenProfile,
  onOpenWallet, onOpenStore, onOpenSettings, onOpenSupport, onClaimDailyReward,
}: RoyalBackgammonHomeLobbyProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'wallet' | 'store' | 'settings' | 'help'>('home');
  const [piggyBankClaimed, setPiggyBankClaimed] = useState(false);
  const displayName = playerName || 'Masoud';

  const tap = (action: () => void) => {
    triggerTelegramHaptic('light');
    royalSound.playOptionClickSound();
    action();
  };

  const navButton = (tab: typeof activeTab, icon: string, label: string, action: () => void, locked = false) => (
    <button key={tab} type="button" onClick={() => { setActiveTab(tab); tap(action); }}
      className={`relative flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border px-1.5 py-2 transition-all sm:flex-none sm:gap-2 sm:px-3 sm:py-2.5 ${activeTab === tab ? 'border-[#e5b74e] bg-gradient-to-b from-[#5d4218]/80 to-[#130d07]/95 text-[#ffe08a] shadow-[0_0_18px_rgba(255,185,48,.32)]' : 'border-[#71849a]/25 bg-[#020812]/85 text-white/75 hover:border-[#d7b66d]/70 hover:text-white'}`}>
      <span className="text-xl leading-none sm:text-2xl">{icon}</span>
      <span className="hidden text-xs font-semibold sm:inline">{label}</span>
      {locked && <span className="hidden text-[9px] text-[#e5b74e] sm:inline">🔒</span>}
    </button>
  );

  return (
    <div className="fixed inset-0 z-40 flex h-[100dvh] w-full flex-col overflow-hidden bg-[#020611] font-sans text-white select-none">
      <div className="pointer-events-none absolute inset-0 z-0">
        <img src={palaceNightStageBg} alt="Royal palace at night" className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020713]/65 via-[#020713]/15 to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,rgba(0,133,255,.16),transparent_55%)]" />
      </div>

      <header className="relative z-30 mx-1.5 mt-1.5 flex min-h-[54px] shrink-0 items-center justify-between gap-1 rounded-xl border border-[#b4c8e0]/20 bg-[#020916]/90 px-1.5 shadow-[0_8px_35px_rgba(0,0,0,.55)] backdrop-blur-xl sm:mx-4 sm:mt-3 sm:min-h-[70px] sm:gap-2 sm:rounded-2xl sm:px-4">
        <button type="button" onClick={() => tap(onOpenProfile)} className="flex min-w-0 shrink items-center gap-1.5 text-left sm:gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#f4c65f] bg-gradient-to-br from-[#583b13] to-[#020713] text-lg text-[#ffd76a] shadow-[0_0_18px_rgba(255,190,65,.35)] sm:h-12 sm:w-12 sm:text-xl">♛</span>
          <span className="min-w-0">
            <span className="block max-w-[74px] truncate text-[10px] font-extrabold tracking-wide sm:max-w-none sm:text-sm">{displayName}</span>
            <span className="mt-1 flex items-center gap-1">
              <span className="rounded-md border border-[#ffe18a] bg-gradient-to-b from-[#ffdc68] to-[#9d6419] px-1.5 text-[9px] font-black text-[#201302]">{playerLevel || 18}</span>
              <span className="relative block h-3 w-[54px] overflow-hidden rounded-sm border border-white/30 bg-black/80 sm:w-[94px]">
                <span className="absolute inset-y-0 left-0 w-[97%] bg-gradient-to-r from-[#b77b19] via-[#ffe174] to-[#f6b72d]" />
                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold drop-shadow">{Math.min(165, playerRating || 165)}/170</span>
              </span>
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          <button type="button" onClick={() => tap(onClaimDailyReward)} className="flex flex-col items-center rounded-lg px-1 py-1 text-[#ffe08a] hover:bg-white/5 sm:px-3">
            <span className="relative text-xl sm:text-3xl">🎁<span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1 text-[9px] text-white">!</span></span>
            <span className="hidden text-[10px] font-bold sm:block">{t('rewards')}</span>
          </button>
          <button type="button" onClick={() => tap(onOpenLeaderboard)} className="flex flex-col items-center rounded-lg px-1 py-1 text-white hover:bg-white/5 sm:px-3">
            <span className="text-xl sm:text-3xl">🏆</span>
            <span className="hidden text-[10px] font-bold sm:block">{t('leaderboards')}</span>
          </button>
          <button type="button" onClick={() => tap(onOpenStore)} className="flex flex-col items-center rounded-lg px-1 py-1 text-white hover:bg-white/5 sm:px-3">
            <span className="text-xl sm:text-3xl">🏪</span>
            <span className="hidden text-[10px] font-bold sm:block">{t('shop')}</span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button type="button" onClick={() => tap(onOpenStore)} className="flex items-center gap-1 rounded-full border border-[#c28a28]/65 bg-black/70 px-1.5 py-2 text-[10px] font-extrabold sm:gap-2 sm:px-3 sm:text-xs">
            <span>🪙</span><span>{Number(userCoins || 26).toLocaleString()}</span><span className="hidden rounded bg-green-600 px-1.5 text-sm leading-5 sm:inline">+</span>
          </button>
          <button type="button" onClick={() => tap(onOpenWallet)} className="flex items-center gap-1 rounded-full border border-[#369de4]/65 bg-black/70 px-1.5 py-2 text-[10px] font-extrabold sm:gap-2 sm:px-3 sm:text-xs">
            <span>💎</span><span>{Number(userUsdt || 1350).toLocaleString()}</span><span className="hidden rounded bg-green-600 px-1.5 text-sm leading-5 sm:inline">+</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden">
          <ThreeDCardCarousel onPlayOneOnOne={onPlayOneOnOne} onOpenTournaments={onOpenTournaments} onOpenPractice={onOpenPractice} onOpenFriends={onOpenFriends} onOpenVariants={onOpenVariants} />
        </div>
      </main>

      <footer className="relative z-30 mx-1.5 mb-1.5 flex min-h-[56px] shrink-0 items-center justify-between gap-1 rounded-xl border border-[#8fa9c4]/25 bg-[#020813]/95 p-1 shadow-[0_-8px_30px_rgba(0,0,0,.55)] backdrop-blur-xl sm:mx-4 sm:mb-3 sm:min-h-[76px] sm:gap-2 sm:rounded-2xl sm:p-2">
        <nav className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
          {navButton('home', '⌂', t('home'), () => setActiveTab('home'))}
          {navButton('profile', '♙', t('profile'), onOpenProfile)}
          {navButton('wallet', '▣', t('wallet'), onOpenWallet, true)}
          {navButton('store', '🏪', t('store'), onOpenStore, true)}
          {navButton('settings', '⚙', t('settings'), onOpenSettings, true)}
          {navButton('help', '?', t('help'), onOpenSupport)}
        </nav>
        <button type="button" onClick={() => { if (piggyBankClaimed) return; setPiggyBankClaimed(true); tap(onClaimDailyReward); }} className="flex shrink-0 items-center gap-1 rounded-xl border border-[#e3b44f]/70 bg-gradient-to-r from-[#05213a] to-[#07101f] px-1.5 py-1.5 shadow-[0_0_15px_rgba(37,146,255,.25)] sm:gap-2 sm:px-3">
          <img src={goldenPiggyBankImg} alt="Golden piggy bank" className="h-8 w-8 object-contain sm:h-12 sm:w-12" />
          <span className="hidden flex-col text-left sm:flex"><span className="text-[10px] font-bold">Your Piggy Bank</span><span className="rounded bg-gradient-to-r from-[#ffe17a] to-[#c88a20] px-1.5 py-0.5 text-center text-[9px] font-black uppercase text-[#251704]">{piggyBankClaimed ? 'CLAIMED' : t('piggyBankFull')}</span></span>
        </button>
      </footer>
    </div>
  );
}
