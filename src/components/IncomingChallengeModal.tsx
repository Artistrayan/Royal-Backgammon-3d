import React from 'react';
import { FriendChallenge } from '../network/multiplayerTypes';
import { RoyalCrownIcon } from './RoyalIcons';

interface IncomingChallengeModalProps {
  challenge: FriendChallenge | null;
  onAccept: (challengeId: string) => void;
  onDecline: (challengeId: string) => void;
}

export function IncomingChallengeModal({
  challenge,
  onAccept,
  onDecline,
}: IncomingChallengeModalProps) {
  if (!challenge) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-[380px] rounded-lg border-2 border-[#f7d774] bg-gradient-to-b from-[#092217] via-[#05170f] to-[#020a06] p-5 shadow-2xl text-center text-[#e8dfd0] animate-bounce-short">
        <div className="flex items-center justify-center gap-2 mb-2">
          <RoyalCrownIcon className="w-5 h-4 text-[#f7d774]" />
          <h2 className="font-cinzel text-[12px] font-bold tracking-[0.2em] text-[#f7d774] uppercase">
            LIVE CHALLENGE RECEIVED!
          </h2>
        </div>

        <div className="my-4 p-3 rounded border border-[#c8a668]/40 bg-[#020c07]/80">
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-[#f7d774] bg-[#03130b] flex items-center justify-center font-cinzel text-sm font-bold text-[#f5dca8] mb-2 shadow-lg">
            {challenge.challenger.username.slice(0, 2).toUpperCase()}
          </div>
          <span className="font-cinzel text-[12px] font-semibold text-[#f5dca8] block">
            {challenge.challenger.username}
          </span>
          <span className="font-cinzel text-[9px] text-[#52f29c] font-medium tracking-wide">
            LEVEL {challenge.challenger.level} • {challenge.challenger.wins} WINS
          </span>
          <p className="font-cormorant text-[11px] text-[#c0b9ab] mt-2">Invited you to an Online Backgammon Match!</p>
          <p className="font-cinzel text-[11px] font-semibold text-[#f7d774] mt-2">Match amount: {Number(challenge.amountUsdt || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</p>
          {Number(challenge.amountUsdt || 0) > 0 && <p className="font-cormorant text-[10px] text-[#e89080] mt-1">Paid matches are not available yet. Do not send funds; choose a free match (0 USDT).</p>}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={Number(challenge.amountUsdt || 0) > 0}
            onClick={() => onAccept(challenge.challengeId)}
            className="flex-1 py-2 rounded brass-button-surface border border-[#ead4a4] font-cinzel text-[9.5px] font-bold tracking-[0.14em] text-[#140e05] cursor-pointer active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {Number(challenge.amountUsdt || 0) > 0 ? 'PAID MATCH UNAVAILABLE' : 'ACCEPT & PLAY'}
          </button>
          <button
            type="button"
            onClick={() => onDecline(challenge.challengeId)}
            className="px-4 py-2 rounded bg-[#200a06] hover:bg-[#33110a] border border-[#d66852]/60 font-cinzel text-[9px] font-semibold text-[#e89080] cursor-pointer transition-colors"
          >
            DECLINE
          </button>
        </div>
      </div>
    </div>
  );
}
