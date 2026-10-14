import React, { useState } from 'react';
import { RoyalCrownIcon } from './RoyalIcons';
import { royalSound } from '../libgdx/Gdx3DEngine';
import { triggerTelegramHaptic } from '../telegram/telegramMiniApp';
import boardCrestImg from '../assets/images/board_center_lion_sun_crest_1791747231807.jpg';

interface HomeClosedBoardShowcaseProps {
  onOpenBoard: () => void;
  onOpenCollection?: () => void;
  isOpening?: boolean;
}

export function HomeClosedBoardShowcase({
  onOpenBoard,
  onOpenCollection,
  isOpening = false,
}: HomeClosedBoardShowcaseProps) {
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rx = (-y / (rect.height / 2)) * 6; // subtle 3D tilt
    const ry = (x / (rect.width / 2)) * 8;
    setTilt({ rx, ry });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 });
    setIsHovered(false);
  };

  const handleBoardClick = () => {
    royalSound.playBoardOpenSound();
    triggerTelegramHaptic('heavy');
    onOpenBoard();
  };

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center p-3 select-none"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* LUXURY CLOSED BACKGAMMON SHOWCASE (سایز بزرگتر و طراحی کاملاً مستقل از تخته بازی) */}
      <div
        onClick={handleBoardClick}
        style={{
          transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${
            isHovered ? 1.025 : 1
          })`,
          transition: 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        className={`relative w-[92%] max-w-[580px] aspect-[16/10.8] rounded-[10px] cursor-pointer shadow-[0_24px_55px_rgba(0,0,0,0.92),0_4px_18px_rgba(218,165,32,0.18)] border-2 border-[#b89352]/70 overflow-hidden transition-all duration-300 group ${
          isOpening ? 'scale-105 opacity-0 duration-500' : 'opacity-100'
        }`}
      >
        {/* Deep Walnut Wood Base & Marquetry Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#3b2112] via-[#211107] to-[#120703]">
          {/* Subtle Walnut Wood Grain Texture */}
          <div
            className="absolute inset-0 opacity-25 mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(255,230,180,0.08) 15px, transparent 16px)',
            }}
          />
        </div>

        {/* Outer Inlaid Persian Khatam-Kari Mosaic Border (خاتم‌کاری اصیل زرین و نقره‌فام) */}
        <div className="absolute inset-2 border-2 border-[#d4af37]/60 rounded-[7px] pointer-events-none shadow-[inset_0_0_12px_rgba(0,0,0,0.85)]">
          {/* Detailed Mosaic Pattern Strip */}
          <div
            className="absolute inset-0 opacity-40 mix-blend-screen"
            style={{
              backgroundImage:
                'radial-gradient(circle, #e2c285 1.5px, transparent 2px)',
              backgroundSize: '10px 10px',
            }}
          />
        </div>

        {/* Center Hinge Groove (خط لولای میانی تخته بسته دست‌ساز) */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[6px] bg-gradient-to-r from-[#0d0603] via-[#4d321d] to-[#0d0603] shadow-[0_0_6px_rgba(0,0,0,0.95)] z-10 flex flex-col justify-between py-5">
          {/* Golden Brass Hinges (لولاهای برنجی با پرچ طلاکوب) */}
          <div className="w-full h-8 -mx-[1px] bg-gradient-to-b from-[#e5c158] via-[#a67c2e] to-[#684915] rounded-[1px] shadow-[0_2px_4px_rgba(0,0,0,0.8)] border border-[#ffecb3]/40" />
          <div className="w-full h-8 -mx-[1px] bg-gradient-to-b from-[#e5c158] via-[#a67c2e] to-[#684915] rounded-[1px] shadow-[0_2px_4px_rgba(0,0,0,0.8)] border border-[#ffecb3]/40" />
        </div>

        {/* Four Solid Brass Filigree Corner Brackets (گوشواره‌های زرین برنجی) */}
        <div className="absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-[#e6c265] rounded-tl-[4px] pointer-events-none" />
        <div className="absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-[#e6c265] rounded-tr-[4px] pointer-events-none" />
        <div className="absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-[#e6c265] rounded-bl-[4px] pointer-events-none" />
        <div className="absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-[#e6c265] rounded-br-[4px] pointer-events-none" />

        {/* Left Board Wing: Embossed Royal Lion and Sun Crest (شیر و خورشید سلطنتی) */}
        <div className="absolute left-[8%] top-1/2 -translate-y-1/2 w-[34%] aspect-square rounded-full flex items-center justify-center">
          <div className="relative w-full h-full rounded-full p-2 border border-[#d8b056]/50 bg-gradient-to-b from-[#2b170c]/70 to-[#120703]/90 shadow-[0_4px_16px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden">
            <img
              src={boardCrestImg}
              alt="Royal Lion & Sun Crest"
              className="w-[84%] h-[84%] object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] opacity-90 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300"
            />
            {/* Golden Rim Sheen */}
            <div className="absolute inset-0 rounded-full border border-[#f7e09e]/30 pointer-events-none" />
          </div>
        </div>

        {/* Right Board Wing: Ornate Marquetry Star Medallion (ترنج خاتم‌کاری شاه عباسی) */}
        <div className="absolute right-[8%] top-1/2 -translate-y-1/2 w-[34%] aspect-square rounded-full flex items-center justify-center">
          <div className="relative w-full h-full rounded-full p-2 border border-[#d8b056]/50 bg-gradient-to-b from-[#2b170c]/70 to-[#120703]/90 shadow-[0_4px_16px_rgba(0,0,0,0.9)] flex flex-col items-center justify-center">
            <RoyalCrownIcon className="w-10 h-10 text-[#e9c775] drop-shadow-[0_2px_8px_rgba(218,165,32,0.6)] group-hover:scale-110 transition-transform" />
            <span className="font-cinzel text-[8.5px] font-bold tracking-[0.24em] text-[#eed59e] mt-1 text-center">
              ROYAL COURT
            </span>
            <span className="font-cormorant text-[8px] text-[#b8a07c] tracking-[0.08em] text-center">
              HANDCRAFTED IN PERSIA
            </span>
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-[#e0be6c] to-transparent mt-1" />
          </div>
        </div>

        {/* Center Heavy Brass Clasp & Lock (قفل و ضامن برنجی زرین) */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex items-center">
          <div className="px-1.5 py-3 rounded-[3px] bg-gradient-to-b from-[#fae29c] via-[#cf9f3e] to-[#805711] border border-[#fffae8] shadow-[0_4px_12px_rgba(0,0,0,0.95)] flex flex-col items-center gap-1 group-hover:scale-105 transition-transform">
            <div className="w-1.5 h-1.5 rounded-full bg-[#301c05] border border-[#fae29c]" />
            <div className="w-1 h-3 bg-[#422509] rounded-full" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#301c05] border border-[#fae29c]" />
          </div>
        </div>

        {/* Luxury Light Sweep on Hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

        {/* Bottom Banner inside showcase */}
        <div className="absolute inset-x-0 bottom-2 z-20 flex justify-center pointer-events-none px-3">
          <div className="px-3 py-1 rounded-[4px] bg-[#0c0603]/85 border border-[#dfbc6d]/60 backdrop-blur-[2px] shadow-[0_4px_12px_rgba(0,0,0,0.8)] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#48bb78] animate-ping" />
            <span className="font-cinzel text-[8px] font-semibold tracking-[0.16em] text-[#f7e09e]">
              TOUCH BOARD TO OPEN (لمس برای گشودن)
            </span>
          </div>
        </div>
      </div>

      {/* Showcase Description & Quick Actions Below Board */}
      <div className="mt-3 w-[92%] max-w-[580px] flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="font-cormorant text-[11px] text-[#cfc5b0] tracking-[0.04em]">
            ⚜️ تخته نرد بسته سلطنتی دست‌ساز — گردوی اصیل و خاتم‌کاری زرین
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCollection && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                royalSound.playOptionClickSound();
                onOpenCollection();
              }}
              className="px-2.5 py-1 rounded-[3px] bg-[#1a0e06]/85 border border-[#b89352]/40 hover:border-[#b89352] text-[#d6c29a] hover:text-[#fff2cf] font-cinzel text-[7.5px] font-semibold tracking-[0.14em] cursor-pointer transition-colors"
            >
              CHEST STORE (خزانه)
            </button>
          )}

          <button
            type="button"
            onClick={handleBoardClick}
            className="px-3.5 py-1 rounded-[3px] brass-button-surface border border-[#ffecb3] text-[#140e05] font-cinzel text-[8px] font-bold tracking-[0.16em] cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.7)] hover:scale-105 active:scale-95 transition-transform"
          >
            OPEN BOARD (گشودن تخته)
          </button>
        </div>
      </div>
    </div>
  );
}
