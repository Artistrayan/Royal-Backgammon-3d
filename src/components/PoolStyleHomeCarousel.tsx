import React, { useRef } from 'react';
import royalClosedBoardImg from '../assets/images/royal_closed_board_gold_lion.jpg';
import { royalSound } from '../libgdx/Gdx3DEngine';

interface GameModeCard {
  id: string;
  title: string;
  persianTitle: string;
  badge: string;
  sub: string;
  borderColor: string;
  glowColor: string;
  bgGradient: string;
  tagBg: string;
  onClick: () => void;
}

interface PoolStyleHomeCarouselProps {
  onPlayOneOnOne: () => void;
  onOpenTournaments: () => void;
  onOpenPractice: () => void;
  onOpenFriends: () => void;
}

export function PoolStyleHomeCarousel({
  onPlayOneOnOne,
  onOpenTournaments,
  onOpenPractice,
  onOpenFriends,
}: PoolStyleHomeCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const cards: GameModeCard[] = [
    {
      id: 'one_on_one',
      title: 'PLAY 1 ON 1',
      persianTitle: 'بازی دو نفره آنلاین',
      badge: 'LIVE MULTIPLAYER',
      sub: 'ورود سریع به میز و بازی با حریف زنده',
      borderColor: '#22c55e',
      glowColor: 'rgba(34, 197, 94, 0.45)',
      bgGradient: 'from-[#0a351f] via-[#052012] to-[#021008]',
      tagBg: 'bg-[#15803d]',
      onClick: () => {
        royalSound.playOptionClickSound();
        onPlayOneOnOne();
      },
    },
    {
      id: 'tournaments',
      title: 'SWISS TOURNAMENTS',
      persianTitle: 'تورنمنت سوئیسی و حذفی',
      badge: '5 & 10 USDT • 85% PRIZE',
      sub: '۵ راند سوئیسی + حذفی ۸ نفر برتر با کرافورد',
      borderColor: '#eab308',
      glowColor: 'rgba(234, 179, 8, 0.5)',
      bgGradient: 'from-[#382606] via-[#241704] to-[#120b02]',
      tagBg: 'bg-[#a16207]',
      onClick: () => {
        royalSound.playOptionClickSound();
        onOpenTournaments();
      },
    },
    {
      id: 'practice',
      title: 'PRACTICE WITH AI',
      persianTitle: 'تمرین با هوش مصنوعی',
      badge: '4 SKILL TIERS',
      sub: 'مبتدی (۶۵٪ خطا)، نوآموز، متوسط و استاد بزرگ',
      borderColor: '#3b82f6',
      glowColor: 'rgba(59, 130, 246, 0.45)',
      bgGradient: 'from-[#0f274a] via-[#09172e] to-[#040b17]',
      tagBg: 'bg-[#1d4ed8]',
      onClick: () => {
        royalSound.playOptionClickSound();
        onOpenPractice();
      },
    },
    {
      id: 'friends',
      title: 'PLAY WITH FRIENDS',
      persianTitle: 'بازی با دوستان',
      badge: 'PRIVATE TABLE',
      sub: 'دعوت و چالش مستقیم دوستان تلگرامی',
      borderColor: '#a855f7',
      glowColor: 'rgba(168, 85, 247, 0.45)',
      bgGradient: 'from-[#33114d] via-[#1f0a30] to-[#0d0414]',
      tagBg: 'bg-[#7e22ce]',
      onClick: () => {
        royalSound.playOptionClickSound();
        onOpenFriends();
      },
    },
  ];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const offset = direction === 'left' ? -220 : 220;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      royalSound.playOptionClickSound();
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center px-1 overflow-hidden select-none">
      {/* Left Scroll Arrow */}
      <button
        type="button"
        onClick={() => scroll('left')}
        aria-label="Scroll left"
        className="absolute left-1 z-30 w-7 h-11 rounded-md bg-[#031109]/80 hover:bg-[#072414] border border-[#c8a668]/50 text-[#f5dca8] flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer backdrop-blur-sm"
      >
        <span className="text-sm font-bold">◀</span>
      </button>

      {/* Right Scroll Arrow */}
      <button
        type="button"
        onClick={() => scroll('right')}
        aria-label="Scroll right"
        className="absolute right-1 z-30 w-7 h-11 rounded-md bg-[#031109]/80 hover:bg-[#072414] border border-[#c8a668]/50 text-[#f5dca8] flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer backdrop-blur-sm"
      >
        <span className="text-sm font-bold">▶</span>
      </button>

      {/* Horizontal Carousel (وسط صفحه: طرح تخته در بسته کج برای هر گزینه با اسکرول به چپ و راست) */}
      <div
        ref={scrollContainerRef}
        className="w-full h-full flex items-center gap-3.5 px-9 overflow-x-auto scrollbar-none snap-x snap-mandatory py-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {cards.map((card) => (
          <div
            key={card.id}
            onClick={card.onClick}
            style={{
              borderColor: card.borderColor,
              boxShadow: `0 12px 28px -4px ${card.glowColor}`,
            }}
            className={`group relative shrink-0 w-[185px] sm:w-[205px] h-[195px] sm:h-[210px] rounded-2xl border-[2.5px] bg-gradient-to-b ${card.bgGradient} p-2 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-95 snap-center overflow-hidden`}
          >
            {/* Top Badge Header */}
            <div className="flex items-center justify-between z-10">
              <span
                className={`px-2 py-0.5 rounded-full ${card.tagBg} text-[7.5px] font-cinzel font-bold text-white tracking-wider shadow-sm`}
              >
                {card.badge}
              </span>
              <span className="text-xs text-white/80 group-hover:translate-x-0.5 transition-transform">
                ▶
              </span>
            </div>

            {/* Middle: 3D Tilted Closed Backgammon Board Graphic (تخته در بسته کج) */}
            <div className="relative w-full h-[110px] flex items-center justify-center my-0.5 perspective-[600px]">
              <div className="w-[140px] h-[95px] rounded-lg overflow-hidden border border-[#c8a668]/70 shadow-[0_8px_20px_rgba(0,0,0,0.85)] transform -rotate-[5deg] group-hover:rotate-0 group-hover:scale-105 transition-all duration-300">
                <img
                  src={royalClosedBoardImg}
                  alt={card.title}
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/15 pointer-events-none" />
              </div>
            </div>

            {/* Bottom: Title & Action Button */}
            <div className="z-10 text-center flex flex-col items-center">
              <h3 className="font-cinzel text-[11px] sm:text-[12px] font-black tracking-wider text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {card.title}
              </h3>
              <p className="font-cormorant text-[9.5px] text-[#f2e6cf] font-semibold truncate w-full">
                {card.persianTitle}
              </p>
              <div
                style={{ backgroundColor: card.borderColor }}
                className="w-full mt-1 py-1 rounded-[6px] text-[#140e05] font-cinzel text-[8px] font-extrabold tracking-widest shadow-md uppercase group-hover:brightness-110 transition-all"
              >
                انتخاب میز
              </div>
            </div>

            {/* Subtle Gloss sheen overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/30 pointer-events-none rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
