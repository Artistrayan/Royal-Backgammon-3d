/**
 * AI Opponent Difficulty & Personality Selection Modal
 *
 * Implements the 3 exact personas requested:
 * 1. Complete Beginner (مبتدی): 60-70% error, plays randomly, leaves blots, ignores cube, fast & careless
 * 2. Novice (نوآموز): 40-50% error, hits & bears off, positional blunders, poor cube
 * 3. Intermediate (متوسط): 25-35% error, basic strategy (points/primes), occasional mistakes
 * 4. Grandmaster (استاد بزرگ رویال): Full 2-ply tournament lookahead
 */

import React from 'react';
import palaceNightStageBg from '../assets/images/royal_palace_night_stage_1792268375096.jpg';
import {
  AIDifficulty,
  AI_DIFFICULTY_PROFILES,
} from '../engine/aiPersonalityEngine';

interface AIDifficultyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDifficulty: AIDifficulty;
  onSelectDifficulty: (difficulty: AIDifficulty) => void;
}

export function AIDifficultyModal({
  isOpen,
  onClose,
  selectedDifficulty,
  onSelectDifficulty,
}: AIDifficultyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in">
      <img src={palaceNightStageBg} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-35" />
      <div className="pointer-events-none absolute inset-0 bg-[#020611]/90" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(203,161,75,.18),transparent_55%)]" />
      <div className="relative w-full max-w-[min(94vw,780px)] max-h-[92vh] rounded-[26px] border border-[#d7b66d]/55 bg-gradient-to-b from-[#101b2d]/98 via-[#080f1c]/98 to-[#030812]/98 shadow-[0_24px_90px_rgba(0,0,0,.72),inset_0_1px_0_rgba(255,225,160,.14)] backdrop-blur-2xl p-4 sm:p-5 shadow-2xl flex flex-col text-[#e8dfd0] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#c8a668]/30 pb-3 mb-3 shrink-0">
          <div>
            <h2 className="font-cinzel text-xs sm:text-sm font-bold tracking-[0.16em] text-[#f5dca8] uppercase">
              SELECT AI OPPONENT DIFFICULTY (سطح هوش مصنوعی)
            </h2>
            <p className="font-cormorant text-[10px] text-[#a39e93]">
              انتخاب شخصیت و قدرت حریف تمرینی: مبتدی (۶۰-۷۰٪ خطا)، نوآموز، متوسط یا استاد بزرگ
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

        {/* AI Profiles List */}
        <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
          {(['beginner', 'novice', 'intermediate', 'grandmaster'] as AIDifficulty[]).map((dId) => {
            const p = AI_DIFFICULTY_PROFILES[dId];
            const isSelected = selectedDifficulty === dId;
            return (
              <div
                key={dId}
                onClick={() => {
                  onSelectDifficulty(dId);
                  onClose();
                }}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1a2a43] border-[#f5dca8] shadow-md ring-1 ring-[#f5dca8]'
                    : 'bg-[#070f1c] border-[#c8a668]/30 hover:border-[#c8a668]/60 hover:bg-[#091426]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-cinzel text-xs font-bold tracking-wider"
                      style={{ color: p.themeColor }}
                    >
                      {p.name}
                    </span>
                    <span className="font-cinzel text-[7px] text-[#8e8a80]">
                      ({p.persianName})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 rounded bg-black/50 border border-white/10 font-cinzel text-[7px] text-[#f5dfaa]">
                      ERROR RATE: {p.errorRate}
                    </span>
                    {isSelected && (
                      <span className="px-1.5 py-0.2 rounded bg-[#d9b96f]/20 border border-[#d9b96f]/60 font-cinzel text-[7px] text-[#d9b96f] font-bold">
                        SELECTED
                      </span>
                    )}
                  </div>
                </div>

                <div className="font-cormorant text-[9.5px] text-[#e2c285] mb-1.5 font-medium">
                  {p.persianTagline}
                </div>

                <p className="font-cormorant text-[9px] text-[#a39e93] leading-relaxed mb-2">
                  {p.persianDescription}
                </p>

                <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[7px] font-cinzel text-[#8e8a80]">
                  <span>DECISION PACE: {p.moveDelayMs}MS</span>
                  <span className="text-[#c8a668]">CLICK TO PLAY WITH {p.badge}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
