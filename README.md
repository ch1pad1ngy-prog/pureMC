# PureMC

A Discord bot that bridges your Java Edition Minecraft server with Discord:

- 🟢 Join/leave activity feed
- 👥 `/online` — live player list via RCON (shows linked Discord accounts too)
- 🔗 `/link`, `/unlink`, `/whois` — Discord ↔ Minecraft account linking (verified via an in-game chat code, no plugin required)
- 🛡️ Moderation: `/kick`, `/ban`, `/unban`, `/mute`, `/unmute`, `/warn`, `/warnings`, `/clear`, `/channel lock|unlock|slowmode`
- 🎫 Ticket system with **multiple configurable categories** — each category can point to its own Discord channel category and staff role
- 🖥️ `/mccommand` — run any raw server command from Discord via RCON

---

## 1. Requirements

- Node.js 18+ on your VPS
- A Discord bot application (Developer Portal → New Application → Bot)
- Your Minecraft server with:
  - `enable-rcon=true`, `rcon.port`, `rcon.password` set in `server.properties`
  - Read access to `logs/latest.log` (used for join/leave/chat detection)

## 2. Discord bot setup

1. Create the application at https://discord.com/developers/applications, name it **PureMC**.
2. Bot tab → enable **Server Members Intent** and **Message Content Intent**.
3. Copy the bot **Token**, the **Application (Client) ID**, and your Discord server's **Guild ID** (enable Developer Mode in Discord to copy IDs).
4. OAuth2 → URL Generator → scopes: `bot`, `applications.commands`. Permissions: Administrator is simplest, or at minimum: Manage Channels, Manage Roles, Kick Members, Ban Members, Moderate Members, Manage Messages, Read/Send Messages, Embed Links.
5. Use the generated URL to invite the bot to your server.

## 3. Install

```bash
git clone <this folder> puremc && cd puremc
npm install
cp .env.example .env
```

Fill in `.env`:

```
DISCORD_TOKEN=...
CLIENT_ID=...
GUILD_ID=...
STAFF_ROLE_ID=...          # role that counts as "staff" for moderation + default ticket access
MC_ACTIVITY_CHANNEL_ID=... # join/leave feed
MOD_LOG_CHANNEL_ID=...     # kick/ban/mute/warn logs
TICKET_CATEGORY_ID=...     # fallback category if a ticket type doesn't set its own
TICKET_LOG_CHANNEL_ID=...  # transcript logs on close (optional)
RCON_HOST=127.0.0.1
RCON_PORT=25575
RCON_PASSWORD=...
MC_LOG_PATH=/absolute/path/to/server/logs/latest.log
```

Register the slash commands (run again any time you add/change a command file):

```bash
npm run deploy-commands
```

Start the bot:

```bash
npm start
```

## 4. Hosting on Railway (bot separate from the Minecraft server)

If the bot runs on Railway and your Minecraft server is a separate VPS, the bot
has no filesystem access to `logs/latest.log` — so join/leave detection and
`!verify` linking need a small forwarder script instead. RCON-based features
(`/online`, `/mccommand`) are unaffected since those just need network access.

1. **On Railway**: set all the variables from `.env.example` in the service's
   **Variables** tab (Railway doesn't read `.env` files — this is instead of that).
   Leave `MC_LOG_PATH` blank. Set `WEBHOOK_SECRET` to a random string
   (e.g. `openssl rand -hex 24`).
2. Go to **Settings → Networking → Generate Domain** so the bot has a public URL.
3. Make sure your Minecraft server's RCON port is reachable from the internet
   (Railway's outbound IPs are dynamic, so this generally means opening it
   broadly on your firewall — keep `RCON_PASSWORD` strong).
4. Copy the `forwarder/` folder onto your Minecraft VPS and follow
   `forwarder/README.md` to point it at your Railway domain. That script tails
   the log and forwards join/leave/chat lines to the bot's webhook endpoint.

If instead the bot runs on the same machine as the Minecraft server, skip all
of this and just set `MC_LOG_PATH` — no forwarder needed.

## 5. Running it permanently (systemd)

```ini
# /etc/systemd/system/puremc.service
[Unit]
Description=PureMC Discord Bot
After=network.target

[Service]
WorkingDirectory=/path/to/puremc
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
User=youruser
EnvironmentFile=/path/to/puremc/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now puremc
```

## 6. Setting up tickets with multiple categories

This is the part you asked about specifically — you're not stuck with one generic ticket type.

1. In Discord, create a category channel for each ticket type if you want them separated (e.g. "Player Reports", "Bug Reports", "Appeals", "General Support").
2. For each one, run:
   ```
   /ticket-types add name:"Bug Report" category:#bug-report-tickets emoji:🐛 description:"Found something broken?" staff_role:@Bug Squad
   ```
   `staff_role` is optional — if you skip it, that ticket type falls back to your global `STAFF_ROLE_ID`.
3. Repeat for as many categories as you want (`Player Report`, `Ban Appeal`, `Billing`, whatever fits your server).
4. Check your setup any time with `/ticket-types list`, remove one with `/ticket-types remove name:"..."`.
5. Post the panel where users can see it:
   ```
   /ticket-panel channel:#support
   ```
   This posts an embed with a dropdown listing every configured category. Picking one creates a private channel under that category's Discord category, visible only to the user + that category's staff role.
6. Inside a ticket, staff get **Claim** and **Close Ticket** buttons. Closing posts a transcript to `TICKET_LOG_CHANNEL_ID` (if set) and deletes the channel a few seconds later.

You can add or remove categories at any time — no restart needed, and any panel you post afterward will reflect the current list. If you edit categories after a panel is already posted, re-run `/ticket-panel` to refresh it.

## 7. How account linking works

No Minecraft plugin required — it works by watching the log file (directly, or via the forwarder if hosted separately):

1. User runs `/link username:Steve` in Discord.
2. Bot looks up the account via the Mojang API and gives them a one-time code.
3. User types `!verify ABC123` in **in-game chat**.
4. The bot's log watcher sees that chat line, confirms it matches the pending code, and saves the link.
5. Bot DMs the user to confirm.

`/whois` and `/online` both cross-reference this table so you can see, e.g., which Discord member is playing as which Minecraft username.

## 8. Notes / things to double check

- `bulkDelete` (used by `/clear`) can only remove messages younger than 14 days — Discord API limitation, not something the bot can work around.
- Log-based join/leave detection depends on your server's log format matching vanilla/Paper/Spigot's default `<name> joined/left the game` lines. Heavily modified logging plugins may need the regexes in `src/logWatcher.js` adjusted.
- RCON must be reachable from wherever the bot runs — if the bot is on the same VPS as the server, `127.0.0.1` is fine; otherwise open the RCON port on your firewall (and consider a strong password, since RCON has full admin access).
