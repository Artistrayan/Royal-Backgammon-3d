import React, { useState } from 'react';
import { royalSound } from '../libgdx/Gdx3DEngine';
import { initTelegramMiniApp, triggerTelegramHaptic } from '../telegram/telegramMiniApp';
import royalClosedBoardImg from '../assets/images/royal_closed_board_gold_lion.jpg';

interface TelegramLoginScreenProps {
  onLoginSuccess: (user: {
    id: string;
    username: string;
    firstName: string;
    photoUrl?: string;
    isTelegram: boolean;
  }) => void;
}

export function TelegramLoginScreen({ onLoginSuccess }: TelegramLoginScreenProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [telegramUser] = useState(() => {
    try {
      const tgInit = initTelegramMiniApp();
      return tgInit.user;
    } catch {
      return null;
    }
  });

  const handleLogin = () => {
    if (isOpening) return;
    setIsOpening(true);

    triggerTelegramHaptic('heavy');
    royalSound.playOptionClickSound();
    royalSound.playBoardFoldSound();

    // Opening animation transition: board flips open, then navigates to home
    setTimeout(() => {
      royalSound.playVictoryFanfareSound();
      const finalId = telegramUser ? String(telegramUser.id) : `tg-${Date.now().toString().slice(-6)}`;
      const finalUsername = telegramUser?.username
        ? `@${telegramUser.username}`
        : telegramUser?.first_name || 'ROYAL_PLAYER';

      const userPayload = {
        id: finalId,
        username: finalUsername,
        firstName: telegramUser?.first_name || 'ROYAL_PLAYER',
        photoUrl: telegramUser?.photo_url,
        isTelegram: Boolean(telegramUser),
      };

      try {
        localStorage.setItem('royal_tg_verified', 'true');
        localStorage.setItem('royal_tg_last_user', JSON.stringify(userPayload));
      } catch {
        // ignore
      }

      onLoginSuccess(userPayload);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-gradient-to-b from-[#030a06] via-[#05140d] to-[#010603] text-[#e8dfd0] overflow-hidden select-none">
      {/* Background Ambient Table Glow (Pure Dark Gold & Emerald Velvet, No Red/Green flag stripes) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[600px] h-[600px] rounded-full bg-[#1b3d29]/20 blur-[130px]" />
        <div className="w-[380px] h-[380px] rounded-full bg-[#c8a668]/12 blur-[100px]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[560px] flex flex-col items-center text-center">
        
        {/* Board Display Area with Telegram Icon Behind */}
        <div className="relative w-full max-w-[420px] aspect-[4/3] flex items-center justify-center mb-4 perspective-[1000px]">
          
          {/* Subtle Glowing Telegram Watermark Icon Behind the Board */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
            <div className="w-52 h-52 rounded-full bg-[#24A1DE]/20 blur-xl absolute" />
            <svg
              className="w-44 h-44 text-[#24A1DE] drop-shadow-[0_0_35px_rgba(36,161,222,0.45)]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
          </div>

          {/* Luxury Closed Backgammon Board with Golden Lion & Sun with Crown */}
          <div
            className={`relative w-full h-full rounded-2xl overflow-hidden border-[3px] border-[#c8a668] shadow-[0_20px_50px_rgba(0,0,0,0.95)] transition-all duration-700 ease-out cursor-pointer group ${
              isOpening
                ? 'rotate-x-70 scale-95 opacity-20 -translate-y-8 brightness-150'
                : 'hover:scale-[1.02] hover:shadow-[0_25px_60px_rgba(200,166,104,0.3)]'
            }`}
            onClick={handleLogin}
          >
            <img
              src={royalClosedBoardImg}
              alt="تخته نرد بسته سلطنتی شیر و خورشید با تاج"
              className="w-full h-full object-cover object-center scale-105 transition-transform duration-500 group-hover:scale-110"
            />
            {/* Elegant Glass Reflection & Brass Edges */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/10 pointer-events-none" />
            
            {/* Opening Lid Hinge Animation Overlay */}
            {isOpening && (
              <div className="absolute inset-0 bg-gradient-to-b from-[#ffe4a0]/40 to-transparent animate-pulse pointer-events-none" />
            )}
          </div>
        </div>

        {/* Telegram User Welcome Label if detected */}
        {telegramUser && (
          <div className="mb-2 flex items-center gap-2 px-3 py-1 rounded-full bg-[#03140b] border border-[#c8a668]/40">
            <span className="w-2 h-2 rounded-full bg-[#52f29c] animate-ping" />
            <span className="font-cinzel text-[11px] font-bold text-[#f5dca8]">
              {telegramUser.first_name} {telegramUser.username ? `(@${telegramUser.username})` : ''}
            </span>
          </div>
        )}

        {/* Prominent Login Button (ورود به بازی) */}
        <button
          type="button"
          onClick={handleLogin}
          disabled={isOpening}
          className={`w-full max-w-[340px] py-3.5 px-6 rounded-xl brass-button-surface border-2 border-[#fff0c4] font-cinzel text-sm sm:text-base font-extrabold tracking-[0.2em] text-[#140e05] shadow-[0_10px_30px_rgba(200,166,104,0.5)] transition-all transform active:scale-95 cursor-pointer uppercase flex items-center justify-center gap-3 ${
            isOpening ? 'opacity-80 scale-95 brightness-110' : 'hover:brightness-110 hover:shadow-[0_12px_40px_rgba(200,166,104,0.7)]'
          }`}
        >
          {isOpening ? (
            <>
              <span className="w-4 h-4 border-2 border-[#140e05] border-t-transparent rounded-full animate-spin" />
              <span>در حال باز شدن تخته...</span>
            </>
          ) : (
            <>
              <span>ورود به بازی</span>
              <span className="text-lg">▶</span>
            </>
          )}
        </button>

        <p className="mt-2.5 font-cormorant text-[12px] text-[#a8a193]">
          کلیک کنید تا درب تخته سلطنتی باز شده و وارد تالار بازی شوید
        </p>
      </div>
    </div>
  );
}
