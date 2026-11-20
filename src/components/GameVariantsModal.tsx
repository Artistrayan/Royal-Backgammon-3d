/**
 * Backgammon Game Variants Selection Modal
 *
 * Allows switching between:
 * 1. Standard Backgammon (تخته‌نرد استاندارد بین‌المللی)
 * 2. Narde / Long Backgammon (نرد لانگ / تخته طولانی روسی و قفقاز)
 * 3. Hypergammon (هایپرگامون - ۳ مهره‌ای پرهیجان)
 */

import React from 'react';
import palaceNightStageBg from '../assets/images/royal_palace_night_stage_1792268375096.jpg';
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
    <div className="fixed inset-0 z-50 flex items-stretch justify-center p-0 bg-[#020611]/90 sm:items-center sm:p-4 backdrop-blur-md animate-fade-in">
      <img src={palaceNightStageBg} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-35" />
      <div className="pointer-events-none absolute inset-0 bg-[#020611]/90" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(203,161,75,.18),transparent_55%)]" />
      <div className="relative flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col rounded-none border-0 border-[#d7b66d]/55 bg-gradient-to-b from-[#101b2d]/98 via-[#080f1c]/98 to-[#030812]/98 p-4 text-[#e8dfd0] shadow-[0_24px_90px_rgba(0,0,0,.72),inset_0_1px_0_rgba(255,225,160,.14)] backdrop-blur-2xl overflow-hidden sm:h-[min(94dvh,920px)] sm:max-h-[94dvh] sm:max-w-[min(96vw,780px)] sm:rounded-[26px] sm:border sm:p-5">>
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
                    ? 'bg-[#1a2a43] border-[#f5dca8] shadow-lg ring-1 ring-[#f5dca8]'
                    : 'bg-[#070f1c] border-[#c8a668]/30 hover:border-[#c8a668]/60 hover:bg-[#091426]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-cinzel text-xs font-bold text-[#f5dca8] tracking-wider">
                      {v.name}
                    </span>
                    {isSelected && (
                      <span className="px-1.5 py-0.5 rounded bg-[#d9b96f]/20 border border-[#d9b96f]/60 font-cinzel text-[7px] text-[#d9b96f] font-bold">
                        ACTIVE VARIANT
                      </span>
                    )}
                  </div>
                  <span className="font-cinzel text-[8px] text-[#e2c285] font-semibold">
                    {v.checkersPerPlayer} CHECKERS
                  </span>
                </div>

                <div className="text-[9.5px] font-cormorant text-[#f5dfaa] mb-2 font-medium">
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
                        ? 'bg-[#172840] border-[#d9b96f]/40 text-[#d9b96f]'
                        : 'bg-[#171b25] border-[#c89c65]/40 text-[#e4cfa8]'
                    }`}
                  >
                    {v.allowHitting ? '✓ HITTING ALLOWED (زدن تک‌مهره)' : '✕ NO HITTING (بدون زدن)'}
                  </span>

                  <span
                    className={`px-1.5 py-0.5 rounded border ${
                      v.allowDoublingCube
                        ? 'bg-[#172840] border-[#d9b96f]/40 text-[#d9b96f]'
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
