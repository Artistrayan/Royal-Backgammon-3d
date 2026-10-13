import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (matchedOpponent) {
      setCountdown(2);
      const timer = window.setInterval(() => {
        setCountdown((c) => (c && c > 1 ? c - 1 : 0));
      }, 1000);
      return () => window.clearInterval(timer);
    } else {
      setCountdown(null);
    }
  }, [matchedOpponent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-[430px] rounded-xl border border-[#c8a668]/70 bg-gradient-to-b from-[#061911] via-[#04120c] to-[#020a06] p-5 shadow-2xl text-center text-[#e8dfd0]">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <RoyalCrownIcon className="w-5 h-4 text-[#c8a668]" />
          <h2 className="font-cinzel text-[13px] font-semibold tracking-[0.2em] text-[#f5dca8] uppercase">
            {matchedOpponent
              ? 'OPPONENT MATCHED'
              : tier
              ? `${tier.name}`
              : mode === 'quick_seat'
              ? 'QUICK SEAT • REAL OPPONENT'
              : 'ONLINE TOURNAMENT MATCHMAKING'}
          </h2>
        </div>

        {tier && (
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#020a06] border border-[#c8a668]/40 mb-3">
            <span
              style={{ color: tier.color }}
              className="font-cinzel text-[8.5px] font-bold tracking-wider"
            >
              {tier.badge}
            </span>
            <span className="font-cinzel text-[8.5px] text-[#f5dca8]">
              Entry: {tier.entryFeeUsdt} USDT • Prize: {tier.prizePoolUsdt} USDT
            </span>
          </div>
        )}

        {/* Status Banner */}
        <p className="font-cormorant text-[12px] text-[#a39e93] mb-4">
          {matchedOpponent
            ? `Real match confirmed! Launching 3D table in ${countdown ?? 1}s...`
            : tier
            ? `Searching for a real player in ${tier.persianName} (Entry ${tier.entryFeeUsdt} USDT)${dots}`
            : `Searching for a real player matching Level ${player.level}${dots}`}
        </p>

        {/* Players Comparison Arena */}
        <div className="grid grid-cols-2 gap-3 mb-4 items-center">
          {/* Current Player Card */}
          <div className="p-3 rounded-lg border border-[#c8a668]/40 bg-[#072015]/80 flex flex-col items-center">
            <span className="text-[9px] font-cinzel text-[#c8a668] tracking-widest mb-1">
              YOU
            </span>
            <div className="w-10 h-10 rounded-full border border-[#c8a668] bg-[#020d08] flex items-center justify-center font-cinzel text-xs font-bold text-[#f5dca8] mb-1">
              {player.username.slice(0, 2).toUpperCase()}
            </div>
            <span className="font-cinzel text-[11px] font-semibold text-[#f5dca8] truncate max-w-full">
              {player.username}
            </span>
            <span className="text-[9px] font-cinzel text-[#52f29c] font-medium tracking-wide">
              LEVEL {player.level} • {player.rating ?? 1200} ELO
            </span>
            <span className="text-[8px] font-cormorant text-[#a39e93]">
              {player.wins} Wins • {player.matchesPlayed} Matches
            </span>
          </div>

          {/* Opponent Card or Search Radar */}
          <div className="p-3 rounded-lg border border-[#c8a668]/40 bg-[#072015]/80 flex flex-col items-center min-h-[120px] justify-center">
            {matchedOpponent ? (
              <>
                <span className="text-[9px] font-cinzel text-[#52f29c] tracking-widest mb-1">
                  OPPONENT
                </span>
                <div className="w-10 h-10 rounded-full border border-[#52f29c] bg-[#020d08] flex items-center justify-center font-cinzel text-xs font-bold text-[#52f29c] mb-1 animate-pulse">
                  {matchedOpponent.username.slice(0, 2).toUpperCase()}
                </div>
                <span className="font-cinzel text-[11px] font-semibold text-[#f5dca8] truncate max-w-full">
                  {matchedOpponent.username}
                </span>
                <span className="text-[9px] font-cinzel text-[#52f29c] font-medium tracking-wide">
                  LEVEL {matchedOpponent.level} • {matchedOpponent.rating ?? 1200} ELO
                </span>
                <span className="text-[8px] font-cormorant text-[#a39e93]">
                  {matchedOpponent.wins} Wins • Real Player
                </span>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-2">
                <div className="relative w-10 h-10 mb-2">
                  <div className="absolute inset-0 rounded-full border-2 border-[#c8a668]/30 animate-ping opacity-75" />
                  <div className="relative w-10 h-10 rounded-full border border-[#c8a668]/50 bg-[#03110a] flex items-center justify-center">
                    <span className="text-sm">🎲</span>
                  </div>
                </div>
                <span className="font-cinzel text-[9.5px] text-[#c8a668] tracking-wider animate-pulse">
                  SEARCHING...
                </span>
                <span className="text-[8px] font-cormorant text-[#78746c] mt-0.5">
                  Looking for live players
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Live Network Details */}
        <div className="flex items-center justify-between text-[8px] font-cinzel text-[#8e8a80] px-2 mb-4 border-t border-[#c8a668]/20 pt-2">
          <span>REAL PLAYERS ONLINE: {onlineCount}</span>
          <span>QUEUE: {queueCount} IN POOL</span>
        </div>

        {/* Cancel Button */}
        {!matchedOpponent && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 rounded bg-[#0b2116] hover:bg-[#143625] border border-[#c8a668]/40 font-cinzel text-[9px] font-semibold tracking-widest text-[#e8dfd0] transition-colors cursor-pointer"
          >
            CANCEL SEARCH
          </button>
        )}
      </div>
    </div>
  );
}
