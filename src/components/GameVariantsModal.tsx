import React from 'react';
import { GAME_VARIANTS, GameVariantId } from '../engine/gameRules';

interface GameVariantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVariant: GameVariantId;
  onSelectVariant: (variantId: GameVariantId) => void;
}

const VARIANT_PRESENTATION: Record<GameVariantId, {
  eyebrow: string;
  shortDescription: string;
  pace: string;
  accent: string;
  glow: string;
  icon: 'classic' | 'long' | 'hyper';
}> = {
  standard: {
    eyebrow: 'THE ORIGINAL',
    shortDescription: 'Classic international rules with hits and the doubling cube.',
    pace: 'STRATEGIC',
    accent: '#e6c47d',
    glow: 'rgba(230,196,125,.16)',
    icon: 'classic',
  },
  narde: {
    eyebrow: 'THE LONG GAME',
    shortDescription: 'Same-direction movement. No hitting. Block every occupied point.',
    pace: 'TACTICAL',
    accent: '#78d8c7',
    glow: 'rgba(120,216,199,.15)',
    icon: 'long',
  },
  hypergammon: {
    eyebrow: 'THE FAST GAME',
    shortDescription: 'Three checkers each. Short, intense games with bold decisions.',
    pace: 'HIGH SPEED',
    accent: '#e68c9a',
    glow: 'rgba(230,140,154,.16)',
    icon: 'hyper',
  },
};

function VariantEmblem({ kind, color }: { kind: 'classic' | 'long' | 'hyper'; color: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-12 w-12 sm:h-14 sm:w-14" fill="none">
      <circle cx="32" cy="32" r="27" stroke={color} strokeOpacity=".34" />
      <circle cx="32" cy="32" r="21" stroke={color} strokeOpacity=".2" strokeDasharray="2 4" />
      {kind === 'classic' && <>
        <path d="M17 18h30v28H17z" stroke={color} strokeWidth="1.5" opacity=".8" />
        <path d="M32 18v28M17 25l7 7-7 7M47 25l-7 7 7 7" stroke={color} strokeWidth="1.5" />
        <circle cx="24" cy="25" r="3.5" fill={color} /><circle cx="40" cy="39" r="3.5" fill={color} />
      </>}
      {kind === 'long' && <>
        <path d="M20 15c14 5 14 29 28 34M44 15C30 20 30 44 16 49" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx="20" cy="15" r="3.5" fill={color} /><circle cx="44" cy="49" r="3.5" fill={color} />
        <path d="m38 43 6 6-8 1" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </>}
      {kind === 'hyper' && <>
        <path d="m34 12-16 23h12l-2 17 18-26H34l0-14Z" fill={color} fillOpacity=".16" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="18" cy="19" r="2" fill={color} /><circle cx="47" cy="44" r="2" fill={color} />
      </>}
    </svg>
  );
}

