import React from 'react';
import { TournamentMatch } from '../network/tournamentTypes';

interface MatchEndModalProps {
  isOpen: boolean;
  onClose: () => void;
  winner: 'light' | 'dark' | null;
  victoryBanner: string | null;
  isTournamentMatch: boolean;
  tournamentMatch?: TournamentMatch;
  prizeAwarded?: number;
  onPlayAgain: () => void;
}

export function MatchEndModal({
  isOpen,
  onClose,
  winner,
  victoryBanner,
  isTournamentMatch,
  tournamentMatch,
  prizeAwarded,
  onPlayAgain,
}: MatchEndModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm rounded-xl border border-[#c8a668] bg-[#061911] p-6 shadow-2xl text-center">
        <h2 className="font-cinzel text-xl font-bold text-[#f5dca8] uppercase mb-4">
          {winner ? 'MATCH FINISHED' : 'MATCH ABORTED'}
        </h2>
        
        <p className="font-cormorant text-lg text-[#e8dfd0] mb-6">
          {victoryBanner}
        </p>

        {isTournamentMatch && tournamentMatch && (
          <div className="mb-6 p-4 rounded-lg bg-[#04120c] border border-[#52f29c]/30">
            <p className="font-cinzel text-xs text-[#52f29c] font-bold mb-1">TOURNAMENT STATUS</p>
            <p className="font-cormorant text-sm text-[#e8dfd0]">
              Match {tournamentMatch.matchId} completed in {tournamentMatch.stage} stage.
            </p>
            {prizeAwarded && (
                <p className="font-cinzel text-sm font-bold text-[#f5dca8] mt-2">PRIZE: {prizeAwarded} USDT</p>
            )}
          </div>
        )}

        <button
          onClick={() => {
            onPlayAgain();
            onClose();
          }}
          className="w-full py-3 rounded-lg bg-[#c8a668] text-[#140e05] font-cinzel font-bold tracking-widest hover:bg-[#f5dca8] transition-colors"
        >
          {isTournamentMatch ? 'RETURN TO LOBBY' : 'PLAY AGAIN'}
        </button>
      </div>
    </div>
  );
}
