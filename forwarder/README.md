# PureMC log forwarder

Run this **on your Minecraft server's machine** (the VPS/dedicated server itself),
not wherever the Discord bot is hosted. It watches `logs/latest.log` and forwards
join/leave/chat lines to the bot over HTTP, so the bot can react to in-game events
even when it's hosted somewhere completely separate (like Railway).

No `npm install` needed - it only uses Node.js builtins.

## Setup

1. Copy this whole `forwarder/` folder onto your Minecraft VPS (scp, git clone, whatever's easiest).
2. On the bot side (Railway):
   - Make sure the bot service has a public domain: **Settings → Networking → Generate Domain**.
   - Set `WEBHOOK_SECRET` in Railway's **Variables** tab to a random string (e.g. `openssl rand -hex 24`).
3. On the VPS, copy the config template:
   ```bash
   cp forwarder.env.example forwarder.env
   ```
4. Edit `forwarder.env`:
   ```
   WEBHOOK_URL=https://your-app-name.up.railway.app/events
   WEBHOOK_SECRET=<same random string as on Railway>
   MC_LOG_PATH=/absolute/path/to/your/server/logs/latest.log
   ```
5. Run it:
   ```bash
   node puremc-forwarder.js
   ```
   You should see `[forwarder] watching ... forwarding to ...`. Join the server and confirm you see join/leave messages show up in your Discord activity channel.

## Keeping it running (systemd)

```ini
# /etc/systemd/system/puremc-forwarder.service
[Unit]
Description=PureMC log forwarder
After=network.target

[Service]
WorkingDirectory=/path/to/forwarder
ExecStart=/usr/bin/node puremc-forwarder.js
Restart=on-failure
User=youruser

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now puremc-forwarder
```

## Troubleshooting

- **Nothing shows up in Discord**: check the forwarder's console output for `webhook responded with 401` (secret mismatch - make sure both sides match exactly) or connection errors (check the Railway domain is correct and public).
- **Only some events forward**: the regexes in `puremc-forwarder.js` expect vanilla/Paper/Spigot's default log format (`Name joined the game`, `Name left the game`, `<Name> message`). Heavily customized logging plugins may need those adjusted.
- **Log rotates on restart**: handled automatically - the forwarder detects when the file shrinks and resets its read position.
