import React, { useState } from 'react';
import { royalSound } from '../libgdx/Gdx3DEngine';
import { triggerTelegramHaptic } from '../telegram/telegramMiniApp';
import cardPlayGoldImg from '../assets/images/card_play_gold_lion_sun_1792320293012.jpg';
import cardTournamentsSilverImg from '../assets/images/card_tournaments_silver_lion_sun_1792320310950.jpg';
import cardFriendsEmeraldImg from '../assets/images/card_friends_emerald_lion_sun_1792320329436.jpg';
import cardPracticeSapphireImg from '../assets/images/card_practice_sapphire_lion_sun_1792325802477.jpg';
import cardSpecialRubyImg from '../assets/images/card_special_ruby_lion_sun_1792325826121.jpg';
import { t } from '../i18n/translations';

interface ThreeDCardCarouselProps {
  onPlayOneOnOne: () => void;
  onOpenTournaments: () => void;
  onOpenPractice: () => void;
  onOpenFriends: () => void;
  onOpenVariants: () => void;
}

export function ThreeDCardCarousel({
  onPlayOneOnOne, onOpenTournaments, onOpenPractice, onOpenFriends, onOpenVariants,
}: ThreeDCardCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(2);
  const cards = [
    { id: 'practice', title: 'practice', sub: 'practiceSub', icon: '♟', image: cardPracticeSapphireImg, action: onOpenPractice, tone: 'blue' },
    { id: 'tournaments', title: 'tournaments', sub: 'tournamentsSub', icon: '♜', image: cardTournamentsSilverImg, action: onOpenTournaments, tone: 'silver' },
    { id: 'play', title: 'play', sub: 'playSub', icon: '♟', image: cardPlayGoldImg, action: onPlayOneOnOne, tone: 'gold' },
    { id: 'friends', title: 'friends', sub: 'friendsSub', icon: '♟', image: cardFriendsEmeraldImg, action: onOpenFriends, tone: 'green' },
    { id: 'special', title: 'special', sub: 'specialSub', icon: '★', image: cardSpecialRubyImg, action: onOpenVariants, tone: 'red' },
  ];

  const move = (next: number) => {
    setActiveIndex(Math.max(0, Math.min(cards.length - 1, next)));
    royalSound.playDiceRollSound();
    triggerTelegramHaptic('light');
  };

  let touchStartX = 0;
  const activeCard = cards[activeIndex];

  return (
    <section
      className="relative flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden px-1 pb-20 sm:pb-24"
      aria-label="Game modes"
      onTouchStart={(e) => { touchStartX = e.touches[0]?.clientX ?? 0; }}
      onTouchEnd={(e) => {
        const delta = (e.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
        if (Math.abs(delta) > 45) move(activeIndex + (delta < 0 ? 1 : -1));
      }}
    >
      <div className="pointer-events-none absolute bottom-[8%] h-10 w-[82%] rounded-[50%] border border-[#b88632]/80 bg-[#06111c]/70 shadow-[0_0_32px_rgba(0,145,255,.25),inset_0_0_25px_rgba(255,190,65,.15)]" />
      <div className="relative z-10 flex h-full min-h-0 w-full max-w-[940px] items-center justify-center [perspective:1200px]">
        {cards.map((card, index) => {
          const diff = index - activeIndex;
          const center = diff === 0;
          const visible = Math.abs(diff) <= 2;
          return (
            <button
              key={card.id}
              type="button"
              aria-label={t(card.title)}
              onClick={() => {
                if (!center) { move(index); return; }
                royalSound.playOptionClickSound();
                triggerTelegramHaptic('heavy');
                card.action();
              }}
              className="absolute top-1/2 flex w-[min(54vw,285px)] max-h-[min(53vh,440px)] aspect-[.72] -translate-y-1/2 flex-col overflow-hidden rounded-[20px] border bg-[#090d13] text-white transition-all duration-500 ease-out sm:w-[min(29vw,310px)] sm:rounded-[24px]"
              style={{
                opacity: visible ? (center ? 1 : Math.max(.62, 1 - Math.abs(diff) * .14)) : 0,
                pointerEvents: visible ? 'auto' : 'none',
                zIndex: 20 - Math.abs(diff),
                transform: `translate(calc(-50% + ${diff * (typeof window !== 'undefined' && window.innerWidth < 640 ? 75 : 82)}%), -50%) rotateY(${diff * -17}deg) rotateZ(${center ? 0 : diff * -2}deg) scale(${center ? 1 : Math.max(.72, 1 - Math.abs(diff) * .12)})`,
                borderColor: center ? '#ffd36b' : card.tone === 'green' ? '#5cae9b' : '#8294aa',
                boxShadow: center ? '0 0 0 1px #8b5b1c, 0 0 30px rgba(0,145,255,.55), 0 0 36px rgba(255,186,54,.28)' : '0 12px 24px rgba(0,0,0,.65)',
              }}
            >
              <img src={card.image} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/95" />
              <div className="absolute inset-2 rounded-[14px] border border-[#ffe5a0]/55 sm:inset-3 sm:rounded-[18px]" />
              <div className="relative z-10 mt-auto flex flex-col items-center gap-1 px-2 pb-4 pt-12 sm:pb-5">
                <span className="text-2xl drop-shadow sm:text-3xl">{card.icon}</span>
                <span className="font-cinzel text-lg font-black uppercase tracking-wide drop-shadow-[0_2px_5px_black] sm:text-2xl">{t(card.title)}</span>
                <span className="text-[10px] font-semibold text-white/90 sm:text-sm">{t(card.sub)}</span>
                {center && <span className="mt-1 rounded-full border border-[#ffe18a] bg-gradient-to-b from-[#9a641c]/95 to-[#1a1008]/95 px-5 py-1 text-xs font-black uppercase tracking-[.18em] text-[#ffe6a0] shadow-[0_0_18px_rgba(255,190,55,.35)] sm:px-7 sm:py-1.5 sm:text-sm">Play</span>}
              </div>
            </button>
          );
        })}
      </div>

      <button type="button" aria-label="Previous game mode" onClick={() => move(activeIndex - 1)} disabled={activeIndex === 0} className="absolute left-3 top-[43%] z-30 flex h-11 w-11 items-center justify-center rounded-full border border-[#e4bb55]/70 bg-black/75 text-2xl text-[#ffdb69] shadow-[0_0_18px_rgba(0,0,0,.7)] disabled:opacity-25 sm:left-6 sm:h-14 sm:w-14">‹</button>
      <button type="button" aria-label="Next game mode" onClick={() => move(activeIndex + 1)} disabled={activeIndex === cards.length - 1} className="absolute right-3 top-[43%] z-30 flex h-11 w-11 items-center justify-center rounded-full border border-[#e4bb55]/70 bg-black/75 text-2xl text-[#ffdb69] shadow-[0_0_18px_rgba(0,0,0,.7)] disabled:opacity-25 sm:right-6 sm:h-14 sm:w-14">›</button>

      <button type="button" onClick={() => { royalSound.playOptionClickSound(); triggerTelegramHaptic('heavy'); activeCard.action(); }} className="absolute bottom-1 z-40 flex min-w-[190px] max-w-[82%] items-center justify-between gap-4 rounded-full border border-[#f4d37c] bg-gradient-to-r from-[#271809] via-[#6d4a1e] to-[#17100a] px-5 py-2.5 text-[#fff0bd] shadow-[0_0_25px_rgba(255,183,46,.32)] sm:bottom-2 sm:min-w-[280px] sm:px-7 sm:py-3">
        <span className="text-lg text-[#ffe5a0]">{activeCard.icon}</span>
        <span className="min-w-0 text-center"><span className="block font-cinzel text-xs font-black uppercase tracking-[.18em] sm:text-base">{t(activeCard.title)}</span><span className="block text-[10px] text-white/75 sm:text-xs">{t(activeCard.sub)}</span></span>
        <span className="rounded-full border border-[#ffe5a0]/65 px-3 py-1 text-[10px] uppercase sm:text-xs">Play</span>
      </button>
    </section>
  );
}
