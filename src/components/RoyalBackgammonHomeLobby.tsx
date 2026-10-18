import React, { useState } from 'react';
import palaceNightStageBg from '../assets/images/royal_palace_night_stage_1792268375096.jpg';
import cardPlayGoldImg from '../assets/images/card_play_lion_gold_1792268393216.jpg';
import cardTournamentsSilverImg from '../assets/images/card_tournaments_silver_1792268408315.jpg';
import { royalSound } from '../libgdx/Gdx3DEngine';
import { triggerTelegramHaptic } from '../telegram/telegramMiniApp';

export interface RoyalBackgammonHomeLobbyProps {
  onlineCount: number; userCoins: number; userUsdt: number; playerLevel: number; playerRating: number; playerName: string;
  onPlayOneOnOne: () => void; onOpenTournaments: () => void; onOpenPractice: () => void; onOpenFriends: () => void;
  onOpenProvablyFair: () => void; onOpenLeaderboard: () => void; onOpenVariants: () => void; onOpenProfile: () => void;
  onOpenWallet: () => void; onOpenStore: () => void; onOpenSettings: () => void; onOpenSupport: () => void; onClaimDailyReward: () => void;
}

export function RoyalBackgammonHomeLobby({
  onlineCount, userCoins, userUsdt, playerLevel, playerRating, playerName, onPlayOneOnOne, onOpenTournaments,
  onOpenPractice, onOpenFriends, onOpenProvablyFair, onOpenLeaderboard, onOpenVariants, onOpenProfile, onOpenWallet,
  onOpenStore, onOpenSettings, onOpenSupport, onClaimDailyReward,
}: RoyalBackgammonHomeLobbyProps) {
  const [selectedCardIndex, setSelectedCardIndex] = useState(2);
  const cards = [
    { id: 'practice', title: 'PRACTICE', subtitle: 'Play vs AI', image: cardTournamentsSilverImg, action: onOpenPractice },
    { id: 'tournaments', title: 'TOURNAMENTS', subtitle: 'Compete & win', image: cardTournamentsSilverImg, action: onOpenTournaments },
    { id: 'play', title: 'PLAY', subtitle: '1 on 1', image: cardPlayGoldImg, action: onPlayOneOnOne },
    { id: 'friends', title: 'FRIENDS', subtitle: 'Private match', image: cardTournamentsSilverImg, action: onOpenFriends },
    { id: 'special', title: 'SPECIAL', subtitle: 'Game variants', image: cardPlayGoldImg, action: onOpenVariants },
  ];
  const activate = (index: number) => {
    royalSound.playOptionClickSound();
    triggerTelegramHaptic('light');
    if (index === selectedCardIndex) cards[index].action();
    else setSelectedCardIndex(index);
  };
  const nav = [
    { label: 'HOME', icon: '⌂', action: () => {} },
    { label: 'PROFILE', icon: '♙', action: onOpenProfile },
    { label: 'WALLET', icon: '◈', action: onOpenWallet },
    { label: 'STORE', icon: '▣', action: onOpenStore },
    { label: 'SETTINGS', icon: '⚙', action: onOpenSettings },
    { label: 'HELP', icon: '?', action: onOpenSupport },
  ];
  return (
    <style>{`
        .royal-lobby-root { width: 100%; height: 100%; }
        @media (orientation: portrait) and (max-width: 900px) {
          .royal-lobby-root {
            position: absolute;
            top: 0;
            left: 100vw;
            width: 100dvh;
            height: 100vw;
            transform: rotate(90deg);
            transform-origin: top left;
          }
        }
      `}</style>
    <div className="royal-lobby-root relative isolate min-h-0 flex flex-col overflow-hidden select-none bg-[#03070d] text-white font-sans">
      <div className="absolute inset-0 -z-20">
        <img src={palaceNightStageBg} alt="" className="w-full h-full object-cover object-center" />
      </div>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(3,7,15,.78)_0%,rgba(3,7,15,.12)_34%,rgba(2,8,13,.38)_66%,rgba(2,5,9,.92)_100%)]" />
      <header className="relative z-20 shrink-0 px-3 pt-2 pb-2 sm:px-5 flex items-center justify-between gap-2 border-b border-[#d7b56d]/20 bg-[#03070d]/45 backdrop-blur-sm">
        <button type="button" onClick={onOpenProfile} className="flex min-w-0 items-center gap-2 text-left active:scale-95">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e6c77e] bg-gradient-to-br from-[#33210c] to-black text-xl shadow-[0_0_18px_rgba(214,177,93,.22)]">♛</span>
          <span className="min-w-0">
            <span className="block max-w-[35vw] truncate font-serif text-sm font-bold tracking-[.12em] text-[#f4e4bd]">{playerName || 'ROYAL PLAYER'}</span>
            <span className="mt-1 flex items-center gap-1 text-[10px] text-[#d6c49e]"><span className="rounded border border-[#b8954c] px-1">LV {playerLevel}</span><span className="h-1.5 w-16 overflow-hidden rounded-full bg-black/70"><span className="block h-full w-[68%] bg-gradient-to-r from-[#a7772c] to-[#f5d98a]" /></span></span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={() => { royalSound.playVictoryFanfareSound(); onClaimDailyReward(); }} className="flex flex-col items-center rounded-lg px-1.5 py-1 text-[#f2d58d] active:scale-95"><span className="text-xl">♜</span><span className="text-[9px]">REWARD</span></button>
          <button type="button" onClick={onOpenLeaderboard} className="flex flex-col items-center rounded-lg px-1.5 py-1 text-[#e9dfca] active:scale-95"><span className="text-xl">🏆</span><span className="text-[9px]">RANK</span></button>
          <button type="button" onClick={onOpenStore} className="flex flex-col items-center rounded-lg px-1.5 py-1 text-[#e9dfca] active:scale-95"><span className="text-xl">▣</span><span className="text-[9px]">STORE</span></button>
        </div>
        <button type="button" onClick={onOpenWallet} className="shrink-0 rounded-xl border border-[#c9a65c]/70 bg-black/65 px-2.5 py-1.5 text-right shadow-lg active:scale-95">
          <span className="block text-[9px] tracking-widest text-[#cdb780]">BALANCE</span>
          <span className="block text-xs font-bold text-[#ffe5a0]">◉ {userCoins.toLocaleString()}</span>
          <span className="block text-[10px] text-[#d8d5cb]">{Number(userUsdt || 0).toFixed(0)} USDT <span className="text-[#f5d88e]">＋</span></span>
        </button>
      </header>
      <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-0">
        <div className="pointer-events-none absolute bottom-[8%] left-1/2 h-[17%] w-[115%] -translate-x-1/2 rounded-[50%] border-[3px] border-[#dfc276]/70 shadow-[0_0_25px_rgba(70,200,210,.45),inset_0_0_22px_rgba(218,186,112,.3)]" />
        <div className="absolute top-[8%] text-center">
          <p className="font-serif text-[clamp(10px,2.4vw,15px)] tracking-[.38em] text-[#f0d99f]">ROYAL BACKGAMMON</p>
          <p className="mt-1 text-[9px] tracking-[.25em] text-white/60">CHOOSE YOUR TABLE</p>
        </div>
        <div className="relative mt-0 h-[min(62vh,440px)] w-full max-w-[900px] [perspective:1100px]">
          {cards.map((card, index) => {
            const offset = index - selectedCardIndex;
            if (Math.abs(offset) > 2) return null;
            const center = offset === 0;
            const small = typeof window !== 'undefined' && window.innerWidth < 500;
            const x = offset * (small ? 58 : 155);
            const scale = center ? 1 : small ? 0.72 : 0.78;
            return <button key={card.id} type="button" onClick={() => activate(index)} aria-label={card.title}
              className="absolute left-1/2 top-1/2 block w-[min(47vw,230px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[20px] border-2 bg-black shadow-[0_18px_45px_rgba(0,0,0,.7)] transition-all duration-500 ease-out"
              style={{ height: 'min(52vh,390px)', transform: `translate(calc(-50% + ${x}px), -50%) rotateY(${offset * -17}deg) scale(${scale})`, zIndex: 20 - Math.abs(offset), opacity: center ? 1 : 0.72, borderColor: center ? '#e8c76d' : '#89754b', boxShadow: center ? '0 0 0 2px rgba(232,199,109,.12),0 20px 50px rgba(0,0,0,.75)' : '0 15px 35px rgba(0,0,0,.65)' }}>
              <img src={card.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-black/10" />
              <span className="absolute inset-x-0 bottom-0 flex min-h-[68px] flex-col items-center justify-center border-t border-[#d8b76c]/60 bg-black/90 px-1 py-2 text-center">
                <span className="font-serif text-[clamp(13px,3.4vw,22px)] font-bold tracking-[.1em] text-[#fff8e8]">{card.title}</span>
                <span className="mt-1 text-[clamp(10px,2.5vw,14px)] text-[#e4cf9e]">{center ? '◆' : ''} {card.subtitle} <span className="text-[#e8c76d]">❯</span></span>
              </span>
            </button>;
          })}
        </div>
        <div className="relative z-30 mt-1 flex items-center gap-2">
          {cards.map((card, index) => <button key={card.id} type="button" aria-label={card.title} onClick={() => setSelectedCardIndex(index)} className={`h-1.5 rounded-full transition-all ${index === selectedCardIndex ? 'w-7 bg-[#e7c875]' : 'w-1.5 bg-white/35'}`} />)}
        </div>
        <div className="relative z-20 mt-3 text-center text-[9px] tracking-[.2em] text-white/55">ONLINE NOW · {onlineCount}</div>
      </main>
      <footer className="relative z-30 grid shrink-0 grid-cols-6 gap-1 border-t border-[#d3b46d]/25 bg-[#03070d]/90 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md sm:px-4">
        {nav.map((item, index) => <button key={item.label} type="button" onClick={() => { if (index !== 0) { royalSound.playOptionClickSound(); item.action(); } }} className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-0.5 py-1.5 transition-all active:scale-95 ${index === 0 ? 'border-[#e9d29a] bg-gradient-to-b from-[#493719]/80 to-black text-[#f8dda0] shadow-[0_0_14px_rgba(221,185,102,.18)]' : 'border-white/10 bg-black/40 text-white/75 hover:border-[#d4b46b]/60'}`}>
          <span className="text-lg leading-5">{item.icon}</span><span className="truncate text-[clamp(7px,1.8vw,10px)] font-semibold tracking-wide">{item.label}</span>
        </button>)}
      </footer>
    </div>
  );
}
