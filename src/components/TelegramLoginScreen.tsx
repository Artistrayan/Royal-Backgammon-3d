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

  const [telegramUser] = useState(() => {
    try { return initTelegramMiniApp().user; } catch { return null; }
  });

  useEffect(() => {
    const handleLangChange = (e: any) => { if (e?.detail) setCurrentLang(e.detail); };
    window.addEventListener('app_language_changed', handleLangChange);
    return () => window.removeEventListener('app_language_changed', handleLangChange);
  }, []);

  const handleSelectLanguage = (code: SupportedLanguage) => {
    setLanguage(code);
    setCurrentLang(code);
    setShowLangMenu(false);
    triggerTelegramHaptic('light');
    royalSound.playOptionClickSound();
  };

  const handleStartLogin = async () => {
    if (isOpening || isDbConnecting) return;
    setIsDbConnecting(true);
    setIsOpening(true);
    triggerTelegramHaptic('heavy');
    royalSound.playOptionClickSound();
    royalSound.playBoardOpenSound();

    let authenticatedUser: any = null;
    let databaseStatus = true;
    try {
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: telegramUser,
          id: telegramUser ? String(telegramUser.id) : undefined,
          username: telegramUser?.username ? `@${telegramUser.username}` : telegramUser?.first_name || 'Masoud',
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

    setTimeout(() => {
      royalSound.playVictoryFanfareSound();
      const finalId = authenticatedUser?.id || (telegramUser ? String(telegramUser.id) : `tg-${Date.now().toString().slice(-6)}`);
      const finalUsername = authenticatedUser?.username || (telegramUser?.username ? `@${telegramUser.username}` : telegramUser?.first_name || 'Masoud');
      const userPayload = {
        id: finalId,
        username: finalUsername,
        firstName: telegramUser?.first_name || 'Masoud',
        photoUrl: telegramUser?.photo_url,
        isTelegram: Boolean(telegramUser),
        databaseConnected: databaseStatus,
      };
      try { localStorage.setItem('royal_tg_last_user', JSON.stringify(userPayload)); } catch { /* ignore */ }
      onLoginSuccess(userPayload);
    }, 1300);
  };

  const selectedLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-[#03070d] text-[#f5ead0] select-none">
      <div className="pointer-events-none absolute inset-0">
        <img src={palaceNightStageBg} alt="" className="h-full w-full object-cover object-center opacity-35" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,15,.78)_0%,rgba(3,8,16,.36)_38%,rgba(1,4,9,.88)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_48%,rgba(14,93,145,.24),transparent_52%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d9ad59]/65 to-transparent" />
      </div>

      <header className="relative z-30 flex w-full shrink-0 items-center justify-between px-5 pt-[max(16px,env(safe-area-inset-top))] sm:px-8 sm:pt-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#d8ad61]/65 bg-[#100d08]/80 shadow-[0_0_22px_rgba(218,169,78,.16),inset_0_0_12px_rgba(255,222,155,.08)]">
            <svg viewBox="0 0 40 40" className="h-7 w-7 text-[#f4d58f]" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
              <circle cx="20" cy="20" r="13.5" />
              <circle cx="20" cy="20" r="8.5" />
              <path d="M20 3v5M20 32v5M3 20h5M32 20h5M8 8l3.5 3.5M28.5 28.5 32 32M32 8l-3.5 3.5M11.5 28.5 8 32" />
              <path d="m20 13 2.1 4.8 5.2.5-3.9 3.4 1.1 5.1-4.5-2.6-4.5 2.6 1.1-5.1-3.9-3.4 5.2-.5L20 13Z" fill="currentColor" fillOpacity=".18" />
            </svg>
          </div>
          <div className="leading-none">
            <div className="font-cinzel text-[15px] font-black tracking-[.2em] text-[#f4dfb0] sm:text-lg">ROYAL</div>
            <div className="mt-1.5 text-[9px] font-semibold tracking-[.28em] text-[#c69a50] sm:text-[10px]">BACKGAMMON</div>
          </div>
        </div>

        <div className="relative">
          <button type="button" onClick={() => setShowLangMenu(!showLangMenu)} aria-label="Change language" className="flex items-center gap-2 rounded-full border border-[#d8ad61]/35 bg-[#080d14]/80 px-3.5 py-2 text-xs text-[#f4e6c9] shadow-[0_5px_18px_rgba(0,0,0,.28)] backdrop-blur-xl transition-colors hover:border-[#eac77d]/70">
            <span>{selectedLangObj.flag}</span><span className="font-bold uppercase tracking-wider">{selectedLangObj.code}</span><span className="text-[9px] text-[#dcb766]">▾</span>
          </button>
          {showLangMenu && (
            <div className="absolute right-0 z-50 mt-2 max-h-64 w-48 overflow-y-auto rounded-2xl border border-[#d8ad61]/45 bg-[#090d13]/95 py-2 shadow-2xl backdrop-blur-xl">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button key={lang.code} type="button" onClick={() => handleSelectLanguage(lang.code)} className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors hover:bg-[#d8ad61]/10 ${currentLang === lang.code ? 'font-bold text-[#f3d58e]' : 'text-white/80'}`}>
                  <span>{lang.flag}</span><span>{lang.nativeName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 w-full flex-1 flex-col items-center justify-center px-3 pt-2">
        <div className="mb-1 shrink-0 text-center">
          <div className="text-[9px] font-semibold tracking-[.34em] text-[#b58c4a] sm:text-[10px]">THE ROYAL TABLE AWAITS</div>
          <div className="mt-1 h-px w-24 bg-gradient-to-r from-transparent via-[#d4aa61]/70 to-transparent" />
        </div>

        <div className="relative flex min-h-0 w-full max-w-[760px] flex-1 items-center justify-center">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(88vw,560px)] w-[min(88vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0879c9]/12 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-[7%] bottom-[7%] h-8 rounded-[50%] bg-[#d6a64e]/10 blur-2xl" />
          <div className="relative z-10 h-full max-h-[min(64vh,650px)] w-full overflow-visible">
            <ThreeDLoginBoard isOpening={isOpening} />
          </div>
        </div>
      </main>

      <footer className="relative z-30 flex w-full shrink-0 flex-col items-center px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-1 sm:pb-8">
        <div className="mb-3 flex items-center gap-2 text-[9px] font-medium tracking-[.22em] text-[#a88a5b]">
          <span className="h-px w-7 bg-gradient-to-r from-transparent to-[#b98c43]/70" />
          STRATEGY • HONOUR • TRADITION
          <span className="h-px w-7 bg-gradient-to-l from-transparent to-[#b98c43]/70" />
        </div>
        <button
          type="button"
          onClick={handleStartLogin}
          disabled={isOpening || isDbConnecting}
          className={`group relative flex w-full max-w-[350px] items-center justify-center gap-3 overflow-hidden rounded-2xl border border-[#f0d18d] bg-[linear-gradient(180deg,#f1d89d_0%,#c28b38_48%,#805019_100%)] px-8 py-4 font-cinzel text-xl font-black tracking-[.12em] text-[#211505] shadow-[0_0_0_3px_rgba(91,58,19,.72),0_12px_34px_rgba(0,0,0,.55),0_0_34px_rgba(211,159,68,.2)] transition-all active:scale-[.985] sm:py-[18px] sm:text-2xl ${isOpening || isDbConnecting ? 'opacity-80' : 'hover:brightness-110'}`}
        >
          <span className="pointer-events-none absolute inset-[3px] rounded-[11px] border border-[#fff3ce]/45" />
          {isDbConnecting || isOpening ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#39240a] border-t-transparent" /> : null}
          <span className="relative">{isDbConnecting ? 'Connecting…' : isOpening ? 'Entering…' : 'ورود به بازی'}</span>
          {!isDbConnecting && !isOpening && <span className="relative text-2xl leading-none">↗</span>}
        </button>
        <div className="mt-3 text-[9px] tracking-[.12em] text-white/35">ROYAL BACKGAMMON 3D</div>
      </footer>
    </div>
  );
}
