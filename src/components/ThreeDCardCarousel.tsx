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
    { id: 'practice', title: 'practice', sub: 'practiceSub', icon: 'practice', image: cardPracticeSapphireImg, action: onOpenPractice, tone: 'blue' },
    { id: 'tournaments', title: 'tournaments', sub: 'tournamentsSub', icon: 'tournament', image: cardTournamentsSilverImg, action: onOpenTournaments, tone: 'silver' },
    { id: 'play', title: 'play', sub: 'playSub', icon: 'play', image: cardPlayGoldImg, action: onPlayOneOnOne, tone: 'gold' },
    { id: 'friends', title: 'friends', sub: 'friendsSub', icon: 'friends', image: cardFriendsEmeraldImg, action: onOpenFriends, tone: 'green' },
    { id: 'special', title: 'special', sub: 'specialSub', icon: 'special', image: cardSpecialRubyImg, action: onOpenVariants, tone: 'red' },
  ];

  const move = (next: number) => {
    setActiveIndex(((next % cards.length) + cards.length) % cards.length);
    royalSound.playDiceRollSound();
    triggerTelegramHaptic('light');
  };

  let touchStartX = 0;

  return (
    <section
      className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden px-1 pb-0"
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
              className="absolute left-1/2 top-[68%] flex w-[min(42vw,222px)] max-h-[min(43vh,350px)] aspect-[.72] -translate-y-1/2 flex-col overflow-hidden rounded-[20px] border bg-[#090d13] text-white transition-all duration-500 ease-out disabled:cursor-default sm:w-[min(23vw,250px)] sm:rounded-[24px]"
              style={{
                opacity: visible ? (center ? 1 : Math.max(.48, 1 - Math.abs(diff) * .22)) : 0,
                pointerEvents: center ? 'auto' : 'none',
                zIndex: 20 - Math.abs(diff),
                transform: `translate(calc(-50% + ${diff * (typeof window !== 'undefined' && window.innerWidth < 640 ? 106 : 102)}%), -50%) rotateY(${diff * -13}deg) rotateZ(${center ? 0 : diff * -1.5}deg) scale(${center ? 1.16 : Math.max(.76, 1 - Math.abs(diff) * .17)})`,
                filter: center ? 'none' : `blur(${Math.min(2.2, Math.abs(diff) * 1.1)}px)`,
                borderColor: center ? '#ffe08a' : card.tone === 'green' ? '#5cae9b' : '#8294aa',
                boxShadow: center ? '0 0 0 2px #ffe08a, 0 0 0 7px rgba(255,190,70,.16), 0 0 42px rgba(0,145,255,.72), 0 0 62px rgba(255,186,54,.62), 0 22px 38px rgba(0,0,0,.82)' : '0 12px 24px rgba(0,0,0,.65)',
              }}
            >
              <img src={card.image} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20" />
              <div className="absolute inset-[5px] rounded-[15px] border border-[#ffe5a0]/65 shadow-[inset_0_0_24px_rgba(255,210,115,.12)] sm:inset-2 sm:rounded-[19px]" />
              <div className="pointer-events-none absolute inset-x-[12%] top-0 h-px bg-gradient-to-r from-transparent via-[#ffe7a5]/90 to-transparent" />
              <div className={`pointer-events-none absolute bottom-[13%] left-1/2 z-20 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border border-[#f5d58b]/90 bg-[radial-gradient(circle_at_35%_25%,rgba(255,240,190,.3),rgba(5,10,18,.94)_65%)] shadow-[0_0_0_3px_rgba(12,17,25,.72),0_0_18px_rgba(255,194,74,.42),inset_0_0_12px_rgba(255,217,135,.22)] sm:h-14 sm:w-14 ${center ? 'opacity-100' : 'opacity-85'}`}>
                <svg viewBox="0 0 48 48" className="h-7 w-7 text-[#ffe4a0] drop-shadow-[0_0_5px_rgba(255,190,70,.8)] sm:h-8 sm:w-8" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {card.id === 'play' && <><path d="M10 25 24 8l14 17-14 15L10 25Z"/><path d="m19 25 5-7 5 7-5 7-5-7Z"/><path d="M24 4v4M7 25h4M37 25h4"/></>}
                  {card.id === 'tournaments' && <><path d="M16 9h16v8c0 7-3.5 11-8 11s-8-4-8-11V9Z"/><path d="M16 13H9v4c0 5 3 8 8 8M32 13h7v4c0 5-3 8-8 8M24 28v8M17 40h14M20 36h8"/><path d="m24 12 1.8 3.7 4.1.6-3 2.9.7 4.1-3.6-1.9-3.6 1.9.7-4.1-3-2.9 4.1-.6L24 12Z"/></>}
                  {card.id === 'practice' && <><path d="M24 7 37 13v10c0 9-5.5 14-13 18-7.5-4-13-9-13-18V13L24 7Z"/><path d="m17 24 5 5 10-11"/><path d="M24 3v4"/></>}
                  {card.id === 'friends' && <><circle cx="18" cy="17" r="6"/><circle cx="32" cy="19" r="5"/><path d="M6 38c1-7 5-11 12-11s11 4 12 11M28 29c7-2 12 2 14 8"/><path d="m24 10 2-4 2 4"/></>}
                  {card.id === 'special' && <><path d="m24 5 5.2 11 12 1.7-8.7 8.4 2.1 11.9L24 32.4l-10.6 5.6 2.1-11.9-8.7-8.4 12-1.7L24 5Z"/><circle cx="24" cy="23" r="4"/></>}
                </svg>
                <span className="absolute inset-[3px] rounded-full border border-[#ffe9b2]/30" />
              </div>
              <span className={`pointer-events-none absolute bottom-[2.5%] left-1/2 z-30 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold tracking-[0.12em] text-[#ffe3a0] drop-shadow-[0_0_7px_rgba(255,190,70,.95)] sm:text-xs ${center ? 'opacity-100' : 'opacity-90'}`}>{t(card.title)}</span>
              <div className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${center ? 'opacity-100' : 'opacity-35'} bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,213,120,.22),transparent_62%)]`} />
            </button>
          );
        })}
      </div>



    </section>
  );
}
