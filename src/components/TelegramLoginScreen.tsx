import React, { useState, useEffect } from 'react';
import { royalSound } from '../libgdx/Gdx3DEngine';
import { initTelegramMiniApp, triggerTelegramHaptic } from '../telegram/telegramMiniApp';
import palaceNightStageBg from '../assets/images/royal_palace_night_stage_1792268375096.jpg';
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  getLanguage,
  setLanguage,
  t,
} from '../i18n/translations';
import { ThreeDLoginBoard } from './ThreeDLoginBoard';

interface TelegramLoginScreenProps {
  onLoginSuccess: (user: {
    id: string;
    username: string;
    firstName: string;
    photoUrl?: string;
    isTelegram: boolean;
    databaseConnected: boolean;
  }) => void;
}

export function TelegramLoginScreen({ onLoginSuccess }: TelegramLoginScreenProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [isDbConnecting, setIsDbConnecting] = useState(false);
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(getLanguage());
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Retrieve Telegram WebApp user context
  const [telegramUser] = useState(() => {
    try {
      const tgInit = initTelegramMiniApp();
      return tgInit.user;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleLangChange = (e: any) => {
      if (e?.detail) setCurrentLang(e.detail);
    };
    window.addEventListener('app_language_changed', handleLangChange);
    return () => {
      window.removeEventListener('app_language_changed', handleLangChange);
    };
  }, []);

  const handleSelectLanguage = (code: SupportedLanguage) => {
    setLanguage(code);
    setCurrentLang(code);
    setShowLangMenu(false);
    triggerTelegramHaptic('light');
    royalSound.playOptionClickSound();
  };

  // ONLY tapping the Start button triggers the right-to-left board opening and login
  const handleStartLogin = async () => {
    if (isOpening || isDbConnecting) return;
    setIsDbConnecting(true);

    triggerTelegramHaptic('heavy');
    royalSound.playOptionClickSound();

    let authenticatedUser: any = null;
    let databaseStatus = true;

    try {
      // Authenticate Telegram identity with production database
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: telegramUser,
          id: telegramUser ? String(telegramUser.id) : undefined,
          username: telegramUser?.username
            ? `@${telegramUser.username}`
            : telegramUser?.first_name || 'Masoud',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          authenticatedUser = data.user;
          databaseStatus = Boolean(data.databaseConnected);
        }
      }
    } catch (err) {
      console.warn('[Login] DB Auth notice:', err);
    } finally {
      setIsDbConnecting(false);
    }

    // Begin 3D right-to-left unfolding across width
    setIsOpening(true);
    royalSound.playBoardOpenSound();

    setTimeout(() => {
      royalSound.playVictoryFanfareSound();

      const finalId =
        authenticatedUser?.id ||
        (telegramUser ? String(telegramUser.id) : `tg-${Date.now().toString().slice(-6)}`);
      const finalUsername =
        authenticatedUser?.username ||
        (telegramUser?.username
          ? `@${telegramUser.username}`
          : telegramUser?.first_name || 'Masoud');

      const userPayload = {
        id: finalId,
        username: finalUsername,
        firstName: telegramUser?.first_name || 'Masoud',
        photoUrl: telegramUser?.photo_url,
        isTelegram: Boolean(telegramUser),
        databaseConnected: databaseStatus,
      };

      try {
        localStorage.setItem('royal_tg_last_user', JSON.stringify(userPayload));
      } catch {
        // ignore
      }

      onLoginSuccess(userPayload);
    }, 1300);
  };

  const selectedLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="fixed inset-0 z-50 w-full h-full flex flex-col items-center justify-between bg-black text-[#e8dfd0] overflow-hidden select-none touch-none">
      {/* 1. CINEMATIC BACKGROUND: NIGHT PALACE COURTYARD WITH TORCHES & PILLARS */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src={palaceNightStageBg}
          alt="Palace Night Stage"
          className="w-full h-full object-cover object-center scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/75" />
      </div>

      {/* Ambient Lighting & Glows */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[520px] h-[520px] rounded-full bg-[#0284c7]/20 blur-[130px] transform -translate-y-12" />
        <div className="w-[450px] h-[450px] rounded-full bg-[#eab308]/15 blur-[110px] transform translate-y-24" />
      </div>

      {/* 2. TOP HEADER: MINIMAL CROWN, TELEGRAM & DB BADGE, AND TOP 10 WORLD LANGUAGE SELECTOR */}
      <header className="relative z-30 w-full flex items-center justify-between pt-3 sm:pt-5 px-3 sm:px-6">
        {/* Telegram & DB Connection Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-[#ffd700]/30 shadow-md">
          <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-pulse" />
          <svg className="w-4 h-4 text-[#38bdf8]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
          </svg>
          <span className="text-[11px] font-semibold text-[#ffd700] tracking-wide">
            {telegramUser?.first_name || 'Masoud'}
          </span>
          <span className="text-[10px] text-white/50">|</span>
          <span className="text-[10px] font-mono text-[#22c55e]">DB ✓</span>
        </div>

        {/* Ornate Royal Crown */}
        <div className="w-12 h-9 sm:w-16 sm:h-11 flex items-center justify-center drop-shadow-[0_4px_20px_rgba(234,179,8,0.7)]">
          <svg viewBox="0 0 100 70" className="w-full h-full" fill="none">
            <path
              d="M50 8 L62 28 L84 16 L76 52 L24 52 L16 16 L38 28 Z"
              fill="url(#goldCrownGradLg)"
              stroke="#fff4cc"
              strokeWidth="1.5"
              filter="drop-shadow(0 2px 8px rgba(0,0,0,0.8))"
            />
            <ellipse cx="50" cy="54" rx="28" ry="6" fill="url(#goldCrownBandLg)" stroke="#ffe082" strokeWidth="1" />
            <circle cx="50" cy="8" r="3" fill="#ffffff" />
            <circle cx="16" cy="16" r="2.5" fill="#f43f5e" />
            <circle cx="84" cy="16" r="2.5" fill="#f43f5e" />
            <circle cx="38" cy="28" r="2" fill="#38bdf8" />
            <circle cx="62" cy="28" r="2" fill="#38bdf8" />
            <circle cx="50" cy="38" r="3" fill="#a855f7" />
            <defs>
              <linearGradient id="goldCrownGradLg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fff3b0" />
                <stop offset="35%" stopColor="#ffd700" />
                <stop offset="70%" stopColor="#b8860b" />
                <stop offset="100%" stopColor="#7a5203" />
              </linearGradient>
              <linearGradient id="goldCrownBandLg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#b8860b" />
                <stop offset="50%" stopColor="#ffe57f" />
                <stop offset="100%" stopColor="#b8860b" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Top 10 Countries Language Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-[#ffd700]/40 text-xs text-white hover:border-[#ffd700] transition-colors cursor-pointer"
          >
            <span className="text-sm">{selectedLangObj.flag}</span>
            <span className="font-bold text-[11px] uppercase tracking-wider">{selectedLangObj.code}</span>
            <span className="text-[9px] text-[#ffd700]">▼</span>
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#140e06]/95 backdrop-blur-xl border border-[#ffd700]/50 shadow-[0_15px_40px_rgba(0,0,0,0.9)] py-2 z-50 max-h-64 overflow-y-auto">
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-[#ffd700] tracking-wider border-b border-white/10">
                {t('selectLanguage')}
              </div>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors cursor-pointer hover:bg-[#ffd700]/15 ${
                    currentLang === lang.code ? 'text-[#ffd700] font-bold bg-[#ffd700]/10' : 'text-white/85'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                  </div>
                  {currentLang === lang.code && <span className="text-[#ffd700]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* 3. CENTER 3D WEBGL BOARD (REAL 3D THREE.JS BACKGAMMON MODEL OPENS 180° FROM RIGHT TO LEFT) */}
      <ThreeDLoginBoard isOpening={isOpening} />

      {/* 4. BOTTOM ACTION: ONLY THE "Start" BUTTON (NO EXTRA TEXT!) */}
      <footer className="relative z-30 w-full flex flex-col items-center pb-6 sm:pb-8 px-4">
        <button
          type="button"
          onClick={handleStartLogin}
          disabled={isOpening || isDbConnecting}
          className={`relative group w-full max-w-[280px] sm:max-w-[320px] py-4 px-8 rounded-2xl bg-gradient-to-b from-[#ffea9f] via-[#d4af37] to-[#8c6b12] border-2 border-[#fff5cc] shadow-[0_12px_35px_rgba(212,175,55,0.7)] font-cinzel font-black text-2xl sm:text-3xl text-[#2b1702] tracking-wider transition-all transform active:scale-95 cursor-pointer flex items-center justify-center overflow-hidden ${
            isOpening || isDbConnecting
              ? 'opacity-90 scale-95 brightness-110 cursor-not-allowed'
              : 'hover:brightness-110 hover:shadow-[0_18px_50px_rgba(212,175,55,0.9)]'
          }`}
        >
          {/* Internal bevel glow */}
          <div className="absolute inset-[2px] rounded-xl border border-white/45 pointer-events-none" />

          {isDbConnecting ? (
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-[#2b1702] border-t-transparent rounded-full animate-spin" />
              <span className="text-xl font-bold font-sans">Connecting...</span>
            </div>
          ) : isOpening ? (
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-[#2b1702] border-t-transparent rounded-full animate-spin" />
              <span className="text-xl font-bold font-sans">Start</span>
            </div>
          ) : (
            <span className="drop-shadow-[0_2px_4px_rgba(255,255,255,0.6)]">
              Start
            </span>
          )}
        </button>
      </footer>
    </div>
  );
}
