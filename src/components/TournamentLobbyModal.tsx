/**
 * Backgammon Professional Tournament Lobby & Bracket Modal
 *
 * Swiss System + Single Elimination Knockout Finals with USDT buy-in & automated prize escrow:
 * - 5 Swiss Rounds (Match to 5 pts)
 * - Top 8 Single Elimination (QF to 7, SF to 9, Final to 11)
 * - Official Crawford Rule & Doubling Cube
 * - 85% Prize Pool, 15% Platform fee
 * - Dynamic / Automated USDT Payout: 1st (40%), 2nd (22%), 3-4th (10% ea), 5-8th (4.5% ea)
 * - Live Spectator Mode & ELO ratings
 */

import React, { useState, useEffect } from 'react';
import palaceNightStageBg from '../assets/images/royal_palace_night_stage_1792268375096.jpg';
import {
  TournamentState,
  TournamentTierId,
  TournamentMatch,
  TOURNAMENT_TIERS,
} from '../network/tournamentTypes';
import { RoyalCrownIcon } from './RoyalIcons';

interface TournamentLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  userUsdtBalance: number;
  userId: string;
  userName: string;
  playerLevel: number;
  playerRating: number;
  onRegisterTournament: (tierId: TournamentTierId) => void;
  onUnregisterTournament: (tournamentId: string) => void;
  onSpectateMatch: (match: TournamentMatch) => void;
  onOpenWallet: () => void;
}

