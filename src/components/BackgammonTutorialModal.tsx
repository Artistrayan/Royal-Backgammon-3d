import React from 'react';

interface BackgammonTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const lessons = [
  { number: '01', title: 'The board and setup', body: 'The board has 24 points. Each player starts with 15 checkers and moves them toward their own home board.' },
  { number: '02', title: 'Rolling and moving', body: 'Roll two dice. Each die gives a separate move. You may use both dice with one checker only when the resulting moves are legal.' },
  { number: '03', title: 'Making a point', body: 'Two or more checkers on a point form a made point. Your opponent cannot land on that point.' },
  { number: '04', title: 'Hitting and entering', body: 'A single checker is a blot. Landing on an opposing blot sends it to the bar. A checker on the bar must re-enter before other checkers can move.' },
  { number: '05', title: 'Bearing off', body: 'When all 15 of your checkers are in your home board, use the dice to bear them off. The first player to remove all checkers wins.' },
  { number: '06', title: 'Build a strategy', body: 'Protect blots, build connected made points, avoid leaving unnecessary gaps and think about your opponent’s next roll.' },
];

export function BackgammonTutorialModal({ isOpen, onClose }: BackgammonTutorialModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#020711]/95 p-0 backdrop-blur-xl sm:p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="tutorial-title" className="flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden border border-white/10 bg-[#081522] text-[#f5ead4] shadow-2xl sm:h-[min(90dvh,820px)] sm:rounded-3xl">
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 pb-4 pt-[max(16px,env(safe-area-inset-top))] sm:px-7 sm:pt-6">
          <div><p className="text-[9px] font-bold tracking-[.3em] text-[#d7b66d]">ROYAL TRAINING</p><h2 id="tutorial-title" className="mt-1 text-xl font-black tracking-wide">BACKGAMMON GUIDE</h2><p className="mt-1 text-xs text-slate-400">Learn the rules one step at a time</p></div>
          <button type="button" onClick={onClose} aria-label="Close tutorial" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-slate-300">×</button>
        </header>
        <main className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
          {lessons.map(lesson => (
            <article key={lesson.number} className="flex gap-3 rounded-2xl border border-white/10 bg-[#0d1d2b] p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7b66d]/30 bg-[#d7b66d]/10 text-xs font-bold text-[#f0d18b]">{lesson.number}</span>
              <div><h3 className="text-sm font-bold text-[#f7e9cb]">{lesson.title}</h3><p className="mt-1 text-xs leading-relaxed text-slate-400">{lesson.body}</p></div>
            </article>
          ))}
          <div className="rounded-2xl border border-sky-300/15 bg-sky-300/5 p-4"><h3 className="text-sm font-bold text-sky-100">Practice tip</h3><p className="mt-1 text-xs leading-relaxed text-slate-400">Start with the Beginner AI level and focus on legal moves, protecting single checkers and entering from the bar.</p></div>
        </main>
        <footer className="shrink-0 border-t border-white/10 p-4"><button type="button" onClick={onClose} className="min-h-11 w-full rounded-xl bg-[#c49a4b] px-4 py-3 text-sm font-bold text-[#171006]">Continue</button></footer>
      </section>
    </div>
  );
}
