import React, { useState } from 'react';
import royalClosedBoardImg from '../assets/images/royal_closed_board_gold_lion.jpg';
import boardImperialImg from '../assets/images/board_imperial_emerald_walnut_1791747690118.jpg';
import lionCrestImg from '../assets/images/board_center_lion_sun_crest_1791747231807.jpg';
import { royalSound } from '../libgdx/Gdx3DEngine';

export interface RoyalBackgammonHomeLobbyProps {
  onlineCount: number;
  userCoins: number;
  userUsdt: number;
  playerLevel: number;
  playerRating: number;
  playerName: string;
  onPlayOneOnOne: () => void;
  onOpenTournaments: () => void;
  onOpenPractice: () => void;
  onOpenFriends: () => void;
  onOpenProvablyFair: () => void;
  onOpenLeaderboard: () => void;
  onOpenVariants: () => void;
  onQuickPlay: () => void;
  onOpenWallet: () => void;
}

export function RoyalBackgammonHomeLobby({
  onlineCount,
  userCoins,
  userUsdt,
  playerLevel,
  playerRating,
  playerName,
  onPlayOneOnOne,
  onOpenTournaments,
  onOpenPractice,
  onOpenFriends,
  onOpenProvablyFair,
  onOpenLeaderboard,
  onOpenVariants,
  onQuickPlay,
  onOpenWallet,
}: RoyalBackgammonHomeLobbyProps) {
  const [boardAngle, setBoardAngle] = useState<'perspective' | 'top' | 'isometric'>('perspective');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const toggleBoardAngle = () => {
    royalSound.playOptionClickSound();
    setBoardAngle((prev) => {
      if (prev === 'perspective') return 'isometric';
      if (prev === 'isometric') return 'top';
      return 'perspective';
    });
  };

  return (
    <div className="relative w-full h-full flex flex-col lg:flex-row items-center justify-between p-2 lg:p-4 gap-3 overflow-hidden select-none">
      {/* Background Ambient Parlor Light */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[#1b3d29]/15 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-[#c8a668]/12 blur-[100px]" />
      </div>

      {/* LEFT / CENTER-LEFT: ROYAL BACKGAMMON GAME MODES (کارت‌های بازی اختصاصی تخته نرد سلطنتی) */}
      <div className="relative z-10 w-full lg:w-[48%] h-full flex flex-col justify-between py-1 overflow-y-auto scrollbar-none pr-1">
        {/* Header Title with Crown */}
        <div className="flex items-center justify-between pb-1.5 border-b border-[#c8a668]/30">
          <div className="flex items-center gap-2">
            <span className="text-lg">👑</span>
            <div className="flex flex-col text-right">
              <h1 className="font-cinzel text-xs lg:text-sm font-black tracking-[0.16em] text-[#f5dca8] drop-shadow">
                ROYAL BACKGAMMON CHAMPIONSHIP
              </h1>
              <span className="font-cormorant text-[11px] text-[#c5b89a]">
                تالار جهانی تخته نرد سلطنتی • بالاترین استاندارد بین‌المللی
              </span>
            </div>
          </div>

          {/* Quick Real-Time Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#03190e] border border-[#52f29c]/40 text-[9px] font-cinzel text-[#52f29c]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#52f29c] animate-pulse" />
            <span>{onlineCount > 0 ? `${onlineCount} ONLINE PLAYERS` : 'LIVE SERVERS READY'}</span>
          </div>
        </div>

        {/* 4 PRIMARY GAME MODE TILES (تخته نرد آنلاین، تورنمنت سوئیسی، تمرین هوش مصنوعی، بازی با دوستان) */}
        <div className="grid grid-cols-2 gap-2 my-2">
          {/* 1. PLAY 1 ON 1 ONLINE */}
          <div
            onClick={() => {
              royalSound.playOptionClickSound();
              onPlayOneOnOne();
            }}
            onMouseEnter={() => setHoveredCard('1on1')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative rounded-xl border-2 border-[#22c55e]/70 bg-gradient-to-br from-[#0c3821] via-[#062013] to-[#021008] p-2.5 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-[#4ade80] shadow-[0_8px_20px_rgba(34,197,94,0.25)] overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-[#15803d] text-[7px] font-cinzel font-bold text-white tracking-wider">
                RANKED 1V1
              </span>
              <span className="text-xs">⚔️</span>
            </div>
            <div className="my-1.5 text-right">
              <h2 className="font-cinzel text-xs font-black text-white group-hover:text-[#86efac] transition-colors">
                بازی آنلاین زنده
              </h2>
              <p className="font-cormorant text-[9.5px] text-[#a7f3d0] leading-tight">
                مسابقه دو نفره واقعی با کیوب دوبل و ریتینگ جهانی ELO
              </p>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#22c55e]/30">
              <span className="font-cinzel text-[7.5px] text-[#4ade80] font-bold">ورود به میز</span>
              <span className="text-[10px] text-white group-hover:translate-x-0.5 transition-transform">▶</span>
            </div>
          </div>

          {/* 2. SWISS & KNOCKOUT TOURNAMENTS */}
          <div
            onClick={() => {
              royalSound.playOptionClickSound();
              onOpenTournaments();
            }}
            onMouseEnter={() => setHoveredCard('tourn')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative rounded-xl border-2 border-[#eab308]/70 bg-gradient-to-br from-[#3b2907] via-[#241703] to-[#120b02] p-2.5 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-[#fde047] shadow-[0_8px_20px_rgba(234,179,8,0.25)] overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-[#a16207] text-[7px] font-cinzel font-bold text-white tracking-wider">
                5 & 10 USDT
              </span>
              <span className="text-xs">🏆</span>
            </div>
            <div className="my-1.5 text-right">
              <h2 className="font-cinzel text-xs font-black text-white group-hover:text-[#fef08a] transition-colors">
                تورنمنت‌های قهرمانی
              </h2>
              <p className="font-cormorant text-[9.5px] text-[#fef08a]/80 leading-tight">
                ۵ راند سوئیسی + فینال ۸ نفره با قانون رسمی کرافورد WBGF
              </p>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#eab308]/30">
              <span className="font-cinzel text-[7.5px] text-[#fde047] font-bold">۸۵٪ جوایز نقدی</span>
              <span className="text-[10px] text-white group-hover:translate-x-0.5 transition-transform">▶</span>
            </div>
          </div>

          {/* 3. PRACTICE WITH AI & PR ANALYSIS */}
          <div
            onClick={() => {
              royalSound.playOptionClickSound();
              onOpenPractice();
            }}
            onMouseEnter={() => setHoveredCard('ai')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative rounded-xl border-2 border-[#3b82f6]/70 bg-gradient-to-br from-[#0e274d] via-[#08172e] to-[#040c17] p-2.5 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-[#93c5fd] shadow-[0_8px_20px_rgba(59,130,246,0.25)] overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-[#1d4ed8] text-[7px] font-cinzel font-bold text-white tracking-wider">
                4 TIERS • PR AI
              </span>
              <span className="text-xs">🧠</span>
            </div>
            <div className="my-1.5 text-right">
              <h2 className="font-cinzel text-xs font-black text-white group-hover:text-[#bfdbfe] transition-colors">
                تمرین هوش مصنوعی
              </h2>
              <p className="font-cormorant text-[9.5px] text-[#bfdbfe]/80 leading-tight">
                مبتدی تا استاد بزرگ و ارزیابی خطاهای تخته (Blunder / Error)
              </p>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#3b82f6]/30">
              <span className="font-cinzel text-[7.5px] text-[#93c5fd] font-bold">شروع تمرین</span>
              <span className="text-[10px] text-white group-hover:translate-x-0.5 transition-transform">▶</span>
            </div>
          </div>

          {/* 4. PLAY WITH TELEGRAM FRIENDS */}
          <div
            onClick={() => {
              royalSound.playOptionClickSound();
              onOpenFriends();
            }}
            onMouseEnter={() => setHoveredCard('friends')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative rounded-xl border-2 border-[#a855f7]/70 bg-gradient-to-br from-[#3b1559] via-[#240d36] to-[#11051a] p-2.5 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-[#d8b4fe] shadow-[0_8px_20px_rgba(168,85,247,0.25)] overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-[#7e22ce] text-[7px] font-cinzel font-bold text-white tracking-wider">
                PRIVATE TABLE
              </span>
              <span className="text-xs">👥</span>
            </div>
            <div className="my-1.5 text-right">
              <h2 className="font-cinzel text-xs font-black text-white group-hover:text-[#e9d5ff] transition-colors">
                بازی با دوستان
              </h2>
              <p className="font-cormorant text-[9.5px] text-[#e9d5ff]/80 leading-tight">
                دعوت مستقیم دوستان تلگرامی با لینک اختصاصی و چالش دوستانه
              </p>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#a855f7]/30">
              <span className="font-cinzel text-[7.5px] text-[#d8b4fe] font-bold">ارسال چالش</span>
              <span className="text-[10px] text-white group-hover:translate-x-0.5 transition-transform">▶</span>
            </div>
          </div>
        </div>

        {/* 3 SECONDARY LUXURY ACTION BARS (اثبات تاس عادلانه، رده‌بندی فصلی، قوانین و سبک‌ها) */}
        <div className="grid grid-cols-3 gap-1.5">
          {/* PROVABLY FAIR DICE HUB */}
          <button
            type="button"
            onClick={() => {
              royalSound.playOptionClickSound();
              onOpenProvablyFair();
            }}
            className="px-2 py-1.5 rounded-lg bg-[#04120a] hover:bg-[#072414] border border-[#c8a668]/50 hover:border-[#f5dca8] transition-all flex flex-col items-center justify-center text-center group cursor-pointer shadow-sm active:scale-95"
          >
            <span className="text-xs group-hover:scale-110 transition-transform">🎲</span>
            <span className="font-cinzel text-[7.5px] font-black text-[#f5dca8] mt-0.5">
              تاس عادلانه
            </span>
            <span className="text-[6.5px] text-[#9ca3af]">SHA-256 Verified</span>
          </button>

          {/* SEASONAL LEADERBOARD */}
          <button
            type="button"
            onClick={() => {
              royalSound.playOptionClickSound();
              onOpenLeaderboard();
            }}
            className="px-2 py-1.5 rounded-lg bg-[#04120a] hover:bg-[#072414] border border-[#c8a668]/50 hover:border-[#f5dca8] transition-all flex flex-col items-center justify-center text-center group cursor-pointer shadow-sm active:scale-95"
          >
            <span className="text-xs group-hover:scale-110 transition-transform">📊</span>
            <span className="font-cinzel text-[7.5px] font-black text-[#f5dca8] mt-0.5">
              لیدربورد فصلی
            </span>
            <span className="text-[6.5px] text-[#9ca3af]">World Ranking</span>
          </button>

          {/* GAME VARIANTS */}
          <button
            type="button"
            onClick={() => {
              royalSound.playOptionClickSound();
              onOpenVariants();
            }}
            className="px-2 py-1.5 rounded-lg bg-[#04120a] hover:bg-[#072414] border border-[#c8a668]/50 hover:border-[#f5dca8] transition-all flex flex-col items-center justify-center text-center group cursor-pointer shadow-sm active:scale-95"
          >
            <span className="text-xs group-hover:scale-110 transition-transform">📜</span>
            <span className="font-cinzel text-[7.5px] font-black text-[#f5dca8] mt-0.5">
              سبک‌های نرد
            </span>
            <span className="text-[6.5px] text-[#9ca3af]">Tavla • Standard</span>
          </button>
        </div>
      </div>

      {/* RIGHT: INTERACTIVE 3D ROYAL BACKGAMMON TABLE SHOWCASE (میز سه‌بعدی سلطنتی با زاویه و مهره‌ها) */}
      <div className="relative z-10 w-full lg:w-[50%] h-full min-h-[220px] flex flex-col items-center justify-center rounded-2xl border-2 border-[#c8a668]/60 bg-gradient-to-b from-[#0b1f15] via-[#05140d] to-[#020a06] shadow-[0_15px_40px_rgba(0,0,0,0.95)] p-2.5 overflow-hidden">
        {/* Stage Lighting & Brass Corner Ornaments */}
        <div className="absolute top-1 left-1 w-6 h-6 border-t-2 border-l-2 border-[#c8a668]" />
        <div className="absolute top-1 right-1 w-6 h-6 border-t-2 border-r-2 border-[#c8a668]" />
        <div className="absolute bottom-1 left-1 w-6 h-6 border-b-2 border-l-2 border-[#c8a668]" />
        <div className="absolute bottom-1 right-1 w-6 h-6 border-b-2 border-r-2 border-[#c8a668]" />

        {/* Top Floating Controls on the 3D Stage */}
        <div className="absolute top-2 left-3 right-3 flex items-center justify-between z-20 pointer-events-auto">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#031109]/90 border border-[#c8a668]/50 text-[8px] font-cinzel text-[#f5dca8]">
            <span>⭐️</span>
            <span>ROYAL IMPERIAL 3D TABLE</span>
          </div>

          <button
            type="button"
            onClick={toggleBoardAngle}
            title="تغییر زاویه دید سه‌بعدی"
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#020d07] hover:bg-[#072414] border border-[#c8a668]/60 text-[#f5dca8] text-[7.5px] font-cinzel font-bold shadow transition-all active:scale-95 cursor-pointer"
          >
            <span>🔄</span>
            <span>ANGLE: {boardAngle.toUpperCase()}</span>
          </button>
        </div>

        {/* Central 3D Perspective Backgammon Board Showcase Container */}
        <div className="relative w-full max-w-[420px] aspect-[16/10] flex items-center justify-center my-1 perspective-[1100px]">
          <div
            className={`relative w-[92%] h-[92%] rounded-xl overflow-hidden border-[3px] border-[#c8a668] shadow-[0_20px_50px_rgba(0,0,0,0.95)] transition-all duration-700 cursor-pointer group ${
              boardAngle === 'perspective'
                ? 'rotate-x-25 -rotate-y-6 scale-95 shadow-[0_30px_60px_rgba(200,166,104,0.35)]'
                : boardAngle === 'isometric'
                ? 'rotate-x-45 rotate-z-12 scale-90'
                : 'rotate-x-0 scale-100'
            }`}
            onClick={() => {
              royalSound.playBoardOpenSound();
              onQuickPlay();
            }}
          >
            {/* Walnut & Emerald Felt Board Render with Points */}
            <img
              src={boardImperialImg}
              alt="تخته نرد سه‌بعدی سلطنتی گردو و زمرد"
              className="w-full h-full object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-700"
            />

            {/* Glowing Golden Medallion / Lion Sun Crest Center */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full border-2 border-[#ffd700] shadow-[0_0_25px_rgba(255,215,0,0.6)] overflow-hidden bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                <img
                  src={lionCrestImg}
                  alt="نشان سلطنتی شیر و خورشید با تاج"
                  className="w-full h-full object-cover opacity-90"
                />
              </div>
            </div>

            {/* Realistic Light Reflection & Wood Bevel */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-transparent to-white/15 pointer-events-none" />

            {/* Floating 3D Dice Graphic on Board Corner */}
            <div className="absolute bottom-3 right-4 flex items-center gap-1.5 pointer-events-none">
              <div className="w-5 h-5 rounded-[3px] bg-gradient-to-br from-[#ffffff] to-[#d6c7b2] border border-[#a89070] shadow-[0_4px_10px_rgba(0,0,0,0.8)] flex items-center justify-center transform -rotate-12">
                <span className="text-[10px] font-bold text-[#140e05]">⚅</span>
              </div>
              <div className="w-5 h-5 rounded-[3px] bg-gradient-to-br from-[#ffffff] to-[#d6c7b2] border border-[#a89070] shadow-[0_4px_10px_rgba(0,0,0,0.8)] flex items-center justify-center transform rotate-6">
                <span className="text-[10px] font-bold text-[#140e05]">⚄</span>
              </div>
            </div>

            {/* Doubling Cube Indicator */}
            <div className="absolute top-3 left-4 w-5 h-5 rounded-[3px] bg-[#1a1208] border border-[#c8a668] shadow-[0_4px_10px_rgba(0,0,0,0.8)] flex items-center justify-center pointer-events-none transform rotate-12">
              <span className="font-cinzel text-[7px] font-extrabold text-[#f5dca8]">64</span>
            </div>
          </div>
        </div>

        {/* Bottom Prominent CTA: Quick Play (ورود فوری به بازی) */}
        <div className="w-full flex items-center justify-between px-2 pt-1 border-t border-[#c8a668]/30">
          <div className="flex flex-col text-right">
            <span className="font-cinzel text-[8px] text-[#f5dca8] font-bold">
              بازیکن: {playerName}
            </span>
            <span className="font-cormorant text-[9px] text-[#52f29c]">
              ریتینگ جهانی: {playerRating} ELO • لول {playerLevel}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              royalSound.playOptionClickSound();
              onQuickPlay();
            }}
            className="px-5 py-2 rounded-xl brass-button-surface border border-[#fff0c4] font-cinzel text-xs font-black tracking-widest text-[#140e05] shadow-[0_6px_20px_rgba(200,166,104,0.6)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>شروع بازی فوری</span>
            <span className="text-sm">▶</span>
          </button>
        </div>
      </div>
    </div>
  );
}
