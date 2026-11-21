import React, { useEffect, useState } from 'react';
import palaceNightStageBg from '../assets/images/royal_palace_night_stage_1792268375096.jpg';
import { OnlineTier, OnlineUser } from '../network/multiplayerTypes';
import { RoyalCrownIcon } from './RoyalIcons';

interface OnlineMatchmakingModalProps {
  isOpen: boolean;
  mode: 'online_match' | 'quick_seat';
  tier?: OnlineTier | null;
  player: {
    username: string;
    level: number;
    rating?: number;
    wins: number;
    matchesPlayed: number;
  };
  onlineCount: number;
  queueCount: number;
  matchedOpponent: OnlineUser | null;
  onCancel: () => void;
}

export function OnlineMatchmakingModal({
  isOpen,
  mode,
  tier,
  player,
  onlineCount,
  queueCount,
  matchedOpponent,
  onCancel,
}: OnlineMatchmakingModalProps) {
  const [dots, setDots] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const interval = window.setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 450);
    return () => window.clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#020611] animate-fade-in">
      <img src={palaceNightStageBg} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-90" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,17,.48)_0%,rgba(2,7,17,.30)_42%,rgba(2,7,17,.88)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_48%,rgba(220,177,91,.22),transparent_52%)]" />
      <section className="relative flex h-[100dvh] w-full max-w-[760px] flex-col justify-center px-4 py-7 text-[#eee2c7] sm:h-[min(94dvh,820px)] sm:rounded-[28px] sm:border sm:border-[#d7b66d]/55 sm:bg-[#07101f]/45 sm:p-7 sm:backdrop-blur-md">
        <header className="mb-7 flex flex-col items-center text-center">
          <RoyalCrownIcon className="mb-2 h-7 w-8 text-[#e0bf79] drop-shadow-[0_0_12px_rgba(220,177,91,.55)]" />
          <h2 className="font-cinzel text-[17px] font-semibold tracking-[0.19em] text-[#f7e2b4] uppercase drop-shadow-lg">
            {matchedOpponent ? 'OPPONENT MATCHED' : tier ? tier.name : mode === 'quick_seat' ? 'QUICK SEAT' : 'ONLINE MATCHMAKING'}
          </h2>
          <p className="mt-1 font-cormorant text-[14px] text-[#e0d1b0]">
            {matchedOpponent
              ? `Match confirmed • Opening the 3D table in ${countdown ?? 1}s`
              : tier
              ? `Searching in ${tier.persianName} • Entry ${tier.entryFeeUsdt} USDT`
              : `Finding a real opponent near Level ${player.level}${dots}`}
          </p>
          {tier && <span className="mt-3 rounded-full border border-[#d7b66d]/60 bg-[#090f1c]/75 px-4 py-1 font-cinzel text-[10px] tracking-[.16em] text-[#f5dca8]">{tier.badge} · PRIZE {tier.prizePoolUsdt} USDT</span>}
        </header>
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          <article className="relative flex min-h-[220px] flex-col items-center justify-center overflow-hidden rounded-[22px] border border-[#e4c27c]/65 bg-[linear-gradient(145deg,rgba(37,46,57,.92),rgba(7,14,27,.94))] px-2 py-5 shadow-[0_18px_42px_rgba(0,0,0,.55),inset_0_1px_0_rgba(255,229,174,.24)]">
            <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#f6dfa8] to-transparent" />
            <span className="mb-3 font-cinzel text-[10px] tracking-[.24em] text-[#d9b96f]">YOU</span>
            <div className="mb-3 flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 border-[#f1d28e] bg-[radial-gradient(circle_at_35%_25%,#f8df9d,#916126_48%,#24180d_78%)] font-cinzel text-xl font-bold text-[#fff0c7] shadow-[0_0_0_5px_rgba(221,185,111,.12),0_12px_28px_rgba(0,0,0,.6)]">{player.username.slice(0,2).toUpperCase()}</div>
            <strong className="max-w-full truncate font-cinzel text-[13px] text-[#fff0c7]">{player.username}</strong>
            <span className="mt-1 font-cinzel text-[9px] tracking-wider text-[#e0c27e]">LEVEL {player.level} · {player.rating ?? 1200} ELO</span>
            <span className="mt-2 font-cormorant text-[11px] text-[#b8ad99]">{player.wins} Wins · {player.matchesPlayed} Matches</span>
          </article>
          <div className="relative z-10 -mx-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#f0d18b] bg-[radial-gradient(circle,#f5dfaa_0%,#9b7137_55%,#17111a_100%)] font-cinzel text-[12px] font-black text-[#24190b] shadow-[0_0_25px_rgba(231,193,111,.48)]">VS</div>
          <article className="relative flex min-h-[220px] flex-col items-center justify-center overflow-hidden rounded-[22px] border border-[#9fc7dd]/55 bg-[linear-gradient(145deg,rgba(29,48,65,.94),rgba(5,13,27,.96))] px-2 py-5 shadow-[0_18px_42px_rgba(0,0,0,.55),inset_0_1px_0_rgba(190,225,244,.18)]">
            <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#b6d7e8] to-transparent" />
            <span className="mb-3 font-cinzel text-[10px] tracking-[.24em] text-[#b6d7e8]">{matchedOpponent ? 'OPPONENT' : 'SEEKING'}</span>
            {matchedOpponent ? <>
              <div className="mb-3 flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 border-[#b6d7e8] bg-[radial-gradient(circle_at_35%_25%,#d5edf8,#416982_52%,#101e2b_82%)] font-cinzel text-xl font-bold text-white shadow-[0_0_0_5px_rgba(166,208,229,.12),0_12px_28px_rgba(0,0,0,.6)]">{matchedOpponent.username.slice(0,2).toUpperCase()}</div>
              <strong className="max-w-full truncate font-cinzel text-[13px] text-[#e5f3fb]">{matchedOpponent.username}</strong>
              <span className="mt-1 font-cinzel text-[9px] tracking-wider text-[#b6d7e8]">LEVEL {matchedOpponent.level} · {matchedOpponent.rating ?? 1200} ELO</span>
              <span className="mt-2 font-cormorant text-[11px] text-[#b8c7d0]">{matchedOpponent.wins} Wins · Real Player</span>
            </> : <>
              <div className="relative mb-3 flex h-[76px] w-[76px] items-center justify-center rounded-full border border-[#b6d7e8]/70 bg-[radial-gradient(circle,rgba(111,174,205,.45),rgba(5,17,31,.95)_68%)] shadow-[0_0_32px_rgba(119,190,225,.28)]">
                <span className="absolute inset-2 rounded-full border border-[#b6d7e8]/35 animate-ping" />
                <span className="font-cinzel text-[24px] text-[#d9effb]">?</span>
              </div>
              <strong className="font-cinzel text-[11px] tracking-[.14em] text-[#d9effb] animate-pulse">SEARCHING{dots}</strong>
              <span className="mt-2 text-center font-cormorant text-[11px] text-[#9fb3c0]">Waiting for a live challenger</span>
            </>}
          </article>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#d7b66d]/35 bg-[#050c18]/75 px-3 py-3 text-center shadow-lg">
            <span className="block font-cinzel text-[9px] tracking-[.16em] text-[#9e9279]">PLAYERS ONLINE</span>
            <strong className="mt-1 block font-cinzel text-[20px] text-[#f2d79e] tabular-nums">{onlineCount}</strong>
          </div>
          <div className="rounded-xl border border-[#d7b66d]/35 bg-[#050c18]/75 px-3 py-3 text-center shadow-lg">
            <span className="block font-cinzel text-[9px] tracking-[.16em] text-[#9e9279]">IN MATCH QUEUE</span>
            <strong className="mt-1 block font-cinzel text-[20px] text-[#f2d79e] tabular-nums">{queueCount}</strong>
          </div>
        </div>
        {!matchedOpponent && <button type="button" onClick={onCancel} className="mt-6 w-full rounded-xl border border-[#e2c17b]/75 bg-[linear-gradient(180deg,#4a3820,#1c1720)] py-3 font-cinzel text-[11px] font-bold tracking-[.2em] text-[#f7e4b9] shadow-[0_8px_24px_rgba(0,0,0,.45),inset_0_1px_0_rgba(255,232,184,.25)] transition hover:brightness-125 active:scale-[.99] cursor-pointer">CANCEL SEARCH</button>}
      </section>
    </div>
  );
}
