import React from 'react';
import { ONLINE_TIERS, OnlineTier } from '../network/multiplayerTypes';
import { RoyalCrownIcon, WalletIcon } from './RoyalIcons';

interface OnlineTiersModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerLevel: number;
  playerRating: number;
  usdtBalance: number;
  onSelectTier: (tier: OnlineTier) => void;
  onOpenWallet: () => void;
}

export function OnlineTiersModal({
  isOpen,
  onClose,
  playerLevel,
  playerRating,
  usdtBalance,
  onSelectTier,
  onOpenWallet,
}: OnlineTiersModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-[540px] max-h-[92vh] rounded-xl border border-[#c8a668]/70 bg-gradient-to-b from-[#061911] via-[#04120c] to-[#020a06] p-4 shadow-2xl flex flex-col text-[#e8dfd0] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#c8a668]/30 pb-2.5 mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <RoyalCrownIcon className="w-4 h-3.5 text-[#c8a668]" />
            <div>
              <h2 className="font-cinzel text-[11px] font-semibold tracking-[0.18em] text-[#f5dca8] uppercase">
                ONLINE TOURNAMENT TIERS (۵ سطح مسابقات آنلاین)
              </h2>
              <p className="font-cormorant text-[10px] text-[#a39e93]">
                Real 2-Player Matches • USDT Entry &amp; Prize Pools • ELO Rating
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-[#c8a668] hover:text-white hover:bg-[#c8a668]/20 transition-colors cursor-pointer text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Player Status Bar */}
        <div className="mb-3 px-3 py-2 rounded-lg bg-[#020a06] border border-[#c8a668]/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <span className="font-cinzel text-[7px] tracking-wider text-[#8e8a80] block">
                YOUR LEVEL
              </span>
              <span className="font-cinzel text-[11px] font-bold text-[#52f29c] tabular-nums">
                LEVEL {playerLevel}
              </span>
            </div>
            <div className="h-6 w-[1px] bg-[#c8a668]/25" />
            <div>
              <span className="font-cinzel text-[7px] tracking-wider text-[#8e8a80] block">
                GLOBAL ELO
              </span>
              <span className="font-cinzel text-[11px] font-bold text-[#f5dca8] tabular-nums">
                {playerRating} PTS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="font-cinzel text-[7px] tracking-wider text-[#8e8a80] block">
                USDT BALANCE
              </span>
              <span className="font-cinzel text-[11px] font-bold text-[#f5dca8] tabular-nums">
                {usdtBalance.toFixed(2)} USDT
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenWallet();
              }}
              className="px-2 py-1 rounded bg-[#0a271b] border border-[#c8a668]/50 hover:bg-[#113828] text-[#e3c485] font-cinzel text-[7.5px] font-semibold tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
            >
              <WalletIcon className="w-2.5 h-2.5" />
              DEPOSIT
            </button>
          </div>
        </div>

        {/* 5 Tiers Cards List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[360px]">
          {ONLINE_TIERS.map((tier) => {
            const isLevelEligible =
              playerLevel >= tier.minLevel &&
              (tier.maxLevel === 999 || playerLevel <= tier.maxLevel);
            const hasEnoughBalance = usdtBalance >= tier.entryFeeUsdt;

            return (
              <div
                key={tier.id}
                className={`relative rounded-lg border p-3 transition-all ${
                  isLevelEligible
                    ? 'border-[#c8a668]/50 bg-gradient-to-r from-[#081e13] to-[#04120a] hover:border-[#f5dca8]'
                    : 'border-[#444]/40 bg-[#040e08]/60 opacity-85'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Left Tier Badge & Names */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      style={{ borderColor: tier.color }}
                      className="w-10 h-10 rounded-full border-2 bg-[#020a06] flex flex-col items-center justify-center shrink-0 shadow-md"
                    >
                      <span
                        style={{ color: tier.color }}
                        className="font-cinzel text-[7px] font-extrabold tracking-tighter"
                      >
                        {tier.badge}
                      </span>
                      <span className="font-cinzel text-[10px] font-black text-white">
                        {tier.entryFeeUsdt}$
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-cinzel text-[10.5px] font-bold text-[#f5dca8] truncate">
                          {tier.name}
                        </h3>
                        <span className="font-cinzel text-[7.5px] px-1.5 py-0.2 rounded bg-[#020d07] border border-[#c8a668]/30 text-[#e8d5b0]">
                          {tier.persianName}
                        </span>
                        {tier.isLeague && (
                          <span className="font-cinzel text-[7px] font-bold px-1.5 py-0.2 rounded bg-[#7a2214]/60 border border-[#f56565]/60 text-[#fed7d7]">
                            🏆 ۱۰-PLAYER LEAGUE
                          </span>
                        )}
                      </div>
                      <p className="font-cormorant text-[9.5px] text-[#a39e93] leading-tight mt-0.5">
                        Levels {tier.minLevel} – {tier.maxLevel === 999 ? '∞' : tier.maxLevel}{' '}
                        • Prize: <span className="text-[#52f29c] font-semibold">{tier.prizePoolUsdt} USDT</span>
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[8px] font-cinzel text-[#d4b26f] bg-[#030e08] px-1.5 py-0.5 rounded border border-[#c8a668]/20">
                          قانون راندها: {tier.matchFormat}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action Button */}
                  <div className="shrink-0 text-right">
                    <button
                      type="button"
                      disabled={!hasEnoughBalance}
                      onClick={() => onSelectTier(tier)}
                      className={`px-3 py-1.5 rounded font-cinzel text-[8.5px] font-bold tracking-wider transition-all cursor-pointer ${
                        hasEnoughBalance
                          ? 'brass-button-surface border border-[#fff0c4] text-[#140e05] hover:brightness-110 active:scale-95 shadow-md'
                          : 'bg-[#1a0f0b] border border-[#8a4235] text-[#d67b6f] cursor-not-allowed'
                      }`}
                    >
                      {hasEnoughBalance ? `PLAY (${tier.entryFeeUsdt} USDT)` : 'LOW BALANCE'}
                    </button>
                    {!hasEnoughBalance && (
                      <span className="block text-[7px] font-cinzel text-[#d67b6f] mt-0.5">
                        Requires {tier.entryFeeUsdt} USDT
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
