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
    <div className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col items-center overflow-hidden bg-[#020611] text-[#f5ead0] select-none">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img src={palaceNightStageBg} alt="Royal palace at night" className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020713]/45 via-[#020713]/15 to-black/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_54%,rgba(0,125,255,.22),transparent_48%)]" />
        <div className="royal-login-aura absolute left-1/2 top-[47%] h-[min(78vw,520px)] w-[min(78vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#e6bd65]/20" />
        <div className="royal-login-aura royal-login-aura-delayed absolute left-1/2 top-[47%] h-[min(92vw,620px)] w-[min(92vw,620px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#4aa8e8]/15" />
        <div className="royal-login-light absolute inset-x-[-30%] top-[42%] h-px bg-gradient-to-r from-transparent via-[#ffe4a0]/65 to-transparent" />
        <span className="royal-login-token royal-login-token-left absolute left-[9%] top-[34%]" aria-hidden="true" />
        <span className="royal-login-token royal-login-token-right absolute right-[10%] top-[62%]" aria-hidden="true" />
        <span className="royal-login-spark royal-login-spark-one absolute left-[18%] top-[19%]" aria-hidden="true" />
        <span className="royal-login-spark royal-login-spark-two absolute right-[17%] top-[27%]" aria-hidden="true" />
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
        <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center">
          <div className="relative z-20 flex h-full max-h-[620px] w-full items-center justify-center px-1 pb-1 pt-2">
            <ThreeDLoginBoard isOpening={isOpening} />
          </div>
          <div className="pointer-events-none absolute bottom-[2%] z-10 h-8 w-[78%] rounded-full bg-[#078dff]/35 blur-2xl sm:h-12" />
        </div>
      </main>

      <style>{`
        .royal-login-aura { box-shadow: 0 0 45px rgba(225,174,79,.08), inset 0 0 45px rgba(56,151,224,.07); animation: royal-aura-turn 24s linear infinite; }
        .royal-login-aura-delayed { border-style: dashed; animation-duration: 34s; animation-direction: reverse; }
        .royal-login-light { transform: rotate(-24deg); filter: blur(2px); animation: royal-light-pass 7s ease-in-out infinite; }
        .royal-login-token { width: 27px; height: 27px; border-radius: 50%; border: 2px solid rgba(255,220,145,.78); background: radial-gradient(circle at 32% 25%, #fff0c0, #bd842e 42%, #201407 76%); box-shadow: 0 0 18px rgba(255,190,78,.3), inset 0 0 0 3px rgba(20,13,5,.75); animation: royal-token-float 5s ease-in-out infinite; }
        .royal-login-token-right { width: 20px; height: 20px; animation-delay: -2.3s; }
        .royal-login-spark { width: 5px; height: 5px; border-radius: 50%; background: #ffe8a8; box-shadow: 0 0 12px 4px rgba(255,208,106,.55); animation: royal-spark 3s ease-in-out infinite; }
        .royal-login-spark-two { animation-delay: -1.4s; }
        @keyframes royal-aura-turn { to { transform: translate(-50%,-50%) rotate(360deg); } }
        @keyframes royal-light-pass { 0%,100% { opacity: 0; translate: -12% 0; } 45%,60% { opacity: .8; } }
        @keyframes royal-token-float { 0%,100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-17px) rotate(16deg); } }
        @keyframes royal-spark { 0%,100% { opacity: .25; transform: scale(.65); } 50% { opacity: 1; transform: scale(1.25); } }
        @media (prefers-reduced-motion: reduce) { .royal-login-aura, .royal-login-light, .royal-login-token, .royal-login-spark { animation: none !important; } }
      `}</style>
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