export function TournamentLobbyModal({
  isOpen,
  onClose,
  userUsdtBalance,
  userId,
  userName,
  playerLevel,
  playerRating,
  onRegisterTournament,
  onUnregisterTournament,
  onSpectateMatch,
  onOpenWallet,
}: TournamentLobbyModalProps) {
  const [selectedTier, setSelectedTier] = useState<TournamentTierId>('swiss_5');
  const [activeTab, setActiveTab] = useState<'standings' | 'pairings' | 'bracket' | 'rules'>('standings');
  const [tournaments, setTournaments] = useState<TournamentState[]>([]);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch live tournaments from backend
  const fetchTournaments = async () => {
    try {
      const res = await fetch('/api/tournaments');
      if (res.ok) {
        const data = await res.json();
        setTournaments(data);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTournaments();
      const interval = setInterval(fetchTournaments, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentTourn =
    tournaments.find((t) => t.tierId === selectedTier) ||
    tournaments[0] ||
    ({
      id: 'tourn_swiss_5',
      tierId: 'swiss_5',
      config: TOURNAMENT_TIERS.swiss_5,
      status: 'registering',
      currentRound: 1,
      participants: [],
      swissMatches: {},
      bracket: null,
      totalCollectedUsdt: 0,
      platformFeeUsdt: 0,
      prizePoolUsdt: 0,
      prizesPaid: false,
      createdAt: Date.now(),
    } as TournamentState);

  const isUserRegistered = Boolean(
    currentTourn.participants.find((p) => p.userId === userId)
  );

  const entryFee = currentTourn.config.entryFeeUsdt;
  const hasEnoughBalance = userUsdtBalance >= entryFee;

  // Sorted participants for Swiss standings
  const sortedParticipants = [...currentTourn.participants].sort((a, b) => {
    if (b.swissPoints !== a.swissPoints) return b.swissPoints - a.swissPoints;
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
    return (b.matchPointsWon - b.matchPointsConceded) - (a.matchPointsWon - a.matchPointsConceded);
  });

  const matchesForSelectedRound = currentTourn.swissMatches[selectedRound] || [];

  const tournamentStatusLabel = {
    registering: 'ثبت‌نام فعال',
    swiss_stage: 'مرحله سوئیسی در جریان',
    knockout_stage: 'مرحله حذفی',
    completed: 'پایان‌یافته',
  }[currentTourn.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02050b]/95 p-0 backdrop-blur-xl animate-fade-in sm:p-3">
      <img src={palaceNightStageBg} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-45" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,16,.48),rgba(2,7,16,.88)_48%,#02050b)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(215,174,93,.23),transparent_55%)]" />

      <section className="relative flex h-[100dvh] w-full max-w-[1080px] flex-col overflow-hidden border-0 bg-[#050b15]/75 text-[#f4ead4] shadow-[0_25px_90px_rgba(0,0,0,.8)] sm:h-[min(94dvh,900px)] sm:rounded-[28px] sm:border sm:border-[#c9a45f]/45">
        <header className="relative shrink-0 border-b border-[#c9a45f]/25 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] sm:px-6 sm:pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#e4c783]/60 bg-[linear-gradient(145deg,#8d6b36,#241a10_70%)] shadow-[0_0_26px_rgba(213,174,94,.2),inset_0_1px_0_rgba(255,238,190,.3)]">
                <RoyalCrownIcon className="h-6 w-6 text-[#ffe7aa] drop-shadow-[0_2px_8px_rgba(255,220,140,.5)]" />
              </div>
              <div className="min-w-0">
                <p className="font-cinzel text-[9px] font-bold tracking-[.28em] text-[#c9a45f]">ROYAL BACKGAMMON</p>
                <h2 className="truncate font-cinzel text-[15px] font-black tracking-[.08em] text-[#fff0c9] sm:text-lg">CHAMPIONSHIP ARENA</h2>
                <p className="font-cormorant text-[11px] text-[#b9ad96]">تالار رقابت‌های رسمی رویال</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`hidden rounded-full border px-3 py-1 font-cinzel text-[8px] font-bold tracking-wider sm:inline-flex ${currentTourn.status === 'registering' ? 'border-[#8cbd91]/40 bg-[#173323]/60 text-[#b9e0b7]' : 'border-[#c9a45f]/40 bg-[#302515]/70 text-[#f0d59c]'}`}>
                {tournamentStatusLabel}
              </span>
              <button type="button" onClick={onClose} aria-label="Close tournament" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#c9a45f]/35 bg-[#0b1422]/90 text-lg text-[#e8cd91] transition hover:border-[#f4d99d] hover:bg-[#1b2635]">×</button>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-5 pt-3 sm:px-6 sm:pt-5">
          <section className="relative mb-4 overflow-hidden rounded-[24px] border border-[#c9a45f]/45 bg-[linear-gradient(112deg,rgba(55,40,20,.96),rgba(14,23,37,.96)_48%,rgba(5,13,25,.98))] p-4 shadow-[0_18px_45px_rgba(0,0,0,.42),inset_0_1px_0_rgba(255,230,174,.16)] sm:p-6">
            <div className="pointer-events-none absolute -right-8 -top-16 h-52 w-52 rounded-full border border-[#e4c783]/10 shadow-[0_0_0_18px_rgba(228,199,131,.025),0_0_0_38px_rgba(228,199,131,.02)]" />
            <div className="relative grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto]">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#e7c47d] shadow-[0_0_10px_#e7c47d]" />
                  <span className="font-cinzel text-[8px] font-bold tracking-[.25em] text-[#e2c27f]">THE ROAD TO THE CROWN</span>
                </div>
                <h3 className="font-cinzel text-[17px] font-black leading-tight text-[#fff0c9] sm:text-2xl">قهرمانی فقط یک برنده دارد</h3>
                <p className="mt-1 max-w-xl font-cormorant text-[13px] text-[#c9bea8]">در پنج راند سوئیسی رقابت کن؛ هشت نفر برتر به جدول حذفی راه پیدا می‌کنند.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#c9a45f]/35 bg-black/25 px-3 py-1 font-cinzel text-[8px] text-[#e8d3a6]">۵ راند سوئیسی</span>
                  <span className="rounded-full border border-[#c9a45f]/35 bg-black/25 px-3 py-1 font-cinzel text-[8px] text-[#e8d3a6]">۸ فینالیست</span>
                  <span className="rounded-full border border-[#c9a45f]/35 bg-black/25 px-3 py-1 font-cinzel text-[8px] text-[#e8d3a6]">قانون کرافورد</span>
                </div>
              </div>
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-[#e5c77f]/55 bg-[radial-gradient(circle_at_35%_25%,#b58b49,#4c3519_48%,#10131b_76%)] shadow-[0_0_0_7px_rgba(215,174,93,.07),0_0_42px_rgba(215,174,93,.2),inset_0_2px_8px_rgba(255,239,190,.3)] sm:mr-5 sm:h-36 sm:w-36">
                <div className="flex h-[78%] w-[78%] items-center justify-center rounded-full border border-[#f5dfaa]/40 bg-[radial-gradient(circle,#62491f,#15131a_72%)]">
                  <RoyalCrownIcon className="h-14 w-14 text-[#f4d99d] drop-shadow-[0_0_16px_rgba(245,213,143,.65)] sm:h-16 sm:w-16" />
                </div>
              </div>
            </div>
          </section>

          <section className="mb-4 grid grid-cols-2 gap-2">
            {(['swiss_5', 'swiss_10'] as TournamentTierId[]).map((tId) => {
              const conf = TOURNAMENT_TIERS[tId];
              const active = selectedTier === tId;
              return (
                <button key={tId} type="button" onClick={() => setSelectedTier(tId)} className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition-all ${active ? 'border-[#f0d18b] bg-[linear-gradient(145deg,rgba(110,79,34,.75),rgba(22,27,36,.98))] shadow-[0_0_0_1px_rgba(240,209,139,.15),0_12px_28px_rgba(0,0,0,.35)]' : 'border-[#b89a61]/25 bg-[#091321]/85 hover:border-[#c9a45f]/60'}`}>
                  {active && <span className="absolute right-0 top-0 rounded-bl-xl bg-[#e4c783] px-2 py-1 font-cinzel text-[7px] font-black tracking-wider text-[#201707]">SELECTED</span>}
                  <span className="block font-cinzel text-[8px] tracking-[.16em] text-[#c9a45f]">{tId === 'swiss_5' ? 'ROYAL CUP' : 'ELITE SERIES'}</span>
                  <span className="mt-1 block font-cinzel text-[13px] font-black text-[#fff0c9] sm:text-base">{conf.entryFeeUsdt} USDT <span className="text-[8px] font-medium text-[#c9bea8]">ENTRY</span></span>
                  <span className="mt-1 block font-cormorant text-[11px] text-[#c8bda7]">{conf.persianTitle}</span>
                  <span className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 font-cinzel text-[8px] text-[#d9bd80]"><span>ظرفیت</span><b>{conf.maxParticipants} نفر</b></span>
                </button>
              );
            })}
          </section>

          <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-[#0b1421]/90 p-3">
              <span className="block font-cinzel text-[7px] tracking-wider text-[#8f958f]">PLAYERS</span>
              <strong className="mt-1 block font-cinzel text-lg text-[#f4dfb0] tabular-nums">{currentTourn.participants.length}<small className="ml-1 text-[9px] text-[#8f958f]">/ {currentTourn.config.maxParticipants}</small></strong>
              <span className="font-cormorant text-[10px] text-[#a9a18f]">شرکت‌کنندگان</span>
            </div>
            <div className="rounded-xl border border-[#c9a45f]/25 bg-[#171526]/90 p-3">
              <span className="block font-cinzel text-[7px] tracking-wider text-[#b89a61]">PRIZE POOL</span>
              <strong className="mt-1 block font-cinzel text-lg text-[#e8c77f] tabular-nums">{currentTourn.prizePoolUsdt.toFixed(2)}</strong>
              <span className="font-cormorant text-[10px] text-[#b9ad96]">USDT جوایز</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0b1421]/90 p-3">
              <span className="block font-cinzel text-[7px] tracking-wider text-[#8f958f]">YOUR BALANCE</span>
              <strong className="mt-1 block font-cinzel text-lg text-[#f4dfb0] tabular-nums">{userUsdtBalance.toFixed(2)}</strong>
              <span className="font-cormorant text-[10px] text-[#a9a18f]">موجودی USDT</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0b1421]/90 p-3">
              <span className="block font-cinzel text-[7px] tracking-wider text-[#8f958f]">PLATFORM FEE</span>
              <strong className="mt-1 block font-cinzel text-lg text-[#c7a66a] tabular-nums">{currentTourn.platformFeeUsdt.toFixed(2)}</strong>
              <span className="font-cormorant text-[10px] text-[#a9a18f]">کارمزد USDT</span>
            </div>
          </section>

          <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#d4b574]/45 bg-[linear-gradient(105deg,rgba(38,31,21,.96),rgba(9,18,30,.98))] p-3 shadow-[0_12px_30px_rgba(0,0,0,.3)] sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="min-w-0">
              <span className="font-cinzel text-[9px] font-bold tracking-[.12em] text-[#f3d99e]">{isUserRegistered ? 'YOUR SEAT IS RESERVED' : 'CLAIM YOUR PLACE IN THE ARENA'}</span>
              <p className="mt-1 font-cormorant text-[12px] text-[#c6baa2]">{isUserRegistered ? 'ثبت‌نام شما در این تورنمنت فعال است.' : `برای ورود به این رقابت، ${entryFee} USDT موجودی لازم است.`}</p>
              {!isUserRegistered && !hasEnoughBalance && <p className="mt-1 font-cormorant text-[11px] text-[#e2a88f]">موجودی کافی نیست؛ ابتدا کیف پول را شارژ کنید.</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              {!hasEnoughBalance && !isUserRegistered && <button type="button" onClick={onOpenWallet} className="rounded-xl border border-[#c9a45f]/55 bg-[#111d2b] px-3 py-2 font-cinzel text-[8px] font-bold text-[#e9d39f]">کیف پول</button>}
              {isUserRegistered ? (
                <button type="button" disabled={currentTourn.status !== 'registering'} onClick={() => onUnregisterTournament(currentTourn.id)} className="rounded-xl border border-[#b97963]/55 bg-[#351b19] px-4 py-2.5 font-cinzel text-[8px] font-bold text-[#f0c8b8] disabled:opacity-40">لغو ثبت‌نام و بازگشت وجه</button>
              ) : (
                <button type="button" disabled={!hasEnoughBalance || currentTourn.participants.length >= currentTourn.config.maxParticipants} onClick={() => onRegisterTournament(selectedTier)} className="rounded-xl border border-[#f3d99e] bg-[linear-gradient(180deg,#e6c783,#98703a)] px-5 py-2.5 font-cinzel text-[9px] font-black tracking-wider text-[#211707] shadow-[0_5px_20px_rgba(203,163,82,.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:grayscale disabled:opacity-45">{hasEnoughBalance ? `ورود به مسابقات · ${entryFee} USDT` : 'موجودی ناکافی'}</button>
              )}
            </div>
          </section>

          <nav className="mb-3 grid grid-cols-4 gap-1 rounded-2xl border border-[#c9a45f]/25 bg-[#060d17]/90 p-1">
            {[
              { id: 'standings', title: 'رده‌بندی', sub: 'STANDINGS' },
              { id: 'pairings', title: 'مسابقات', sub: 'MATCHES' },
              { id: 'bracket', title: 'حذفی', sub: 'FINALS' },
              { id: 'rules', title: 'قوانین', sub: 'RULES' },
            ].map((tab) => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`rounded-xl px-1 py-2 text-center transition-all ${activeTab === tab.id ? 'border border-[#d7b66d]/65 bg-[linear-gradient(180deg,#5b4528,#241d17)] text-[#ffebbd] shadow-[inset_0_1px_0_rgba(255,235,190,.2)]' : 'text-[#8e918f] hover:bg-white/5'}`}>
                <span className="block font-cinzel text-[9px] font-bold">{tab.title}</span>
                <span className="mt-0.5 block font-cinzel text-[6px] tracking-[.12em] opacity-65">{tab.sub}</span>
              </button>
            ))}
          </nav>

          <section className="min-h-[220px] rounded-2xl border border-[#c9a45f]/25 bg-[linear-gradient(145deg,rgba(11,20,33,.96),rgba(4,9,17,.98))] p-3 shadow-[0_14px_34px_rgba(0,0,0,.28)] sm:p-4">
            {activeTab === 'standings' && (
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div><h3 className="font-cinzel text-[10px] font-bold tracking-wider text-[#f2d99f]">SWISS LEADERBOARD</h3><p className="font-cormorant text-[11px] text-[#a9a18f]">جدول امتیازات و رتبه بازیکنان</p></div>
                  <span className="rounded-lg border border-[#c9a45f]/30 bg-[#171b22] px-2 py-1 font-cinzel text-[7px] text-[#d9bd80]">TOP 8 → FINALS</span>
                </div>
                {sortedParticipants.length === 0 ? (
                  <div className="flex min-h-[190px] flex-col items-center justify-center text-center">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-[#c9a45f]/35 bg-[radial-gradient(circle,#5d4726,#121722_72%)] shadow-[0_0_25px_rgba(201,164,95,.12)]"><RoyalCrownIcon className="h-8 w-8 text-[#d9bd80]" /></div>
                    <p className="font-cinzel text-[9px] font-bold tracking-wider text-[#e8d3a6]">THE TABLE IS WAITING</p>
                    <p className="mt-1 font-cormorant text-[12px] text-[#969487]">هنوز بازیکنی در این تورنمنت ثبت‌نام نکرده است.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedParticipants.map((p, idx) => {
                      const isTop8 = idx < 8;
                      const isMe = p.userId === userId;
                      const diff = p.matchPointsWon - p.matchPointsConceded;
                      return (
                        <div key={p.userId} className={`grid grid-cols-[28px_1fr_auto_auto] items-center gap-2 rounded-xl border px-2.5 py-2 ${isMe ? 'border-[#e0c27e]/65 bg-[#33291c]/80' : 'border-white/8 bg-[#101a29]/80'}`}>
                          <span className={`flex h-7 w-7 items-center justify-center rounded-lg font-cinzel text-[10px] font-black ${idx < 3 ? 'bg-[linear-gradient(145deg,#e4c783,#76552a)] text-[#211707]' : 'bg-[#1c2939] text-[#c6b58f]'}`}>{idx + 1}</span>
                          <div className="min-w-0"><p className="truncate font-cinzel text-[9px] font-bold text-[#f0e2c5]">{p.username}{isMe && <span className="ml-1 text-[#d9bd80]">YOU</span>}</p><p className="font-cormorant text-[10px] text-[#8f958f]">ELO {p.rating} · {p.matchesPlayed} مسابقه</p></div>
                          <div className="text-center"><b className="block font-cinzel text-[11px] text-[#e7c77f]">{p.swissPoints}</b><span className="font-cinzel text-[6px] text-[#858b89]">POINTS</span></div>
                          <span className={`rounded-md px-2 py-1 font-cinzel text-[7px] ${isTop8 ? 'border border-[#b99a5e]/35 bg-[#3a2d1c] text-[#e5c783]' : 'bg-[#202733] text-[#9a9b96]'}`}>{isTop8 ? 'TOP 8' : `DIFF ${diff > 0 ? '+' : ''}${diff}`}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pairings' && (
              <div>
                <div className="mb-3"><h3 className="font-cinzel text-[10px] font-bold tracking-wider text-[#f2d99f]">ROUND FIXTURES</h3><p className="font-cormorant text-[11px] text-[#a9a18f]">برنامه و نتیجه رویارویی‌ها</p></div>
                <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
                  {[1, 2, 3, 4, 5].map((rnd) => <button key={rnd} type="button" onClick={() => setSelectedRound(rnd)} className={`shrink-0 rounded-lg border px-3 py-2 font-cinzel text-[8px] font-bold ${selectedRound === rnd ? 'border-[#e2c27e] bg-[#72552b] text-[#fff0c9]' : 'border-white/10 bg-[#111b2a] text-[#92958f]'}`}>ROUND {rnd}</button>)}
                </div>
                {matchesForSelectedRound.length === 0 ? <div className="flex min-h-[160px] items-center justify-center text-center font-cormorant text-[13px] text-[#969487]">برنامه این راند هنوز از سرور دریافت نشده است.</div> : <div className="grid gap-2 sm:grid-cols-2">
                  {matchesForSelectedRound.map((m) => <article key={m.matchId} className="rounded-xl border border-[#c9a45f]/25 bg-[#0c1725] p-3">
                    <div className="mb-3 flex items-center justify-between"><span className="font-cinzel text-[7px] tracking-wider text-[#b99a5e]">ROUND {m.roundIndex ?? m.round} · TO {m.targetPoints}</span><span className={`rounded-md px-2 py-1 font-cinzel text-[7px] ${m.status === 'completed' ? 'bg-[#253c2d] text-[#b8d8b2]' : m.status === 'in_progress' ? 'bg-[#4a321c] text-[#f2d18a]' : 'bg-[#202733] text-[#aeb1b2]'}`}>{m.status === 'completed' ? 'FINAL' : m.status === 'in_progress' ? 'LIVE' : 'UPCOMING'}</span></div>
                    {[m.player1, m.player2].map((p, i) => <div key={p.userId} className="flex items-center justify-between border-t border-white/5 py-2"><span className="truncate font-cinzel text-[9px] text-[#e8dcc2]">{p.username}</span><b className="font-cinzel text-sm text-[#e4c783]">{i === 0 ? m.scoreP1 : m.scoreP2}</b></div>)}
                    <div className="mt-2 flex items-center justify-between"><span className="font-cinzel text-[7px] text-[#888e8e]">CUBE {m.doublingCubeValue ?? 1}X</span><button type="button" onClick={() => onSpectateMatch(m)} className="rounded-lg border border-[#c9a45f]/45 bg-[#1a2635] px-3 py-1.5 font-cinzel text-[7px] font-bold text-[#e5c783]">تماشای بازی</button></div>
                  </article>)}
                </div>}
              </div>
            )}

            {activeTab === 'bracket' && (
              <div>
                <div className="mb-3"><h3 className="font-cinzel text-[10px] font-bold tracking-wider text-[#f2d99f]">KNOCKOUT ROAD</h3><p className="font-cormorant text-[11px] text-[#a9a18f]">مسیر رسیدن به فینال</p></div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { title: 'QUARTERFINALS', fa: 'یک‌چهارم نهایی', rows: currentTourn.bracket?.quarters || [], count: 4, target: 7 },
                    { title: 'SEMIFINALS', fa: 'نیمه‌نهایی', rows: currentTourn.bracket?.semis || [], count: 2, target: 9 },
                    { title: 'GRAND FINAL', fa: 'فینال قهرمانی', rows: currentTourn.bracket?.final ? [currentTourn.bracket.final] : [], count: 1, target: 11 },
                  ].map((stage) => <div key={stage.title} className="rounded-xl border border-[#c9a45f]/25 bg-[#0a1421] p-2.5">
                    <p className="font-cinzel text-[8px] font-bold tracking-wider text-[#e2c27e]">{stage.title}</p><p className="mb-2 font-cormorant text-[10px] text-[#92958f]">{stage.fa} · تا {stage.target} امتیاز</p>
                    {Array.from({ length: stage.count }, (_, i) => {
                      const match: any = stage.rows[i];
                      const p1 = match?.player1?.username || 'در انتظار صعود';
                      const p2 = match?.player2?.username || 'در انتظار صعود';
                      return <div key={i} className="mb-2 rounded-lg border border-white/8 bg-[#111d2b] p-2">
                        <div className="flex items-center justify-between py-1"><span className="truncate font-cinzel text-[8px] text-[#e6dcc6]">{p1}</span><b className="font-cinzel text-[10px] text-[#e1c17b]">{match?.player1?.score ?? '—'}</b></div>
                        <div className="flex items-center justify-between border-t border-white/5 py-1"><span className="truncate font-cinzel text-[8px] text-[#e6dcc6]">{p2}</span><b className="font-cinzel text-[10px] text-[#e1c17b]">{match?.player2?.score ?? '—'}</b></div>
                      </div>;
                    })}
                  </div>)}
                </div>
              </div>
            )}

            {activeTab === 'rules' && (
              <div className="space-y-3">
                <div><h3 className="font-cinzel text-[10px] font-bold tracking-wider text-[#f2d99f]">CHAMPIONSHIP RULEBOOK</h3><p className="font-cormorant text-[11px] text-[#a9a18f]">قوانین و ساختار رقابت</p></div>
                {[
                  ['ساختار مسابقات', '۵ راند سوئیسی برگزار می‌شود. هشت بازیکن برتر جدول به مرحله حذفی تک‌حذفی راه پیدا می‌کنند.'],
                  ['امتیاز هر مرحله', 'راندهای سوئیسی تا ۵، یک‌چهارم نهایی تا ۷، نیمه‌نهایی تا ۹ و فینال تا ۱۱ امتیاز است.'],
                  ['قانون کرافورد', 'در شرایط کرافورد، مکعب دوبرابر طبق قانون مسابقه غیرفعال خواهد بود.'],
                  ['توزیع جوایز', 'طبق ساختار تعریف‌شده تورنمنت، ۸۵٪ استخر جوایز برای بازیکنان و ۱۵٪ کارمزد پلتفرم در نظر گرفته شده است.'],
                  ['تاس منصفانه', 'نتایج تاس باید از سازوکار Provably Fair سمت سرور قابل بررسی باشند.'],
                ].map(([title, desc], i) => <div key={title} className="flex gap-3 rounded-xl border border-white/8 bg-[#101a28] p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#c9a45f]/35 bg-[#302719] font-cinzel text-[9px] text-[#e5c783]">{i + 1}</span><div><h4 className="font-cinzel text-[8px] font-bold text-[#e8d3a6]">{title}</h4><p className="mt-1 font-cormorant text-[12px] leading-relaxed text-[#b6ad9b]">{desc}</p></div></div>)}
              </div>
            )}
          </section>
        </main>
        <footer className="shrink-0 border-t border-[#c9a45f]/20 bg-[#040912]/95 px-4 py-2 text-center sm:px-6">
          <span className="font-cinzel text-[7px] tracking-[.18em] text-[#777d7b]">ROYAL BACKGAMMON · OFFICIAL TOURNAMENT ARENA</span>
        </footer>
      </section>
    </div>
  );
}
