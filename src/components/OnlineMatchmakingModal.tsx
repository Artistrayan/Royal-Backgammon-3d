import React, { useEffect, useState } from 'react';
import { OnlineUser } from '../network/multiplayerTypes';
import { RoyalCrownIcon } from './RoyalIcons';

interface OnlineMatchmakingModalProps {
  isOpen: boolean;
  mode: 'online_match' | 'quick_seat';
  player: {
    username: string;
    level: number;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-[420px] rounded-lg border border-[#c8a668]/60 bg-gradient-to-b from-[#061911] via-[#04120c] to-[#020a06] p-5 shadow-2xl text-center text-[#e8dfd0]">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <RoyalCrownIcon className="w-5 h-4 text-[#c8a668]" />
          <h2 className="font-cinzel text-[13px] font-semibold tracking-[0.2em] text-[#f5dca8] uppercase">
            {matchedOpponent
              ? 'OPPONENT MATCHED'
              : mode === 'quick_seat'
              ? 'QUICK SEAT • REAL OPPONENT'
              : 'ONLINE TOURNAMENT MATCHMAKING'}
          </h2>
        </div>

        {/* Status Banner */}
        <p className="font-cormorant text-[12px] text-[#a39e93] mb-4">
          {matchedOpponent
            ? `Real match confirmed! Launching 3D table in ${countdown ?? 1}s...`
            : `Searching for a real player matching Level ${player.level}${dots}`}
        </p>

        {/* Players Comparison Arena */}
        <div className="grid grid-cols-2 gap-3 mb-4 items-center">
          {/* Current Player Card */}
          <div className="p-3 rounded border border-[#c8a668]/40 bg-[#072015]/80 flex flex-col items-center">
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
              LEVEL {player.level}
            </span>
            <span className="text-[8px] font-cormorant text-[#a39e93]">
              {player.wins} Wins • {player.matchesPlayed} Matches
            </span>
          </div>

          {/* Opponent Card or Search Radar */}
          <div className="p-3 rounded border border-[#c8a668]/40 bg-[#072015]/80 flex flex-col items-center min-h-[120px] justify-center">
            {matchedOpponent ? (
              <>
                <span className="text-[9px] font-cinzel text-[#f7d774] tracking-widest mb-1">
                  OPPONENT
                </span>
                <div className="w-10 h-10 rounded-full border border-[#f7d774] bg-[#020d08] flex items-center justify-center font-cinzel text-xs font-bold text-[#f7d774] mb-1">
                  {matchedOpponent.username.slice(0, 2).toUpperCase()}
                </div>
                <span className="font-cinzel text-[11px] font-semibold text-[#f5dca8] truncate max-w-full">
                  {matchedOpponent.username}
                </span>
                <span className="text-[9px] font-cinzel text-[#52f29c] font-medium tracking-wide">
                  LEVEL {matchedOpponent.level}
                </span>
                <span className="text-[8px] font-cormorant text-[#a39e93]">
                  {matchedOpponent.wins} Wins • Real Human Player
                </span>
              </>
            ) : (
              <div className="flex flex-col items-center py-2">
                <div className="relative w-10 h-10 mb-2">
                  <div className="absolute inset-0 rounded-full border border-[#c8a668]/30 animate-ping" />
                  <div className="w-full h-full rounded-full border-2 border-t-[#f5dca8] border-r-[#c8a668] border-b-transparent border-l-transparent animate-spin" />
                </div>
                <span className="text-[9px] font-cinzel text-[#c8a668] tracking-widest">
                  SEARCHING QUEUE
                </span>
                <span className="text-[8px] font-cormorant text-[#8e8a80]">
                  Level Bracket: {Math.max(1, player.level - 1)} - {player.level + 1}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Live Metrics */}
        <div className="flex items-center justify-around py-1.5 px-3 rounded bg-[#020a06]/90 border border-[#c8a668]/20 mb-4 text-[9px] font-cinzel text-[#a39e93]">
          <div>
            ONLINE PLAYERS:{' '}
            <span className="text-[#52f29c] font-semibold">{onlineCount}</span>
          </div>
          <div className="h-2.5 w-[1px] bg-[#c8a668]/30" />
          <div>
            IN QUEUE:{' '}
            <span className="text-[#f5dca8] font-semibold">{queueCount}</span>
          </div>
        </div>

        {/* Cancel Button */}
        {!matchedOpponent && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-1.5 rounded border border-[#c8a668]/40 bg-[#061810] hover:bg-[#0c2e1f] font-cinzel text-[9px] font-semibold tracking-[0.16em] text-[#e8dfd0] hover:text-white transition-colors cursor-pointer"
          >
            CANCEL MATCHMAKING
          </button>
        )}
      </div>
    </div>
  );
}
