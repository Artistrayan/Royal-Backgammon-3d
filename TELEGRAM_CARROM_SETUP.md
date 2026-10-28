# Royal Carrom inside Royal Games / Telegram

## Mini App URL

`https://artistrayan.github.io/Royal-Backgammon-3d/carrom/`

The Carrom page is stored in `public/carrom/index.html`, so the existing Royal Backgammon GitHub Pages workflow includes it in the same site. The Backgammon home lobby also has a **ROYAL CARROM** launcher that opens this route.

## Telegram setup

1. Wait for the GitHub Actions workflow **Deploy Royal Backgammon to GitHub Pages** to finish successfully after the commit.
2. Open the URL above in a browser first and confirm the board loads.
3. In Telegram, open the existing Royal Backgammon bot.
4. If the bot already opens the existing Mini App, use the new **ROYAL CARROM** button on the lobby.
5. To offer Carrom as a separate bot menu button instead, open `@BotFather`, choose the existing bot, and configure its menu button with the URL above. This replaces the bot's current menu-button destination, so the in-game launcher is the safer option if the main Backgammon launch must remain unchanged.

## Current scope

- Telegram WebApp SDK initialization, expand behavior, Telegram theme colors and touch controls are included.
- This is a browser-playable Carrom prototype; it is not yet a port of the full Kotlin Android game.
- Real-time matches between Telegram users, shared Backgammon accounts/wallets, matchmaking, and authoritative server-side game state are **not connected yet**. Those require a backend/API and server-side Telegram `initData` validation; client-provided Telegram user data alone must not be trusted for accounts, rewards, or payments.
