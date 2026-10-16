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
import {
  TournamentState,
  TournamentTierId,
  TournamentMatch,
  TOURNAMENT_TIERS,
} from '../network/tournamentTypes';
import { RoyalCrownIcon, WalletIcon } from './RoyalIcons';

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
      totalCollectedUsdt: 160,
      platformFeeUsdt: 24,
      prizePoolUsdt: 136,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-[820px] max-h-[94vh] rounded-xl border border-[#c8a668]/70 bg-gradient-to-b from-[#061911] via-[#04120c] to-[#020a06] p-4 sm:p-5 shadow-2xl flex flex-col text-[#e8dfd0] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#c8a668]/30 pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <RoyalCrownIcon className="w-5 h-5 text-[#f5dca8]" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-cinzel text-xs sm:text-sm font-bold tracking-[0.16em] text-[#f5dca8] uppercase">
                  ROYAL SWISS + KNOCKOUT CHAMPIONSHIP
                </h2>
                <span className="px-1.5 py-0.2 rounded bg-[#0b291d] border border-[#52f29c]/40 font-cinzel text-[7px] text-[#52f29c] font-bold">
                  USDT ESCROW
                </span>
              </div>
              <p className="font-cormorant text-[10px] text-[#a39e93]">
                مرحله سوئیسی (۵ راند ۵ امتیازی) + مرحله حذفی ۸ نفر برتر (۷، ۹ و ۱۱ امتیازی) با قانون کرافورد
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#c8a668] hover:text-white hover:bg-[#c8a668]/20 transition-colors cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tournament Tier Selector (5 USDT vs 10 USDT) */}
        <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
          {(['swiss_5', 'swiss_10'] as TournamentTierId[]).map((tId) => {
            const conf = TOURNAMENT_TIERS[tId];
            const active = selectedTier === tId;
            return (
              <button
                key={tId}
                type="button"
                onClick={() => setSelectedTier(tId)}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-[#0f2e20] border-[#f5dca8] shadow-md'
                    : 'bg-[#04120c]/70 border-[#c8a668]/30 hover:border-[#c8a668]/60 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-cinzel text-[9px] font-bold tracking-wider text-[#f5dca8]">
                    {conf.title}
                  </span>
                  <span className="font-cinzel text-[8px] font-bold text-[#52f29c]">
                    ENTRY: {conf.entryFeeUsdt} USDT
                  </span>
                </div>
                <div className="flex items-center justify-between text-[8.5px] text-[#8e8a80] font-cormorant">
                  <span>{conf.persianTitle}</span>
                  <span className="text-[#e2c285] font-cinzel font-semibold">
                    PRIZE POOL: 85% (Up to {(conf.entryFeeUsdt * conf.maxParticipants * 0.85).toFixed(0)} USDT)
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Status & Financial Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-lg bg-[#020a06] border border-[#c8a668]/35 mb-3 shrink-0">
          <div>
            <span className="font-cinzel text-[7px] text-[#8e8a80] block">PARTICIPANTS (شرکت‌کنندگان)</span>
            <span className="font-cinzel text-[11px] font-bold text-white tabular-nums">
              {currentTourn.participants.length} / {currentTourn.config.maxParticipants}
            </span>
          </div>
          <div>
            <span className="font-cinzel text-[7px] text-[#8e8a80] block">PRIZE POOL (۸۵٪ جوایز)</span>
            <span className="font-cinzel text-[11px] font-bold text-[#52f29c] tabular-nums">
              {currentTourn.prizePoolUsdt.toFixed(2)} USDT
            </span>
          </div>
          <div>
            <span className="font-cinzel text-[7px] text-[#8e8a80] block">PLATFORM FEE (۱۵٪ کارمزد)</span>
            <span className="font-cinzel text-[11px] font-bold text-[#c8a668] tabular-nums">
              {currentTourn.platformFeeUsdt.toFixed(2)} USDT
            </span>
          </div>
          <div>
            <span className="font-cinzel text-[7px] text-[#8e8a80] block">YOUR USDT BALANCE</span>
            <div className="flex items-center justify-between">
              <span className="font-cinzel text-[11px] font-bold text-[#ffe4a0] tabular-nums">
                {userUsdtBalance.toFixed(2)} USDT
              </span>
              <button
                type="button"
                onClick={onOpenWallet}
                className="text-[7.5px] text-[#52f29c] underline font-cinzel hover:text-white"
              >
                + DEPOSIT
              </button>
            </div>
          </div>
        </div>

        {/* Registration CTA & Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 rounded-lg bg-[#0b291d]/60 border border-[#52f29c]/40 mb-3 shrink-0">
          <div className="text-left w-full sm:w-auto">
            <span className="font-cinzel text-[9px] font-bold text-[#f5dca8] block">
              {isUserRegistered ? '✓ YOU ARE REGISTERED IN THIS TOURNAMENT' : 'JOIN OFFICIAL TOURNAMENT'}
            </span>
            <p className="font-cormorant text-[9px] text-[#a39e93]">
              {isUserRegistered
                ? 'ورودی شما در حساب اسکرو قفل شده است. به محض شروع دور اول میز بازی شما آماده خواهد شد.'
                : `ثبت‌نام نیازمند ${entryFee} USDT موجودی است. ورودی بلافاصله پس از ثبت‌نام قفل می‌شود.`}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {isUserRegistered ? (
              <button
                type="button"
                disabled={currentTourn.status !== 'registering'}
                onClick={() => onUnregisterTournament(currentTourn.id)}
                className="px-3 py-1 rounded bg-[#2e120d] hover:bg-[#4a1c14] border border-[#f87171]/50 font-cinzel text-[8px] font-bold text-[#fca5a5] cursor-pointer transition-colors"
              >
                CANCEL &amp; REFUND ({entryFee} USDT)
              </button>
            ) : (
              <button
                type="button"
                disabled={!hasEnoughBalance || currentTourn.participants.length >= currentTourn.config.maxParticipants}
                onClick={() => onRegisterTournament(selectedTier)}
                className={`px-4 py-1.5 rounded font-cinzel text-[8.5px] font-bold tracking-wider transition-all cursor-pointer ${
                  hasEnoughBalance
                    ? 'brass-button-surface border border-[#ead4a4]/80 text-[#140e05] shadow-md hover:scale-[1.02]'
                    : 'bg-[#181a19] border border-white/20 text-[#686a68] cursor-not-allowed'
                }`}
              >
                {hasEnoughBalance
                  ? `REGISTER & LOCK ${entryFee} USDT`
                  : `INSUFFICIENT BALANCE (NEED ${entryFee} USDT)`}
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-[#c8a668]/30 mb-3 shrink-0">
          {[
            { id: 'standings', label: 'SWISS STANDINGS (جدول رده‌بندی)' },
            { id: 'pairings', label: 'ROUNDS & PAIRINGS (راندها و نتایج)' },
            { id: 'bracket', label: 'KNOCKOUT FINALS (براکت حذفی ۸ نفر)' },
            { id: 'rules', label: 'RULES & PROVABLY FAIR (قوانین و ضدتقلب)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-2.5 py-1 font-cinzel text-[8px] font-bold tracking-wider transition-colors cursor-pointer border-b-2 ${
                activeTab === tab.id
                  ? 'border-[#f5dca8] text-[#f5dca8]'
                  : 'border-transparent text-[#8e8a80] hover:text-[#cbbca0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* TAB 1: SWISS STANDINGS */}
          {activeTab === 'standings' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[7.5px] text-[#8e8a80] font-cinzel px-2">
                <span>TOP 8 ADVANCE TO SINGLE ELIMINATION FINALS</span>
                <span>BUCHHOLZ TIEBREAK APPLIED</span>
              </div>
              <div className="rounded-lg border border-[#c8a668]/30 overflow-hidden bg-[#020a06]/80">
                <table className="w-full text-left border-collapse text-[8.5px]">
                  <thead>
                    <tr className="border-b border-[#c8a668]/30 bg-[#061911] font-cinzel text-[#c8a668]">
                      <th className="p-2">#</th>
                      <th className="p-2">PLAYER</th>
                      <th className="p-2">ELO</th>
                      <th className="p-2">SWISS PTS</th>
                      <th className="p-2">BUCHHOLZ</th>
                      <th className="p-2">DIFF</th>
                      <th className="p-2">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedParticipants.map((p, idx) => {
                      const isTop8 = idx < 8;
                      const isMe = p.userId === userId;
                      return (
                        <tr
                          key={p.userId}
                          className={`border-b border-white/5 transition-colors ${
                            isMe
                              ? 'bg-[#0f2e20] text-white font-bold'
                              : isTop8
                              ? 'hover:bg-[#061911]/60'
                              : 'opacity-70'
                          }`}
                        >
                          <td className="p-2 font-cinzel tabular-nums">{idx + 1}</td>
                          <td className="p-2 font-medium">
                            <span className="text-[#f5dca8]">{p.username}</span>
                            {isMe && <span className="ml-1 text-[7px] text-[#52f29c]">(YOU)</span>}
                          </td>
                          <td className="p-2 font-cinzel tabular-nums text-[#a39e93]">{p.rating}</td>
                          <td className="p-2 font-cinzel font-bold text-[#52f29c] tabular-nums">
                            {p.swissPoints}W
                          </td>
                          <td className="p-2 font-cinzel tabular-nums text-[#e2c285]">{p.buchholz}</td>
                          <td className="p-2 font-cinzel tabular-nums">
                            {p.matchPointsWon - p.matchPointsConceded > 0 ? '+' : ''}
                            {p.matchPointsWon - p.matchPointsConceded}
                          </td>
                          <td className="p-2 font-cinzel">
                            {isTop8 ? (
                              <span className="px-1.5 py-0.5 rounded bg-[#0b291d] border border-[#52f29c]/40 text-[#52f29c] text-[7px]">
                                TOP 8 QUALIFIED
                              </span>
                            ) : (
                              <span className="text-[#8e8a80] text-[7px]">ACTIVE</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PAIRINGS & ROUNDS */}
          {activeTab === 'pairings' && (
            <div className="space-y-3">
              {/* Round Selector Tabs */}
              <div className="flex items-center gap-1.5 pb-1 border-b border-[#c8a668]/20">
                {[1, 2, 3, 4, 5].map((rnd) => (
                  <button
                    key={rnd}
                    type="button"
                    onClick={() => setSelectedRound(rnd)}
                    className={`px-3 py-1 rounded font-cinzel text-[8px] font-bold cursor-pointer transition-colors ${
                      selectedRound === rnd
                        ? 'bg-[#c8a668] text-[#140e05]'
                        : 'bg-[#061911] text-[#a39e93] hover:text-white border border-[#c8a668]/30'
                    }`}
                  >
                    ROUND {rnd} (MATCH TO 5)
                  </button>
                ))}
              </div>

              {/* Matches List for Round */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {matchesForSelectedRound.length === 0 ? (
                  <div className="col-span-2 py-8 text-center text-[#8e8a80] font-cormorant text-xs">
                    این راند هنوز زوج‌بندی نشده است یا مسابقات در حال برگزاری راند قبلی هستند.
                  </div>
                ) : (
                  matchesForSelectedRound.map((m) => (
                    <div
                      key={m.matchId}
                      className="p-2.5 rounded-lg border border-[#c8a668]/30 bg-[#04120c] flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between text-[7.5px] text-[#8e8a80] font-cinzel mb-1.5">
                        <span>MATCH #{m.roundIndex} • TO {m.targetPoints} PTS</span>
                        {m.isCrawfordGame && (
                          <span className="text-[#e89080] font-bold">CRAWFORD GAME</span>
                        )}
                        <span
                          className={`font-bold ${
                            m.status === 'completed'
                              ? 'text-[#52f29c]'
                              : m.status === 'in_progress'
                              ? 'text-[#ffe4a0]'
                              : 'text-[#8e8a80]'
                          }`}
                        >
                          {m.status === 'completed' ? 'FINAL' : m.status === 'in_progress' ? 'LIVE' : 'UPCOMING'}
                        </span>
                      </div>

                      <div className="space-y-1 my-1">
                        <div className="flex items-center justify-between text-[9px]">
                          <span
                            className={
                              m.winnerUserId === m.player1.userId
                                ? 'font-bold text-[#52f29c]'
                                : 'text-[#f5dca8]'
                            }
                          >
                            {m.player1.username}
                          </span>
                          <span className="font-cinzel font-bold text-[#ffe4a0] tabular-nums">
                            {m.player1.score}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[9px]">
                          <span
                            className={
                              m.winnerUserId === m.player2.userId
                                ? 'font-bold text-[#52f29c]'
                                : 'text-[#f5dca8]'
                            }
                          >
                            {m.player2.username}
                          </span>
                          <span className="font-cinzel font-bold text-[#ffe4a0] tabular-nums">
                            {m.player2.score}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[7px] text-[#8e8a80] font-cinzel">
                          CUBE: {m.doublingCubeValue}X
                        </span>
                        <button
                          type="button"
                          onClick={() => onSpectateMatch(m)}
                          className="px-2 py-0.5 rounded bg-[#0b291d] hover:bg-[#124230] border border-[#52f29c]/40 font-cinzel text-[7px] text-[#52f29c] font-bold cursor-pointer transition-colors"
                        >
                          SPECTATE (تماشا)
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: KNOCKOUT BRACKET */}
          {activeTab === 'bracket' && (
            <div className="space-y-3">
              <div className="p-2 rounded bg-[#061911] border border-[#c8a668]/30 flex items-center justify-between text-[8px] font-cinzel">
                <span>QUARTERFINALS: TO 7 PTS</span>
                <span>SEMIFINALS: TO 9 PTS</span>
                <span className="text-[#f5dca8] font-bold">FINALS: TO 11 PTS</span>
              </div>

              {/* Bracket Tree */}
              <div className="grid grid-cols-3 gap-2">
                {/* Quarters (4 matches) */}
                <div className="space-y-2">
                  <span className="font-cinzel text-[7.5px] font-bold text-[#c8a668] block">
                    QUARTERFINALS (یک‌چهارم)
                  </span>
                  {(currentTourn.bracket?.quarters || [1, 2, 3, 4]).map((q: any, i: number) => (
                    <div
                      key={i}
                      className="p-2 rounded bg-[#04120c] border border-[#c8a668]/25 text-[8px] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate max-w-[80px]">{q.player1?.username || `Seed ${i + 1}`}</span>
                        <span className="font-cinzel font-bold text-[#52f29c]">{q.player1?.score ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="truncate max-w-[80px]">{q.player2?.username || `Seed ${8 - i}`}</span>
                        <span className="font-cinzel font-bold text-[#52f29c]">{q.player2?.score ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Semis (2 matches) */}
                <div className="space-y-2">
                  <span className="font-cinzel text-[7.5px] font-bold text-[#c8a668] block">
                    SEMIFINALS (نیمه‌نهایی)
                  </span>
                  {(currentTourn.bracket?.semis || [1, 2]).map((s: any, i: number) => (
                    <div
                      key={i}
                      className="p-2.5 rounded bg-[#04120c] border border-[#c8a668]/35 text-[8.5px] space-y-1.5 my-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate max-w-[90px]">{s.player1?.username || `Winner QF${i * 2 + 1}`}</span>
                        <span className="font-cinzel font-bold text-[#52f29c]">{s.player1?.score ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="truncate max-w-[90px]">{s.player2?.username || `Winner QF${i * 2 + 2}`}</span>
                        <span className="font-cinzel font-bold text-[#52f29c]">{s.player2?.score ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Finals (1 match) */}
                <div className="space-y-2">
                  <span className="font-cinzel text-[7.5px] font-bold text-[#ffe4a0] block">
                    CHAMPIONSHIP FINAL (فینال)
                  </span>
                  <div className="p-3 rounded-lg bg-gradient-to-b from-[#0f2e20] to-[#04120c] border-2 border-[#f5dca8] text-[9px] space-y-2 my-5 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#f5dca8]">
                        {currentTourn.bracket?.final?.player1?.username || 'Finalist 1'}
                      </span>
                      <span className="font-cinzel font-bold text-[#52f29c] text-xs">
                        {currentTourn.bracket?.final?.player1?.score ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#f5dca8]">
                        {currentTourn.bracket?.final?.player2?.username || 'Finalist 2'}
                      </span>
                      <span className="font-cinzel font-bold text-[#52f29c] text-xs">
                        {currentTourn.bracket?.final?.player2?.score ?? 0}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[#f5dca8]/30 flex items-center justify-between text-[7.5px] text-[#52f29c] font-cinzel font-bold">
                      <span>CHAMPION: 40% USDT</span>
                      <span>RUNNER-UP: 22%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RULES & PROVABLY FAIR */}
          {activeTab === 'rules' && (
            <div className="space-y-2.5 text-[8.5px] text-[#a39e93] font-cormorant leading-relaxed p-2 rounded-lg bg-[#020a06] border border-[#c8a668]/30">
              <h4 className="font-cinzel text-[9.5px] text-[#f5dca8] font-bold">
                قوانین رسمی و ساختار مالی تورنمنت‌های سوئیسی رویال
              </h4>
              <p>
                <strong>۱. ساختار مسابقات:</strong> مرحله مقدماتی شامل ۵ راند سوئیسی است که در هر راند بازیکنان با
                امتیاز برابر به مصاف هم می‌روند (مسابقه تا ۵ امتیاز). ۸ نفر برتر جدول راهی مرحله حذفی تک‌حذفی می‌شوند.
              </p>
              <p>
                <strong>۲. قانون کرافورد (Crawford Rule):</strong> زمانی که یکی از بازیکنان به ۱ امتیاز مانده به برد
                مسابقه می‌رسد (مثلاً امتیاز ۴ در بازی ۵ امتیازی)، دست بعدی دست کرافورد نامیده می‌شود و استفاده از
                مکعب دوبرابر ممنوع است. در دست‌های بعد از آن مکعب مجدداً فعال می‌شود.
              </p>
              <p>
                <strong>۳. توزیع جوایز تتر (۸۵٪ به بازیکنان):</strong>
                <br />
                • مقام اول (قهرمان): ۴۰٪ استخر جوایز
                <br />
                • مقام دوم (نایب قهرمان): ۲۲٪ استخر جوایز
                <br />
                • مقام‌های سوم و چهارم: ۱۰٪ به هر کدام (مجموعاً ۲۰٪)
                <br />
                • مقام‌های پنجم تا هشتم: ۴.۵٪ به هر کدام (مجموعاً ۱۸٪)
                <br />
                • ۱۵٪ کارمزد پلتفرم و نگهداری سرورها
              </p>
              <p>
                <strong>۴. سیستم تاس‌های منصفانه (Provably Fair):</strong> تمامی پرتاب‌های تاس با استفاده از ترکیب
                هش امنیتی سرور (Server Seed)، کلید کاربری (Client Seed) و نانس بازی از طریق الگوریتم HMAC-SHA256 تولید
                می‌شوند و بعد از اتمام مسابقه قابل ممیزی ریاضی هستند.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
