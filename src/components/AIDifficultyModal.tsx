/**
 * Royal Practice Arena — AI opponent selection.
 * Preserves the existing difficulty IDs and AI engine integration.
 */
import React from 'react';
import palaceNightStageBg from '../assets/images/royal_palace_night_stage_1792268375096.jpg';
import { AIDifficulty, AI_DIFFICULTY_PROFILES } from '../engine/aiPersonalityEngine';

interface AIDifficultyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDifficulty: AIDifficulty;
  onSelectDifficulty: (difficulty: AIDifficulty) => void;
}

const LEVELS: Array<{ id: AIDifficulty; rank: string; title: string; summary: string; accent: string; glow: string; mark: string; skill: number }> = [
  { id: 'beginner', rank: '01', title: 'Beginner', summary: 'A relaxed table to learn the flow of the game.', accent: '#77b9ff', glow: 'rgba(71,153,255,.16)', mark: 'I', skill: 22 },
  { id: 'novice', rank: '02', title: 'Novice', summary: 'Build confidence against a developing opponent.', accent: '#63d4c2', glow: 'rgba(60,211,187,.14)', mark: 'II', skill: 42 },
  { id: 'intermediate', rank: '03', title: 'Club Player', summary: 'Test your timing, structure and tactical choices.', accent: '#e8bd70', glow: 'rgba(232,189,112,.15)', mark: 'III', skill: 68 },
  { id: 'advanced', rank: '04', title: 'Advanced', summary: 'Practice stronger positional and tactical decisions.', accent: '#60a5fa', glow: 'rgba(96,165,250,.16)', mark: 'IV', skill: 84 },
  { id: 'grandmaster', rank: '05', title: 'Royal Grandmaster', summary: 'Face the strongest strategic challenge.', accent: '#d6a4ff', glow: 'rgba(194,130,255,.16)', mark: 'V', skill: 98 },
];

