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
    triggerTelegramHaptic('heavy');
    royalSound.playOptionClickSound();

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

    setIsOpening(true);
    royalSound.playBoardOpenSound();
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
    <div className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col items-center overflow-hidden bg-[#020611] text-[#f5ead0] select-none">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img src={palaceNightStageBg} alt="Royal palace at night" className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020713]/45 via-[#020713]/15 to-black/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_54%,rgba(0,125,255,.22),transparent_48%)]" />
      </div>

      <header className="relative z-30 flex w-full items-center justify-end px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="relative">
          <button type="button" onClick={() => setShowLangMenu(!showLangMenu)} className="flex items-center gap-1.5 rounded-full border border-[#e7bf62]/45 bg-black/65 px-3 py-1.5 text-xs text-white backdrop-blur-md">
            <span>{selectedLangObj.flag}</span><span className="font-bold uppercase tracking-wider">{selectedLangObj.code}</span><span className="text-[9px] text-[#ffd700]">▼</span>
          </button>
          {showLangMenu && (
            <div className="absolute right-0 z-50 mt-2 max-h-64 w-48 overflow-y-auto rounded-xl border border-[#ffd700]/50 bg-[#140e06]/95 py-2 shadow-2xl backdrop-blur-xl">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button key={lang.code} type="button" onClick={() => handleSelectLanguage(lang.code)} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[#ffd700]/15 ${currentLang === lang.code ? 'font-bold text-[#ffd700]' : 'text-white/85'}`}>
                  <span>{lang.flag}</span><span>{lang.nativeName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 w-full flex-1 flex-col items-center">
        <div className="relative z-30 mt-1 flex flex-col items-center text-center sm:mt-0">
          <div className="relative mb-1 text-[#ffd36a] drop-shadow-[0_4px_12px_rgba(255,177,35,.65)]">
            <svg viewBox="0 0 220 74" className="h-12 w-40 sm:h-[66px] sm:w-[190px]" fill="none" aria-hidden="true">
              <path d="M110 8L121 25L145 14L139 39H81L75 14L99 25Z" fill="url(#royalGold)" stroke="#fff0b3" strokeWidth="2"/>
              <path d="M82 43Q110 57 138 43L133 51Q110 63 87 51Z" fill="url(#royalGold)" stroke="#e4ad38"/>
              <path d="M110 2V13M103 7H117" stroke="#ffe8a0" strokeWidth="2"/>
              <path d="M28 55Q48 43 67 53M192 55Q172 43 153 53" stroke="#dca63d" strokeWidth="3" strokeLinecap="round"/>
              <defs><linearGradient id="royalGold" x1="65" y1="5" x2="155" y2="60"><stop stopColor="#fff1a6"/><stop offset=".42" stopColor="#f4bd3f"/><stop offset=".72" stopColor="#b87514"/><stop offset="1" stopColor="#ffe58b"/></linearGradient></defs>
            </svg>
          </div>
          <div className="font-cinzel text-[clamp(27px,5vw,48px)] font-black leading-[.9] tracking-[.08em] text-[#ffdc7c] drop-shadow-[0_4px_4px_rgba(0,0,0,.95)]" style={{ WebkitTextStroke: '0.5px #7b4b08' }}>ROYAL</div>
          <div className="mt-1 rounded-md border-y border-[#b9872e]/70 px-3 py-0.5 font-cinzel text-[clamp(17px,3vw,27px)] font-black leading-none text-[#ffe4a0] drop-shadow-[0_3px_5px_black]">BACKGAMMON</div>
          <div className="mt-1 flex items-center gap-2 font-cinzel text-sm font-black tracking-[.35em] text-[#ffcc5a] sm:text-lg"><span className="h-px w-8 bg-[#e4ad38]"/>3D<span className="h-px w-8 bg-[#e4ad38]"/></div>
        </div>

        <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center">
          <div className="pointer-events-none absolute top-[3%] z-10 flex h-[clamp(78px,15vh,142px)] w-[clamp(78px,15vh,142px)] items-center justify-center rounded-full border-[5px] border-[#168eea] bg-gradient-to-br from-[#37c0ff] via-[#087be0] to-[#003caa] shadow-[0_0_30px_rgba(0,145,255,.9),inset_0_0_22px_rgba(255,255,255,.4)]">
            <svg viewBox="0 0 24 24" className="ml-[-3px] h-[55%] w-[55%] text-white drop-shadow-lg" fill="currentColor"><path d="M21.7 2.3 2.9 9.6c-1.3.5-1.3 1.3-.2 1.6l4.8 1.5 1.8 5.5c.2.6.1.8.8.8.5 0 .7-.2 1-.5l2.3-2.2 4.8 3.5c.9.5 1.6.3 1.8-.8l3.1-14.9c.3-1.4-.5-2-1.4-1.3ZM9 12.4l9.5-6c.5-.3.9-.1.5.2l-7.8 7.1-.3 3.3L9 12.4Z"/></svg>
          </div>
          <div className="relative z-20 flex h-full max-h-[500px] w-full items-center justify-center px-1 pb-1 pt-2">
            <ThreeDLoginBoard isOpening={isOpening} />
          </div>
          <div className="pointer-events-none absolute bottom-[2%] z-10 h-8 w-[78%] rounded-full bg-[#078dff]/35 blur-2xl sm:h-12" />
        </div>
      </main>

      <footer className="relative z-30 flex w-full justify-center px-4 pb-[max(22px,env(safe-area-inset-bottom))] pt-2 sm:pb-8">
        <button
          type="button"
          onClick={handleStartLogin}
          disabled={isOpening || isDbConnecting}
          className={`group relative flex w-full max-w-[330px] items-center justify-center gap-3 overflow-hidden rounded-[24px] border-[3px] border-[#ffe6a0] bg-gradient-to-b from-[#ffe49a] via-[#bd811f] to-[#432307] px-8 py-3.5 font-cinzel text-2xl font-black tracking-wide text-[#fff4d0] shadow-[0_0_0_2px_#8b5a17,0_10px_35px_rgba(0,145,255,.45),0_8px_30px_rgba(224,156,36,.5)] transition-all active:scale-[.98] sm:py-4 sm:text-3xl ${isOpening || isDbConnecting ? 'opacity-80' : 'hover:brightness-110'}`}
        >
          <span className="pointer-events-none absolute inset-[3px] rounded-[18px] border border-[#fff2c4]/60" />
          {isDbConnecting || isOpening ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
          <span className="relative drop-shadow-[0_2px_3px_rgba(0,0,0,.7)]">{isDbConnecting ? 'Connecting…' : isOpening ? 'Entering…' : 'ورود'}</span>
          {!isDbConnecting && !isOpening && <span className="relative text-3xl leading-none text-[#ffe7a1]">›</span>}
        </button>
      </footer>
    </div>
  );
}