export function GameVariantsModal({
  isOpen,
  onClose,
  selectedVariant,
  onSelectVariant,
}: GameVariantsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02050c]/90 p-0 backdrop-blur-xl animate-fade-in sm:p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(196,157,86,.16),transparent_55%)]" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="variants-title"
        className="relative flex h-[100dvh] w-full max-w-[760px] flex-col overflow-hidden border-0 bg-[linear-gradient(155deg,#111b2a_0%,#08111e_48%,#040912_100%)] text-[#f1eadc] shadow-[0_28px_100px_rgba(0,0,0,.75)] sm:h-auto sm:max-h-[min(92dvh,820px)] sm:rounded-[28px] sm:border sm:border-[#c7a76d]/30"
      >
        <header className="relative shrink-0 border-b border-white/[.08] px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))] sm:px-6 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 font-cinzel text-[8px] font-bold tracking-[.32em] text-[#c8aa70]">ROYAL BACKGAMMON</p>
              <h2 id="variants-title" className="font-cinzel text-lg font-black tracking-[.08em] text-[#fff3d7] sm:text-2xl">SPECIAL EDITIONS</h2>
              <p className="mt-1 text-[10px] tracking-[.08em] text-[#929eae] sm:text-xs">CHOOSE YOUR RULESET</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close game variants" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-lg text-[#d7c59f] transition hover:border-[#d7b66d]/50 hover:bg-white/[.08]">×</button>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c7a76d]/45 to-transparent" />
            <span className="font-cinzel text-[7px] tracking-[.28em] text-[#8b96a5]">THREE WAYS TO PLAY</span>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c7a76d]/45 to-transparent" />
          </div>
        </header>

        <main className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4 sm:grid sm:grid-cols-3 sm:gap-3 sm:space-y-0 sm:px-6 sm:py-5">
          {(['standard', 'narde', 'hypergammon'] as GameVariantId[]).map((vId, index) => {
            const variant = GAME_VARIANTS[vId];
            const view = VARIANT_PRESENTATION[vId];
            const active = selectedVariant === vId;
            return (
              <button
                key={vId}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  onSelectVariant(vId);
                  onClose();
                }}
                className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-[20px] border p-3 text-left transition-all duration-200 sm:min-h-[310px] sm:flex-col sm:items-stretch sm:p-4 ${active ? 'border-[#e4c783]/80 bg-[linear-gradient(145deg,rgba(88,68,35,.48),rgba(15,27,42,.98)_58%)] shadow-[0_0_0_1px_rgba(228,199,131,.16),0_14px_34px_rgba(0,0,0,.3)]' : 'border-white/[.09] bg-[linear-gradient(145deg,rgba(25,38,54,.86),rgba(8,16,28,.98))] hover:border-white/20 hover:bg-[#142236]'}`}
              >
                <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full blur-3xl transition-opacity" style={{ background: view.glow, opacity: active ? 1 : .55 }} />
                <div className="relative flex h-[104px] w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-[#07101c]/80 sm:h-auto sm:w-full sm:aspect-[1.45/1]" style={{ borderColor: view.accent + '45', boxShadow: `inset 0 0 36px ${view.glow}` }}>
                  <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(circle at 50% 45%, ${view.glow}, transparent 68%)` }} />
                  <div className="relative"><VariantEmblem kind={view.icon} color={view.accent} /></div>
                  <span className="absolute bottom-2 right-2 font-cinzel text-[7px] tracking-[.2em]" style={{ color: view.accent }}>0{index + 1}</span>
                </div>

                <div className="relative min-w-0 flex-1 sm:flex sm:flex-1 sm:flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-cinzel text-[7px] font-bold tracking-[.2em]" style={{ color: view.accent }}>{view.eyebrow}</span>
                    {active && <span className="rounded-full border border-[#e4c783]/50 bg-[#e4c783]/10 px-2 py-0.5 font-cinzel text-[6px] font-bold tracking-wider text-[#f3dca7]">ACTIVE</span>}
                  </div>
                  <h3 className="mt-1 font-cinzel text-[13px] font-black leading-tight text-[#f5ead5] sm:mt-2 sm:text-sm">{variant.name}</h3>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#9eabba] sm:min-h-[58px] sm:text-[11px]">{view.shortDescription}</p>

                  <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3">
                    <span className="rounded-md border px-2 py-1 font-cinzel text-[7px] font-bold" style={{ borderColor: view.accent + '45', color: view.accent, background: view.glow }}>{variant.checkersPerPlayer} CHECKERS</span>
                    <span className="rounded-md border border-white/10 bg-white/[.04] px-2 py-1 font-cinzel text-[7px] font-bold text-[#aab5c2]">{view.pace}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[8px] text-[#778596] sm:mt-auto sm:pt-4">
                    <span>{variant.allowHitting ? 'Hitting' : 'No hitting'}</span>
                    <span className="text-[#465466]">•</span>
                    <span>{variant.allowDoublingCube ? 'Doubling cube' : 'No cube'}</span>
                    <span className="text-[#465466]">•</span>
                    <span>{variant.sameDirectionMovement ? 'Same direction' : 'Opposite direction'}</span>
                  </div>
                </div>

                <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] transition sm:absolute sm:right-3 sm:top-3" style={{ borderColor: active ? view.accent : 'rgba(255,255,255,.14)', color: active ? view.accent : '#667487', background: active ? view.glow : 'rgba(255,255,255,.03)' }}>{active ? '✓' : '↗'}</span>
              </button>
            );
          })}
        </main>

        <footer className="shrink-0 border-t border-white/[.07] px-4 py-3 text-center sm:px-6">
          <p className="font-cinzel text-[7px] tracking-[.2em] text-[#687789]">SELECT A MODE TO APPLY ITS GAME RULES</p>
        </footer>
      </section>
    </div>
  );
}