export function AIDifficultyModal({ isOpen, onClose, selectedDifficulty, onSelectDifficulty }: AIDifficultyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/90 p-0 backdrop-blur-xl sm:p-4">
      <img src={palaceNightStageBg} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-25" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_12%,rgba(61,112,177,.22),transparent_48%),linear-gradient(180deg,rgba(2,8,18,.55),#030914_88%)]" />
      <section role="dialog" aria-modal="true" aria-labelledby="practice-title" className="relative flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col overflow-hidden border-0 bg-[#07111f]/95 text-[#f4eee2] shadow-[0_28px_100px_rgba(0,0,0,.75)] sm:h-[min(90dvh,790px)] sm:max-h-[90dvh] sm:max-w-[760px] sm:rounded-[28px] sm:border sm:border-[#b9955b]/35">
        <header className="relative shrink-0 px-5 pb-4 pt-[max(22px,env(safe-area-inset-top))] sm:px-7 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2"><span className="h-px w-7 bg-[#d7b66d]" /><span className="font-cinzel text-[8px] font-bold tracking-[.34em] text-[#c9aa70]">ROYAL CLUB</span></div>
              <h2 id="practice-title" className="mt-2 font-cinzel text-[22px] font-black tracking-[.12em] text-[#fff0ce] sm:text-[28px]">PRACTICE ARENA</h2>
              <p className="mt-1 text-[11px] tracking-[.08em] text-[#91a2b8] sm:text-xs">Choose your opponent</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close practice" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[.04] text-lg text-[#d8c49b] transition hover:border-[#d7b66d]/60 hover:bg-white/[.09]">×</button>
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#b9955b]/20 bg-[linear-gradient(105deg,rgba(28,48,73,.72),rgba(9,20,35,.72))] px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7b66d]/35 bg-[#d7b66d]/10 text-[#e8ca8b]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M12 2.8 19 6v5.2c0 4.5-2.8 7.8-7 10-4.2-2.2-7-5.5-7-10V6l7-3.2Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></svg>
            </div>
            <div className="min-w-0"><p className="font-cinzel text-[9px] font-bold tracking-[.16em] text-[#f0d9a8]">SOLO TRAINING</p><p className="mt-0.5 text-[10px] leading-relaxed text-[#9eafc2]">Play a full match on the royal 3D board against AI.</p></div>
            <span className="ml-auto shrink-0 rounded-full border border-[#62c8a1]/25 bg-[#62c8a1]/10 px-2.5 py-1 font-cinzel text-[7px] font-bold tracking-wider text-[#8be0bd]">VS AI</span>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-1 sm:px-7">
          <div className="mb-3 flex items-center justify-between"><span className="font-cinzel text-[8px] font-bold tracking-[.22em] text-[#8192a8]">SELECT SKILL LEVEL</span><span className="text-[9px] text-[#667b94]">5 AI profiles</span></div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
            {LEVELS.map((level) => {
              const profile = AI_DIFFICULTY_PROFILES[level.id];
              const active = selectedDifficulty === level.id;
              return (
                <button key={level.id} type="button" aria-pressed={active} onClick={() => { onSelectDifficulty(level.id); onClose(); }}
                  className={`group relative min-h-[132px] overflow-hidden rounded-[19px] border p-3.5 text-left transition-all duration-200 sm:min-h-[164px] sm:p-4 ${active ? 'border-[#e6c987]/80 bg-[linear-gradient(135deg,rgba(62,58,43,.58),rgba(13,29,47,.96)_70%)] shadow-[0_0_0_1px_rgba(230,201,135,.16),0_12px_30px_rgba(0,0,0,.24)]' : 'border-white/[.09] bg-[linear-gradient(145deg,rgba(22,39,59,.84),rgba(7,17,30,.96))] hover:border-white/20'}`}>
                  <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-3xl" style={{ background: level.glow }} />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-black/20 font-cinzel text-sm font-bold" style={{ color: level.accent, borderColor: level.accent + '55', boxShadow: `inset 0 0 20px ${level.glow}` }}>{level.mark}</div>
                      <div className="min-w-0"><div className="font-cinzel text-[7px] font-bold tracking-[.22em]" style={{ color: level.accent }}>LEVEL {level.rank}</div><h3 className="mt-1 truncate font-cinzel text-[12px] font-bold tracking-[.06em] text-[#f4ead8] sm:text-[13px]">{level.title}</h3></div>
                    </div>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] ${active ? 'border-[#e6c987]/70 bg-[#e6c987]/15 text-[#f5dca8]' : 'border-white/10 text-[#74869c]'}`}>{active ? '✓' : '＋'}</span>
                  </div>
                  <p className="relative mt-3 min-h-[28px] text-[10px] leading-relaxed text-[#a9b6c5]">{level.summary}</p>
                  <div className="relative mt-3 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2"><div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${level.skill}%`, background: level.accent }} /></div><span className="font-cinzel text-[7px] font-bold tabular-nums" style={{ color: level.accent }}>{level.skill}/100</span></div>
                    <span className="shrink-0 font-cinzel text-[7px] tracking-wider text-[#7f91a7]">{profile.errorRate} ERROR</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[.07] bg-black/15 px-3.5 py-3">
            <div><p className="font-cinzel text-[8px] font-bold tracking-[.16em] text-[#cdb783]">CURRENT OPPONENT</p><p className="mt-1 text-[10px] text-[#8fa0b4]">{AI_DIFFICULTY_PROFILES[selectedDifficulty].name} · {AI_DIFFICULTY_PROFILES[selectedDifficulty].moveDelayMs} ms move pace</p></div>
            <span className="rounded-lg border border-[#d7b66d]/25 bg-[#d7b66d]/[.07] px-2.5 py-1.5 font-cinzel text-[7px] font-bold tracking-wider text-[#e2c78f]">READY</span>
          </div>
        </main>
        <footer className="shrink-0 border-t border-white/[.07] px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 text-center sm:px-7 sm:pb-4"><p className="font-cinzel text-[7px] tracking-[.2em] text-[#667b92]">YOUR SELECTION STARTS A NEW PRACTICE MATCH</p></footer>
      </section>
    </div>
  );
}
