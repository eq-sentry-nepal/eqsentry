# Deploying the EQ Sentry backend (`server/`)

The static site runs standalone. Deploying this Node backend unlocks: browser push
alerts, SMS alerts (Sparrow), the Telegram channel, community felt reports, the
subscriber counter, and server-side status history.

## 1. Host (Render.com free tier shown; Fly.io/Railway work the same)
1. render.com → New → **Web Service** → connect `eq-sentry-nepal/eqsentry`.
2. Root Directory: `server` · Build: `npm install` · Start: `npm start`.
3. Instance type: Free.

## 2. Environment variables (Render → Environment)
| Key | Value |
|---|---|
| `VAPID_PUBLIC` / `VAPID_PRIVATE` | run `npx web-push generate-vapid-keys` locally, paste both |
| `VAPID_SUBJECT` | `mailto:eqsentry@gmail.com` |
| `ADMIN_KEY` | a long random string — unlocks status-history admin on `status.html` |
| `SPARROW_TOKEN` | (optional) sparrowsms.com token for SMS |
| `TELEGRAM_BOT_TOKEN` | (optional) from @BotFather |
| `TELEGRAM_CHAT_ID` | (optional) your channel id, e.g. `@eqsentry` — add the bot as admin |
| `TELEGRAM_MIN_MAG` | (optional) default `4.5` |
| `STATUS_POLL_SECONDS` | `300` |

## 3. Point the site at it
In `assets/js/config.js` set:
```js
window.EQ_API = "https://YOUR-SERVICE.onrender.com";
```
Commit + push — Pages redeploys and every backend feature lights up
(the "coming online soon" states switch to live automatically).

## 4. Verify (2 minutes)
- `https://YOUR-SERVICE.onrender.com/api/health` → `{ ok: true ... }`
- alerts.html → enable browser alerts → Test notification arrives
- status.html → Admin → paste `ADMIN_KEY` → server history renders
- felt.html → submit a test report → appears on the map

## Notes
- Free Render sleeps after idle; first hit takes ~30 s. The site tolerates this.
- Keep `.env` out of git (already ignored). Rotate `ADMIN_KEY` if shared.
