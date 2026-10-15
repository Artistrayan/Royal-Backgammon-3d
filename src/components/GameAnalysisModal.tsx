/**
 * Backgammon Smart Game Analysis & Performance Rating (PR) Modal
 *
 * Implements WBGF / XG Standard Performance Rating (PR) breakdown:
 * - Match PR score with official skill category (World Class, Master, Advanced, Intermediate, Casual)
 * - Error distribution (Best, Inaccuracies, Errors, Blunders)
 * - Move-by-move review with equity loss in millipoints and tactical coaching tips
 */

import React, { useState } from 'react';
import { MatchAnalysisSummary, AnalyzedDecision } from '../engine/gameAnalysisEngine';

interface GameAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: MatchAnalysisSummary;
}

export function GameAnalysisModal({
  isOpen,
  onClose,
  summary,
}: GameAnalysisModalProps) {
  const [selectedDecision, setSelectedDecision] = useState<AnalyzedDecision | null>(
    summary.decisions[0] || null
  );

  if (!isOpen) return null;

  const getPrColor = (pr: number) => {
    if (pr < 3.5) return '#52f29c';
    if (pr < 6.5) return '#c084fc';
    if (pr < 10.5) return '#60a5fa';
    if (pr < 16.0) return '#fbbf24';
    return '#f87171';
  };

  const getClassificationBadge = (c: string) => {
    switch (c) {
      case 'best':
        return { label: 'BEST MOVE', color: '#52f29c', bg: '#0b291d' };
      case 'good':
        return { label: 'GOOD', color: '#52f29c', bg: '#0b291d' };
      case 'inaccuracy':
        return { label: 'INACCURACY (-20mp)', color: '#fbbf24', bg: '#2b220d' };
      case 'error':
        return { label: 'ERROR (-50mp)', color: '#fb923c', bg: '#2e180d' };
      case 'blunder':
      default:
        return { label: 'BLUNDER (-100mp+)', color: '#f87171', bg: '#2b100d' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-[680px] max-h-[92vh] rounded-xl border border-[#c8a668]/70 bg-gradient-to-b from-[#061911] via-[#04120c] to-[#020a06] p-4 sm:p-5 shadow-2xl flex flex-col text-[#e8dfd0] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#c8a668]/30 pb-3 mb-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-cinzel text-xs sm:text-sm font-bold tracking-[0.16em] text-[#f5dca8] uppercase">
                SMART GAME ANALYSIS &amp; PR RATING
              </h2>
              <span className="px-1.5 py-0.2 rounded bg-[#0b291d] border border-[#52f29c]/40 font-cinzel text-[7px] text-[#52f29c] font-bold">
                XG STANDARD
              </span>
            </div>
            <p className="font-cormorant text-[10px] text-[#a39e93]">
              تحلیل هوشمند تصمیمات، محاسبه نرخ عملکرد (PR) و ممیزی حرکات بر اساس استانداردهای فدراسیون جهانی
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

        {/* PR Score Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-[#020a06] border border-[#c8a668]/35 mb-3 shrink-0">
          <div>
            <span className="font-cinzel text-[7px] text-[#8e8a80] block">PERFORMANCE RATING (PR)</span>
            <div className="flex items-baseline gap-1.5">
              <span
                className="font-cinzel text-lg font-bold tabular-nums"
                style={{ color: getPrColor(summary.performanceRating) }}
              >
                {summary.performanceRating}
              </span>
              <span className="font-cormorant text-[9px] text-[#a39e93]">/ 30.0</span>
            </div>
            <span className="text-[7.5px] font-cormorant text-[#ffe4a0] block leading-tight">
              {summary.persianSkillCategory}
            </span>
          </div>

          <div>
            <span className="font-cinzel text-[7px] text-[#8e8a80] block">DECISIONS ANALYZED</span>
            <span className="font-cinzel text-base font-bold text-white tabular-nums">
              {summary.totalDecisions} Moves
            </span>
            <span className="text-[7px] text-[#8e8a80] block font-cinzel">TOTAL DECISIONS</span>
          </div>

          <div>
            <span className="font-cinzel text-[7px] text-[#8e8a80] block">TOTAL EQUITY LOSS</span>
            <span className="font-cinzel text-base font-bold text-[#fca5a5] tabular-nums">
              -{summary.totalEquityLoss.toFixed(3)}
            </span>
            <span className="text-[7px] text-[#8e8a80] block font-cinzel">EQUITY LOSS</span>
          </div>

          <div>
            <span className="font-cinzel text-[7px] text-[#8e8a80] block">AVERAGE PIP LOSS</span>
            <span className="font-cinzel text-base font-bold text-[#e2c285] tabular-nums">
              {summary.averagePipWasted} Pips
            </span>
            <span className="text-[7px] text-[#8e8a80] block font-cinzel">WASTED PIPS</span>
          </div>
        </div>

        {/* Error Breakdown Badges */}
        <div className="grid grid-cols-4 gap-1.5 mb-3 shrink-0 text-center font-cinzel text-[7.5px]">
          <div className="p-1.5 rounded bg-[#0b291d] border border-[#52f29c]/40 text-[#52f29c]">
            <span className="font-bold block text-sm tabular-nums">{summary.bestMovesCount}</span>
            <span>BEST MOVES</span>
          </div>
          <div className="p-1.5 rounded bg-[#2b220d] border border-[#fbbf24]/40 text-[#fbbf24]">
            <span className="font-bold block text-sm tabular-nums">{summary.inaccuraciesCount}</span>
            <span>INACCURACIES</span>
          </div>
          <div className="p-1.5 rounded bg-[#2e180d] border border-[#fb923c]/40 text-[#fb923c]">
            <span className="font-bold block text-sm tabular-nums">{summary.errorsCount}</span>
            <span>ERRORS</span>
          </div>
          <div className="p-1.5 rounded bg-[#2b100d] border border-[#f87171]/40 text-[#f87171]">
            <span className="font-bold block text-sm tabular-nums">{summary.blundersCount}</span>
            <span>BLUNDERS</span>
          </div>
        </div>

        {/* Decisions List & Coaching Review */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <span className="font-cinzel text-[8px] text-[#8e8a80] block">
            MOVE-BY-MOVE REVIEW ({summary.decisions.length} DECISIONS):
          </span>
          {summary.decisions.length === 0 ? (
            <div className="p-6 text-center text-[#8e8a80] font-cormorant text-xs">
              تصمیمی در طول این دست ثبت نشده است. پس از بازی در برابر هوش مصنوعی یا بازیکن آنلاین، تحلیل کامل در اینجا نمایش داده می‌شود.
            </div>
          ) : (
            summary.decisions.map((d, idx) => {
              const badge = getClassificationBadge(d.classification);
              const isSelected = selectedDecision === d;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDecision(d)}
                  className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#0f2e20] border-[#f5dca8]'
                      : 'bg-[#04120c] border-[#c8a668]/25 hover:border-[#c8a668]/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-cinzel text-[8.5px] font-bold text-white">
                        MOVE #{d.moveNumber}
                      </span>
                      <span className="font-cinzel text-[7.5px] text-[#e2c285]">
                        DICE: [{d.diceRolled[0]}, {d.diceRolled[1]}]
                      </span>
                    </div>
                    <span
                      className="px-1.5 py-0.2 rounded font-cinzel text-[7px] font-bold border"
                      style={{
                        color: badge.color,
                        borderColor: `${badge.color}60`,
                        backgroundColor: badge.bg,
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[8px] font-cinzel my-1">
                    <div>
                      <span className="text-[#8e8a80] block text-[6.5px]">YOUR MOVE:</span>
                      <span className="text-[#f5dca8]">
                        PT {d.playerChosenStep.fromLoc} → {d.playerChosenStep.toLoc}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8e8a80] block text-[6.5px]">BEST AI MOVE:</span>
                      <span className="text-[#52f29c]">
                        PT {d.bestAiStep.fromLoc} → {d.bestAiStep.toLoc}
                      </span>
                    </div>
                  </div>

                  <p className="font-cormorant text-[9px] text-[#a39e93] leading-tight mt-1 border-t border-white/5 pt-1">
                    💡 {d.persianCoachingTip}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
