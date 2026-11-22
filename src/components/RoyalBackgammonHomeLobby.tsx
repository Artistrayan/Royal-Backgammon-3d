import React, { useState } from 'react';
import palaceNightStageBg from '../assets/images/royal_palace_night_stage_1792268375096.jpg';
import { royalSound } from '../libgdx/Gdx3DEngine';
import { triggerTelegramHaptic } from '../telegram/telegramMiniApp';

export interface RoyalBackgammonHomeLobbyProps {
  onlineCount: number;
  isRotatedLayout?: boolean;
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
  onOpenTutorial: () => void;
  onOpenLeaderboard: () => void;
  onOpenVariants: () => void;
  onOpenProfile: () => void;
  onOpenWallet: () => void;
  onOpenStore: () => void;
  onOpenSettings: () => void;
  onOpenSupport: () => void;
  onClaimDailyReward: () => void;
}

type LobbyPage = 'home' | 'backgammon';

export function RoyalBackgammonHomeLobby({
  onlineCount, userCoins, userUsdt, playerLevel, playerRating, playerName,
  onPlayOneOnOne, onOpenTournaments, onOpenPractice, onOpenFriends,
  onOpenProvablyFair, onOpenTutorial, onOpenLeaderboard, onOpenVariants, onOpenProfile,
  onOpenWallet, onOpenStore, onOpenSettings, onOpenSupport,
}: RoyalBackgammonHomeLobbyProps) {
  const [page, setPage] = useState<LobbyPage>('home');
  const displayName = playerName || 'Player';

  const run = (action: () => void) => {
    triggerTelegramHaptic('light');
    royalSound.playOptionClickSound();
    action();
  };

  const menuItem = (icon: string, title: string, detail: string, action: () => void, accent = 'gold') => (
    <button key={title} type="button" onClick={() => run(action)}
      className="group flex min-h-[76px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#0a1724]/90 px-3.5 py-3 text-left shadow-[0_8px_24px_rgba(0,0,0,.22)] transition hover:border-[#d9b66d]/55 hover:bg-[#102337] active:scale-[.99]">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xl ${accent === 'blue' ? 'border-sky-300/25 bg-sky-300/10 text-sky-200' : accent === 'green' ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200' : 'border-[#e3c47e]/30 bg-[#e3c47e]/10 text-[#f4d995]'}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold tracking-wide text-[#f5ead4]">{title}</span>
        <span className="mt-1 block text-[11px] leading-relaxed text-slate-400">{detail}</span>
      </span>
      <span className="text-lg text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-[#e5c47c]">›</span>
    </button>
  );

  return (
    <div className="absolute inset-0 z-40 flex h-full w-full flex-col overflow-hidden bg-[#030914] font-sans text-white">
      <div className="pointer-events-none absolute inset-0">
        <img src={palaceNightStageBg} alt="" className="h-full w-full object-cover object-center opacity-35" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,17,.78),rgba(3,10,19,.9)_45%,#020711)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(26,92,130,.2),transparent_62%)]" />
      </div>

      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-white/10 bg-[#050d18]/80 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl sm:px-7">
        <button type="button" onClick={() => run(onOpenProfile)} className="flex min-w-0 items-center gap-3 text-left">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e6c77f]/60 bg-[#241b0d] text-xl text-[#f3d58f]">♛</span>
          <span className="min-w-0">
            <span className="block max-w-[150px] truncate text-sm font-bold tracking-wide">{displayName}</span>
            <span className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
              <span className="rounded bg-[#b98a36]/20 px-1.5 py-0.5 text-[#f2d18a]">LEVEL {playerLevel}</span>
              <span>RATING {playerRating.toLocaleString('en-US')}</span>
            </span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => run(onOpenWallet)} className="rounded-xl border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-right">
            <span className="block text-[9px] uppercase tracking-wider text-sky-200/70">USDT</span>
            <span className="text-xs font-bold tabular-nums text-sky-100">{userUsdt.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
          </button>
          <button type="button" onClick={() => run(onOpenStore)} className="rounded-xl border border-[#e3c47e]/25 bg-[#e3c47e]/10 px-3 py-2 text-right">
            <span className="block text-[9px] uppercase tracking-wider text-[#e9ca8a]/70">COINS</span>
            <span className="text-xs font-bold tabular-nums text-[#f5dda8]">{userCoins.toLocaleString('en-US')}</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-5 sm:px-7 sm:pt-7">
        {page === 'home' ? (
          <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center">
            <div className="mb-7 text-center">
              <p className="text-[10px] font-bold tracking-[.35em] text-[#d7b66d]">ROYAL GAME CLUB</p>
              <h1 className="mt-2 font-cinzel text-2xl font-black tracking-[.12em] text-[#fff0ce] sm:text-4xl">CHOOSE YOUR GAME</h1>
              <p className="mt-2 text-xs text-slate-400">Select a game to continue</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button type="button" onClick={() => { setPage('backgammon'); run(() => {}); }}
                className="group relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-3xl border border-[#e0bd70]/45 bg-[linear-gradient(145deg,#47351b,#111b22_62%,#07101b)] p-5 text-left shadow-[0_18px_50px_rgba(0,0,0,.42)] transition hover:-translate-y-1 hover:border-[#f0d58f] sm:min-h-[270px]">
                <div className="pointer-events-none absolute -right-8 -top-10 h-48 w-48 rounded-full border border-[#f1d18a]/15 bg-[#d6a94e]/10 shadow-[0_0_65px_rgba(210,165,70,.15)]" />
                <div className="relative mb-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e8c779]/40 bg-black/25 text-3xl text-[#f5d991]">♟</div>
                <span className="relative text-xl font-black tracking-[.1em] text-[#fff0ce]">BACKGAMMON</span>
                <span className="relative mt-1 text-xs text-[#d8c49c]">Online matches, AI practice and tournaments</span>
                <span className="relative mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#f1d18a]">Enter game <span>→</span></span>
              </button>

              <div aria-disabled="true" className="relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(145deg,#26313b,#111923_65%,#080e17)] p-5 opacity-75 sm:min-h-[270px]">
                <div className="mb-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-3xl text-slate-300">◉</div>
                <span className="text-xl font-black tracking-[.1em] text-slate-200">CARROM</span>
                <span className="mt-1 text-xs text-slate-400">Carrom game mode is not available yet</span>
                <span className="mt-5 inline-flex w-fit rounded-full border border-slate-400/20 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Coming soon · Disabled</span>
              </div>
            </div>
          </section>
        ) : (
          <section className="mx-auto w-full max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <button type="button" onClick={() => setPage('home')} aria-label="Back to game selection" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl text-[#f0d18b]">‹</button>
              <div>
                <p className="text-[9px] font-bold tracking-[.3em] text-[#d7b66d]">ROYAL GAME CLUB</p>
                <h2 className="mt-1 text-lg font-black tracking-wider text-[#fff0ce]">BACKGAMMON</h2>
              </div>
              <span className="ml-auto rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] text-emerald-200">{onlineCount.toLocaleString('en-US')} online</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {menuItem('⚔','Online 1 vs 1','Find a real opponent and play online.',onPlayOneOnOne,'blue')}
              {menuItem('♟','Practice with AI','Choose a bot from beginner to grandmaster.',onOpenPractice)}
              {menuItem('🏆','Tournaments','Join competitions and follow live matches.',onOpenTournaments,'green')}
              {menuItem('♧','Play with a friend','Find friends or invite someone to a match.',onOpenFriends,'blue')}
              {menuItem('✦','Game variants','Standard, Narde and Hypergammon rules.',onOpenVariants)}
              {menuItem('◎','Learn the game','Rules, dice, legal moves and winning strategy.',onOpenTutorial,'green')}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => run(onLeaderboard)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-semibold text-slate-300">Leaderboard</button>
              <button type="button" onClick={() => run(onOpenSupport)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-semibold text-slate-300">Support</button>
            </div>
          </section>
        )}
      </main>

      <footer className="relative z-10 flex shrink-0 items-center justify-around border-t border-white/10 bg-[#050d18]/90 px-2 pb-[max(9px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        {[
          { icon: '♙', label: 'Profile', action: onOpenProfile },
          { icon: '◈', label: 'Wallet', action: onOpenWallet },
          { icon: '▤', label: 'Store', action: onOpenStore },
          { icon: '⚙', label: 'Settings', action: onOpenSettings },
        ].map(item => (
          <button key={item.label} type="button" onClick={() => run(item.action)} className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-slate-400 transition hover:bg-white/5 hover:text-[#f2d28e]">
            <span className="text-lg">{item.icon}</span>
            <span className="text-[10px] font-semibold">{item.label}</span>
          </button>
        ))}
      </footer>
    </div>
  );
}
