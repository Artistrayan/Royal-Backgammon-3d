/**
 * Backgammon Game Variants Selection Modal
 *
 * Allows switching between:
 * 1. Standard Backgammon (تخته‌نرد استاندارد بین‌المللی)
 * 2. Narde / Long Backgammon (نرد لانگ / تخته طولانی روسی و قفقاز)
 * 3. Hypergammon (هایپرگامون - ۳ مهره‌ای پرهیجان)
 */

import React from 'react';
import { GAME_VARIANTS, GameVariantId } from '../engine/gameRules';

interface GameVariantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVariant: GameVariantId;
  onSelectVariant: (variantId: GameVariantId) => void;
}

export function GameVariantsModal({
  isOpen,
  onClose,
  selectedVariant,
  onSelectVariant,
}: GameVariantsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-[620px] max-h-[92vh] rounded-xl border border-[#c8a668]/70 bg-gradient-to-b from-[#061911] via-[#04120c] to-[#020a06] p-4 sm:p-5 shadow-2xl flex flex-col text-[#e8dfd0] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#c8a668]/30 pb-3 mb-3 shrink-0">
          <div>
            <h2 className="font-cinzel text-xs sm:text-sm font-bold tracking-[0.16em] text-[#f5dca8] uppercase">
              SELECT BACKGAMMON GAME VARIANT
            </h2>
            <p className="font-cormorant text-[10px] text-[#a39e93]">
              انتخاب سبک بازی: استاندارد بین‌المللی، نرد لانگ (تخته طولانی) و هایپرگامون ۳ مهره‌ای
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#c8a668] hover:text-white hover:bg-[#c8a668]/20 transition-colors cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Variants List */}
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {(['standard', 'narde', 'hypergammon'] as GameVariantId[]).map((vId) => {
            const v = GAME_VARIANTS[vId];
            const isSelected = selectedVariant === vId;
            return (
              <div
                key={vId}
                onClick={() => {
                  onSelectVariant(vId);
                  onClose();
                }}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0f2e20] border-[#f5dca8] shadow-lg ring-1 ring-[#f5dca8]'
                    : 'bg-[#04120c] border-[#c8a668]/30 hover:border-[#c8a668]/60 hover:bg-[#061911]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-cinzel text-xs font-bold text-[#f5dca8] tracking-wider">
                      {v.name}
                    </span>
                    {isSelected && (
                      <span className="px-1.5 py-0.5 rounded bg-[#52f29c]/20 border border-[#52f29c]/60 font-cinzel text-[7px] text-[#52f29c] font-bold">
                        ACTIVE VARIANT
                      </span>
                    )}
                  </div>
                  <span className="font-cinzel text-[8px] text-[#e2c285] font-semibold">
                    {v.checkersPerPlayer} CHECKERS
                  </span>
                </div>

                <div className="text-[9.5px] font-cormorant text-[#ffe4a0] mb-2 font-medium">
                  {v.persianName} • {v.tagline}
                </div>

                <p className="font-cormorant text-[9.5px] text-[#a39e93] leading-relaxed mb-2.5">
                  {v.persianDescription}
                </p>

                {/* Specific Rule Badges */}
                <div className="flex flex-wrap gap-1.5 text-[7px] font-cinzel">
                  <span
                    className={`px-1.5 py-0.5 rounded border ${
                      v.allowHitting
                        ? 'bg-[#0b291d] border-[#52f29c]/40 text-[#52f29c]'
                        : 'bg-[#2b100d] border-[#f87171]/40 text-[#fca5a5]'
                    }`}
                  >
                    {v.allowHitting ? '✓ HITTING ALLOWED (زدن تک‌مهره)' : '✕ NO HITTING (بدون زدن)'}
                  </span>

                  <span
                    className={`px-1.5 py-0.5 rounded border ${
                      v.allowDoublingCube
                        ? 'bg-[#0b291d] border-[#52f29c]/40 text-[#52f29c]'
                        : 'bg-[#181a19] border-white/20 text-[#8e8a80]'
                    }`}
                  >
                    {v.allowDoublingCube ? '✓ DOUBLING CUBE (کیوب دوبرابر)' : '✕ NO CUBE'}
                  </span>

                  <span className="px-1.5 py-0.5 rounded bg-[#1f1608] border border-[#c8a668]/30 text-[#e2c285]">
                    {v.sameDirectionMovement ? 'SAME DIRECTION (هم‌جهت)' : 'OPPOSITE DIRECTION (مخالف)'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
