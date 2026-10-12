/**
 * Royal Backgammon 3D — Official Telegram Bot & Mini App Launcher
 *
 * Usage:
 *   BOT_TOKEN="YOUR_BOTFATHER_TOKEN" WEBAPP_URL="https://your-deployed-url.run.app" node telegram-bot-launcher.mjs
 */

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const WEBAPP_URL =
  process.env.WEBAPP_URL ||
  'https://ais-pre-v4m54pztrqbxiof4sthcfj-6902038885.europe-west3.run.app';

if (!BOT_TOKEN) {
  console.log('==========================================================');
  console.log('ROYAL BACKGAMMON 3D - TELEGRAM MINI APP BOT LAUNCHER');
  console.log('==========================================================');
  console.log('To connect your Telegram Bot automatically, run:');
  console.log(
    `BOT_TOKEN="<YOUR_BOT_TOKEN>" WEBAPP_URL="${WEBAPP_URL}" node telegram-bot-launcher.mjs`
  );
  console.log('\nOr configure directly in @BotFather:');
  console.log('1. /newapp -> Select your bot -> Paste URL:', WEBAPP_URL);
  console.log('2. /setmenubutton -> Select your bot -> Paste URL:', WEBAPP_URL);
  process.exit(0);
}

const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function callTelegramApi(method, payload) {
  const res = await fetch(`${API_BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function setupTelegramMiniApp() {
  console.log('Configuring Telegram Mini App Menu Button & Commands...');

  await callTelegramApi('setMyCommands', {
    commands: [
      { command: 'start', description: 'Open Royal Backgammon 3D' },
      { command: 'play', description: 'Launch 3D Backgammon Table' },
    ],
  });

  await callTelegramApi('setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: 'PLAY 3D BACKGAMMON',
      web_app: { url: WEBAPP_URL },
    },
  });

  console.log('Telegram Menu Button configured with WebApp URL:', WEBAPP_URL);
  console.log('Starting long-polling listener for /start and /play...');

  let offset = 0;
  while (true) {
    try {
      const data = await callTelegramApi('getUpdates', {
        offset,
        timeout: 25,
      });
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          const msg = update.message;
          if (msg && msg.chat && msg.text) {
            await callTelegramApi('sendMessage', {
              chat_id: msg.chat.id,
              text: '👑 *ROYAL BACKGAMMON 3D*\nYour luxury 3D Walnut & Emerald Backgammon table awaits. Tap below to enter in landscape 3D mode:',
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '🎲 TAKE YOUR SEAT (3D TABLE)',
                      web_app: { url: WEBAPP_URL },
                    },
                  ],
                ],
              },
            });
          }
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

setupTelegramMiniApp();
