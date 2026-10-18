import React, { useState } from 'react';
import palaceNightStageBg from '../assets/images/royal_palace_night_stage_1792268375096.jpg';
import cardPlayGoldImg from '../assets/images/card_play_lion_gold_1792268393216.jpg';
import cardTournamentsSilverImg from '../assets/images/card_tournaments_silver_1792268408315.jpg';
import { royalSound } from '../libgdx/Gdx3DEngine';
import { triggerTelegramHaptic } from '../telegram/telegramMiniApp';

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
  onOpenProfile: () => void;
  onOpenWallet: () => void;
  onOpenStore: () => void;
  onOpenSettings: () => void;
  onOpenSupport: () => void;
  onClaimDailyReward: () => void;
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
  onOpenProfile,
  onOpenWallet,
  onOpenStore,
  onOpenSettings,
  onOpenSupport,
  onClaimDailyReward,
}: RoyalBackgammonHomeLobbyProps) {
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(2);
  const [dragStartX, setDragStartX] = useState(0);

  const cards = [
    { id: 'practice', title: 'Practice', image: cardTournamentsSilverImg, onClick: onOpenPractice },
    { id: 'tournaments', title: 'Tournaments', image: cardTournamentsSilverImg, onClick: onOpenTournaments },
    { id: 'play', title: 'Play', image: cardPlayGoldImg, onClick: onPlayOneOnOne },
    { id: 'friends', title: 'Friends', image: cardTournamentsSilverImg, onClick: onOpenFriends },
    { id: 'special', title: 'Special', image: cardTournamentsSilverImg, onClick: onOpenVariants },
  ];

  const handlePointerDown = (e: React.PointerEvent) => setDragStartX(e.clientX);
  const handlePointerUp = (e: React.PointerEvent) => {
    const delta = e.clientX - dragStartX;
    if (Math.abs(delta) > 50) {
      setSelectedCardIndex((prev) => (delta > 0 ? Math.max(0, prev - 1) : Math.min(cards.length - 1, prev + 1)));
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-black text-white font-sans overflow-hidden select-none" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
      <div className="absolute inset-0 z-0">
        <img src={palaceNightStageBg} alt="Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />
      </div>

      <header className="relative z-30 w-full h-14 px-4 flex items-center justify-between">
        <div className="text-sm">Welcome, {playerName}</div>
        <div className="text-sm">Coins: {userCoins} | USDT: {userUsdt}</div>
      </header>

      <div className="relative z-10 h-[75vh] w-full flex items-center justify-center perspective-[1000px] overflow-hidden">
        <div className="relative w-full h-[300px] flex items-center justify-center">
          {cards.map((card, idx) => {
            const angleStep = (Math.PI * 1.2) / cards.length;
            const startAngle = -Math.PI / 1.8;
            const angle = startAngle + idx * angleStep - (selectedCardIndex * angleStep);
            const radius = 200;
            const x = Math.sin(angle) * radius;
            const z = -Math.cos(angle) * radius;
            const isCenter = idx === selectedCardIndex;

            return (
              <div
                key={card.id}
                onClick={card.onClick}
                className="absolute w-[180px] h-[270px] rounded-2xl cursor-pointer shadow-2xl transition-all duration-500"
                style={{
                  transform: `translateX(${x}px) translateZ(${z}px) rotateY(${angle * 50}deg) scale(${isCenter ? 1.1 : 0.7})`,
                  opacity: isCenter ? 1 : 0.5,
                  zIndex: isCenter ? 50 : 20 - Math.abs(idx - selectedCardIndex),
                }}
              >
                <img src={card.image} alt={card.title} className="w-full h-full object-cover rounded-2xl border-2 border-[#d4af37]" />
                <div className="absolute bottom-2 left-0 right-0 text-center font-black">{card.title}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
