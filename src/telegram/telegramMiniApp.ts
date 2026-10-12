/**
 * Official Telegram Mini App (Telegram.WebApp) Runtime & Publishing Utilities
 */

export interface TelegramWebAppUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface TelegramHapticFeedback {
  impactOccurred: (
    style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
  ) => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
}

interface TelegramBackButton {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
}

interface TelegramCloudStorage {
  setItem: (
    key: string,
    value: string,
    callback?: (err: Error | null, stored?: boolean) => void
  ) => void;
  getItem: (
    key: string,
    callback: (err: Error | null, value?: string) => void
  ) => void;
}

export interface TelegramWebAppInstance {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramWebAppUser;
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  HapticFeedback?: TelegramHapticFeedback;
  BackButton?: TelegramBackButton;
  CloudStorage?: TelegramCloudStorage;
  ready: () => void;
  expand: () => void;
  close: () => void;
  requestFullscreen?: () => void;
  exitFullscreen?: () => void;
  lockOrientation?: (orientation?: string) => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  openTelegramLink?: (url: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebAppInstance;
    };
  }
}

export function getTelegramWebApp(): TelegramWebAppInstance | null {
  if (typeof window === 'undefined') return null;
  const tg = window.Telegram?.WebApp;
  if (!tg) return null;
  return tg;
}

export function isRunningInsideTelegram(): boolean {
  const tg = getTelegramWebApp();
  if (!tg) return false;
  return Boolean(
    (tg.initData && tg.initData.length > 0) ||
      tg.initDataUnsafe?.user ||
      (tg.platform && tg.platform !== 'unknown')
  );
}

export function initTelegramMiniApp(): {
  isTelegram: boolean;
  platform: string;
  version: string;
  user: TelegramWebAppUser | null;
} {
  const tg = getTelegramWebApp();
  if (!tg) {
    return {
      isTelegram: false,
      platform: 'web',
      version: '1.0',
      user: null,
    };
  }

  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.('#05110c');
    tg.setBackgroundColor?.('#020705');
    tg.disableVerticalSwipes?.();
    tg.lockOrientation?.('landscape');
  } catch {
    // Ignore unsupported methods on older Telegram clients
  }

  return {
    isTelegram: isRunningInsideTelegram(),
    platform: tg.platform || 'web',
    version: tg.version || '8.0',
    user: tg.initDataUnsafe?.user || null,
  };
}

export function requestTelegramFullscreen(): boolean {
  const tg = getTelegramWebApp();
  try {
    if (tg?.requestFullscreen) {
      tg.requestFullscreen();
      return true;
    }
    if (typeof document !== 'undefined' && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
      return true;
    }
  } catch {
    // Ignore fullscreen errors
  }
  return false;
}

export function triggerTelegramHaptic(
  style: 'light' | 'medium' | 'heavy' | 'success' = 'light',
  enabled = true
) {
  if (!enabled || typeof window === 'undefined') return;
  const tg = getTelegramWebApp();
  try {
    if (tg?.HapticFeedback) {
      if (style === 'success') {
        tg.HapticFeedback.notificationOccurred('success');
      } else {
        tg.HapticFeedback.impactOccurred(style);
      }
      return;
    }
    if (navigator.vibrate) {
      navigator.vibrate(style === 'heavy' ? 22 : 10);
    }
  } catch {
    // Ignore haptic error
  }
}

let activeBackHandler: (() => void) | null = null;

export function syncTelegramBackButton(
  shouldShow: boolean,
  onBack: () => void
) {
  const tg = getTelegramWebApp();
  const backBtn = tg?.BackButton;
  if (!backBtn) return;

  try {
    if (activeBackHandler) {
      backBtn.offClick(activeBackHandler);
      activeBackHandler = null;
    }

    if (shouldShow) {
      activeBackHandler = onBack;
      backBtn.onClick(activeBackHandler);
      backBtn.show();
    } else {
      backBtn.hide();
    }
  } catch {
    // Ignore if BackButton not supported in current version
  }
}

export function saveStateToTelegramCloud(key: string, jsonString: string) {
  const tg = getTelegramWebApp();
  if (!tg?.CloudStorage || !isRunningInsideTelegram()) return;
  try {
    // Telegram CloudStorage values have a 4096-character limit per key
    if (jsonString.length <= 4000) {
      tg.CloudStorage.setItem(key, jsonString);
    }
  } catch {
    // Ignore CloudStorage quota errors
  }
}

export function loadStateFromTelegramCloud(
  key: string,
  onLoaded: (jsonString: string) => void
) {
  const tg = getTelegramWebApp();
  if (!tg?.CloudStorage || !isRunningInsideTelegram()) return;
  try {
    tg.CloudStorage.getItem(key, (err, value) => {
      if (!err && value && value.length > 2) {
        onLoaded(value);
      }
    });
  } catch {
    // Ignore CloudStorage read errors
  }
}

export function shareGameOnTelegram(appUrl: string, playerName: string): string {
  const text = `👑 Join ${playerName} at the Royal Backgammon 3D Table! Play standard 3D Backgammon directly in Telegram:`;
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(
    appUrl
  )}&text=${encodeURIComponent(text)}`;

  const tg = getTelegramWebApp();
  try {
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    }
  } catch {
    // Fallback handled by caller
  }
  return shareUrl;
}

export function downloadTelegramPublishBundle(appUrl: string) {
  const bundle = {
    app_title: 'Royal Backgammon 3D',
    short_name: 'royal_backgammon',
    webapp_url: appUrl,
    orientation: 'landscape',
    telegram_sdk: 'https://telegram.org/js/telegram-web-app.js',
    botfather_quick_setup: {
      step_1: 'Open @BotFather in Telegram and send /newapp',
      step_2: 'Select your Bot and enter Title: Royal Backgammon 3D',
      step_3: `Enter Web App URL: ${appUrl}`,
      step_4: 'Enter Short Name: royal_backgammon',
      step_5: `Send /setmenubutton to @BotFather -> Select Bot -> Enter URL: ${appUrl} -> Title: PLAY 3D BACKGAMMON`,
    },
    bot_api_menu_button_payload: {
      menu_button: {
        type: 'web_app',
        text: 'PLAY 3D BACKGAMMON',
        web_app: {
          url: appUrl,
        },
      },
    },
  };

  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'royal-backgammon-telegram-config.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadTelegramBotScript(appUrl: string) {
  const scriptContent = `/**
 * Royal Backgammon 3D — Official Telegram Bot & Mini App Launcher
 * Run with: BOT_TOKEN="YOUR_BOT_TOKEN" node telegram-bot-launcher.mjs
 */
const BOT_TOKEN = process.env.BOT_TOKEN || "PASTE_YOUR_BOTFATHER_TOKEN_HERE";
const WEBAPP_URL = process.env.WEBAPP_URL || "${appUrl}";
const API_BASE = \`https://api.telegram.org/bot\${BOT_TOKEN}\`;

async function callApi(method, body) {
  const res = await fetch(\`\${API_BASE}/\${method}\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function startBot() {
  await callApi("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "PLAY 3D BACKGAMMON",
      web_app: { url: WEBAPP_URL },
    },
  });
  console.log("Royal Backgammon 3D Menu Button registered for:", WEBAPP_URL);
}

startBot();
`;

  const blob = new Blob([scriptContent], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'telegram-bot-launcher.mjs';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
