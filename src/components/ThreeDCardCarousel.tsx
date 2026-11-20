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
    setActiveIndex(((next % cards.length) + cards.length) % cards.length);
    royalSound.playDiceRollSound();
    triggerTelegramHaptic('light');
  };

  let touchStartX = 0;

  return (
    <section
      className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden px-1 pb-3 sm:pb-0"
      aria-label="Game modes"
      onTouchStart={(e) => { touchStartX = e.touches[0]?.clientX ?? 0; }}
      onTouchEnd={(e) => {
        const delta = (e.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
        if (Math.abs(delta) > 45) move(activeIndex + (delta < 0 ? 1 : -1));
      }}
    >
      <div className="pointer-events-none absolute bottom-[8%] h-10 w-[82%] rounded-[50%] border border-[#b88632]/80 bg-[#06111c]/70 shadow-[0_0_32px_rgba(0,145,255,.25),inset_0_0_25px_rgba(255,190,65,.15)]" />
      <div className="relative z-10 flex min-h-0 w-full flex-1 max-w-[940px] items-center justify-center [perspective:1200px] ">
        {cards.map((card, index) => {
          // Wrap each card around the carousel so the sequence is continuous.
          // The shortest signed distance places adjacent cards behind the active card.
          const half = Math.floor(cards.length / 2);
          const diff = ((index - activeIndex + half + cards.length) % cards.length) - half;
          const center = diff === 0;
          const visible = Math.abs(diff) <= 2;
          return (
            <button
              key={card.id}
              type="button"
              aria-label={center ? t(card.title) : undefined}
              aria-hidden={!center}
              tabIndex={center ? 0 : -1}
              disabled={!center}
              onClick={() => {
                if (!center) return;
                royalSound.playOptionClickSound();
                triggerTelegramHaptic('heavy');
                card.action();
              }}
              className="absolute left-1/2 top-1/2 flex w-[min(45vw,238px)] max-h-[min(45vh,365px)] aspect-[.72] -translate-y-1/2 flex-col overflow-hidden rounded-[20px] border bg-[#090d13] text-white transition-all duration-500 ease-out disabled:cursor-default sm:w-[min(25vw,270px)] sm:rounded-[24px]"
              style={{
                opacity: visible ? (center ? 1 : Math.max(.62, 1 - Math.abs(diff) * .14)) : 0,
                pointerEvents: center ? 'auto' : 'none',
                zIndex: 20 - Math.abs(diff),
                transform: `translate(calc(-50% + ${diff * (typeof window !== 'undefined' && window.innerWidth < 640 ? 92 : 88)}%), -50%) rotateY(${diff * -13}deg) rotateZ(${center ? 0 : diff * -1.5}deg) scale(${center ? 1 : Math.max(.72, 1 - Math.abs(diff) * .13)})`,
                borderColor: center ? '#ffd36b' : card.tone === 'green' ? '#5cae9b' : '#8294aa',
                boxShadow: center ? '0 0 0 1px #8b5b1c, 0 0 30px rgba(0,145,255,.55), 0 0 36px rgba(255,186,54,.28)' : '0 12px 24px rgba(0,0,0,.65)',
              }}
            >
              <img src={card.image} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20" />
              <div className="absolute inset-[5px] rounded-[15px] border border-[#ffe5a0]/65 shadow-[inset_0_0_24px_rgba(255,210,115,.12)] sm:inset-2 sm:rounded-[19px]" />
              <div className="pointer-events-none absolute inset-x-[12%] top-0 h-px bg-gradient-to-r from-transparent via-[#ffe7a5]/90 to-transparent" />
              <div className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${center ? 'opacity-100' : 'opacity-35'} bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,213,120,.22),transparent_62%)]`} />
            </button>
          );
        })}
      </div>

      <button type="button" aria-label="Previous game mode" onClick={() => move(activeIndex - 1)} className="absolute left-3 top-[43%] z-30 flex h-11 w-11 items-center justify-center rounded-full border border-[#e4bb55]/70 bg-black/75 text-2xl text-[#ffdb69] shadow-[0_0_18px_rgba(0,0,0,.7)] sm:left-6 sm:h-14 sm:w-14">‹</button>
      <button type="button" aria-label="Next game mode" onClick={() => move(activeIndex + 1)} className="absolute right-3 top-[43%] z-30 flex h-11 w-11 items-center justify-center rounded-full border border-[#e4bb55]/70 bg-black/75 text-2xl text-[#ffdb69] shadow-[0_0_18px_rgba(0,0,0,.7)] sm:right-6 sm:h-14 sm:w-14">›</button>

    </section>
  );
}
